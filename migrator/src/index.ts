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

const migrateUser = async (user: WingsUser, pgClient: pg.PoolClient, selectEmail: mssql.PreparedStatement) => {
  if (user.account === null) {
    return
  }
  console.log(user.account)
  const addresses: Array<string> = []
  for (const addrRecord of (await selectEmail.execute({userUid: user.uid})).recordset) {
    const address = addrRecord.email
    if (!addresses.includes(address)) {
      addresses.push(address)
    }
  }

  const addressIdxs: Array<number> = []
  for (const address of addresses) {
    const local = address.split('@')[0]
    const domain = address.split('@')[1]
    if (!local || !domain) {
      continue
    }
    const result = await pgClient.query('INSERT INTO email_addresses (address_local, address_domain) VALUES ($1, $2) RETURNING idx', [local, domain])
    addressIdxs.push(result.rows[0].idx)
  }

  if (addressIdxs.length === 0) {
    console.error(`${user.account} has no email addresses`)
    return
  }

  const userInsertResult = await pgClient.query('INSERT INTO users (username, name, shell, preferred_language, primary_email_address_idx) ' +
    'VALUES ($1, $2, \'/bin/bash\', \'ko\', $3) RETURNING idx', [user.account, user.name, addressIdxs[0]])
  const userIdx = userInsertResult.rows[0].idx

  for (const emailAddressIdx of addressIdxs) {
    await pgClient.query('UPDATE email_addresses SET owner_idx=$1 where idx=$2', [userIdx, emailAddressIdx])
  }
}

const migrateAll = async () => {
  const mssqlPool = new mssql.ConnectionPool(config.mssql)
  await mssqlPool.connect()
  const mssqlSelectUser = new mssql.PreparedStatement(mssqlPool)
  await mssqlSelectUser.prepare('SELECT * FROM [user]')
  const mssqlSelectEmail = new mssql.PreparedStatement(mssqlPool)
  mssqlSelectEmail.input('userUid', mssql.BigInt)
  await mssqlSelectEmail.prepare('SELECT * FROM user_email WHERE user_uid=@userUid')
  const pgClient = await (new pg.Pool(config.postgresql)).connect()
  try {
    for (const user of (await mssqlSelectUser.execute({})).recordset) {
      await migrateUser(user, pgClient, mssqlSelectEmail)
    }
  } finally {
    await mssqlSelectUser.unprepare()
    await mssqlSelectEmail.unprepare()
    await mssqlPool.close()
    await pgClient.release()
  }
}

migrateAll().then(_ => console.log('Done')).catch(e => console.log(e))
