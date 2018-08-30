import * as mssql from 'mssql'
import * as pg from 'pg'
import * as fs from 'fs'

interface WingsUser {
  uid: number
  account: string | null // username
  name: string // realname
  password: Buffer | null
  bs_number: string | null
  ms_number: string | null
  phd_number: string | null
  is_disabled: boolean | null
}

const config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))

const migratePassword = (password: Buffer | null) => {
  if (password === null) {
    return null
  }
  const salt = password.slice(2, 6).toString('hex')
  if (password.length === 70) {
    const hash = password.slice(6).toString('hex')
    return `$mssql-sha512$${salt}$${hash}`
  } else if ([26, 46].includes(password.length)) {
    const hash = password.slice(6, 26).toString('hex')
    return `$mssql-sha1$${salt}$${hash}`
  } else if (password.length === 16) {
    // unsupported
    return null
  } else {
    throw new Error('Unknown password length')
  }
}

const migrateUser = async (user: WingsUser, duplicates: Array<string>, usernameToUid: {[username: string]: number},
    pgClient: pg.PoolClient, selectEmail: mssql.PreparedStatement) => {
  if (user.account === null) {
    return
  }
  const addresses: Array<string> = []
  for (const addrRecord of (await selectEmail.execute({userUid: user.uid})).recordset) {
    const address = addrRecord.email
    if (!duplicates.includes(address)) {
      addresses.push(address)
    }
  }

  const addressIdxs: Array<number> = []
  for (const address of addresses) {
    const local = address.split('@')[0]
    const domain = address.split('@')[1]
    if (!local || !domain) {
      console.error(`bad_email (ignored): ${address}`)
      continue
    }
    const result = await pgClient.query('INSERT INTO email_addresses (address_local, address_domain) VALUES ($1, $2) RETURNING idx', [local, domain])
    addressIdxs.push(result.rows[0].idx)
  }

  const posixUid = usernameToUid[user.account] === undefined ? null : usernameToUid[user.account]
  let userIdx: number
  try {
    const userInsertResult = await pgClient.query('INSERT INTO users (username, name, password_digest, uid, shell, preferred_language) ' +
      'VALUES ($1, $2, $3, $4, \'/bin/bash\', \'ko\') RETURNING idx', [user.account, user.name, migratePassword(user.password), posixUid])
    userIdx = userInsertResult.rows[0].idx
  } catch (e) {
    const userSelectResult = await pgClient.query('SELECT idx FROM users WHERE username=$1', [user.account])
    userIdx = userSelectResult.rows[0].idx
    console.log(`dup_username (merged): ${user.account}`)
  }

  for (const emailAddressIdx of addressIdxs) {
    await pgClient.query('UPDATE email_addresses SET owner_idx=$1 where idx=$2', [userIdx, emailAddressIdx])
  }
}

const findDup = (allEmails: Array<any>) => {
  const found: Array<string> = []
  const dup: Array<string> = []
  for (const row of allEmails) {
    const email: string = row.email
    if (found.includes(email)) {
      console.error(`dup_email (ignored): ${email}`)
      dup.push(email)
    } else {
      found.push(email)
    }
  }
  return dup
}

const migrateAll = async () => {
  const usernameToUid: {[username: string]: number} = {}
  for (const line of fs.readFileSync('./passwd', {encoding: 'utf-8'}).split('\n')) {
    const fields = line.split(':')
    if (fields.length === 0) {
      continue
    }
    usernameToUid[fields[0]] = Number.parseInt(fields[2])
  }
  
  const mssqlPool = new mssql.ConnectionPool(config.mssql)
  await mssqlPool.connect()
  const mssqlSelectUser = new mssql.PreparedStatement(mssqlPool)
  await mssqlSelectUser.prepare('SELECT * FROM [user]')
  const mssqlSelectEmail = new mssql.PreparedStatement(mssqlPool)
  mssqlSelectEmail.input('userUid', mssql.BigInt)
  await mssqlSelectEmail.prepare('SELECT * FROM user_email WHERE user_uid=@userUid')
  const mssqlSelectAllEmail = new mssql.PreparedStatement(mssqlPool)
  await mssqlSelectAllEmail.prepare('SELECT * FROM user_email')
  const pgClient = await (new pg.Pool(config.postgresql)).connect()
  try {
    const duplicates = findDup((await mssqlSelectAllEmail.execute({})).recordset)
    for (const user of (await mssqlSelectUser.execute({})).recordset) {
      await migrateUser(user, duplicates, usernameToUid, pgClient, mssqlSelectEmail)
    }
  } finally {
    await mssqlSelectUser.unprepare()
    await mssqlSelectEmail.unprepare()
    await mssqlSelectAllEmail.unprepare()
    await mssqlPool.close()
    await pgClient.release()
  }
}

migrateAll().then(_ => console.log(`Migration done`)).catch(e => console.log(e))
