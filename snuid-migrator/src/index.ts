import * as mssql from 'mssql'
import * as pg from 'pg'
import * as fs from 'fs'
import * as phc from '@phc/format'

const wingsUsersGroupIdx = 1

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
const errors: Array<Error> = []
const duplicateUsername: Array<string> = []
const duplicateSnuids: Array<string> = []
const invalidSnuids: Array<string> = []

const validate = (snuid: string) => {
  for (const regex of [
      /^\d\d\d\d\d-\d\d\d$/,    // 5-3
      /^\d\d\d\d-\d\d\d\d$/,    // 4-4
      /^\d\d\d\d-\d\d\d\d\d$/,  // 4-5
      ]) {
    if (regex.test(snuid)) {
      return true
    }
  }
  return false
}

const mergeAccount = async (merged: string, merger: string, pgClient: pg.PoolClient) => {
  const mergedIdx = (await pgClient.query('SELECT idx FROM users WHERE username = $1', [merged])).rows[0].idx
  const mergerIdx = (await pgClient.query('SELECT idx FROM users WHERE username = $1', [merger])).rows[0].idx
  
  for (const address of (await pgClient.query('SELECT * FROM email_addresses WHERE owner_idx = $1', [mergedIdx])).rows) {
    await pgClient.query('INSERT INTO email_addresses (owner_idx, address_local, address_domain) VALUES ($1, $2, $3)', [mergerIdx, address.address_local, address.address_domain])
  }

  await pgClient.query('INSERT INTO reserved_usernames (reserved_username, owner_idx) VALUES ($1, $2)', [merged, mergerIdx])
  await pgClient.query('DELETE FROM users WHERE username = $1', [merged])
}

const migrateUser = async (user: WingsUser, pgClient: pg.PoolClient) => {
  if (user.account === null) {
    return
  }

  const result = (await pgClient.query('SELECT idx FROM users WHERE username = $1', [user.account]))
  if (result.rows.length === 0) {
    console.log(` skip: ${user.account} does not exist in id.snucse.org`)
    return
  }
  const userIdx = result.rows[0].idx
  try {
    await pgClient.query('INSERT INTO user_memberships (user_idx, group_idx) VALUES ($1, $2)', [userIdx, wingsUsersGroupIdx])
  } catch (e) {
    errors.push(e)
    duplicateUsername.push(user.account)
    return
  }
  console.log(` join: ${user.account} added to wingsUser group`)
  for (const s of new Set([user.bs_number, user.ms_number, user.phd_number])) {
    if (s === null) {
      continue
    }
    const snuid = s.trim()
    if (!validate(snuid)) {
      invalidSnuids.push(snuid)
      continue
    }
    try {
      await pgClient.query('INSERT INTO snuids (snuid, owner_idx) VALUES ($1, $2)', [snuid, userIdx])
      console.log(`snuid: ${user.account} ${snuid}`)
    } catch (e) {
      errors.push(e)
      duplicateSnuids.push(snuid)
    }
  }
}

const migrateAll = async () => {
  
  const mssqlPool = new mssql.ConnectionPool(config.mssql)
  await mssqlPool.connect()
  const mssqlSelectUser = new mssql.PreparedStatement(mssqlPool)
  await mssqlSelectUser.prepare('SELECT * FROM [user]')
  const pgClient = await (new pg.Pool(config.postgresql)).connect()
  try {
    await mergeAccount('bryansjkim0', 'bryansjkim', pgClient)
    await mergeAccount('myxymg', 'ohsori', pgClient)
    await mergeAccount('entermin', 'min0', pgClient)
    await mergeAccount('nopanderer', 'hjlee', pgClient)
    await mergeAccount('yblim', 'trop100', pgClient)
    await mergeAccount('lrocky1229', 'rockylim', pgClient)
    await mergeAccount('jigajut', 'kidcoder', pgClient)
    await mergeAccount('khan000', 'raoakhan', pgClient)
    await mergeAccount('cefm2001', 'cefm', pgClient)
    for (const user of (await mssqlSelectUser.execute({})).recordset) {
      await migrateUser(user, pgClient)
    }
  } finally {
    await mssqlSelectUser.unprepare()
    await mssqlPool.close()
    await pgClient.release()
  }

  duplicateUsername.forEach(e => console.error(`duplicate: ${e}`))
  duplicateSnuids.forEach(e => console.error(`duplicate: ${e}`))
  invalidSnuids.forEach(e => console.error(`invalid: ${e}`))

  // query to invstigate duplicates
  let query = 'select * from [user] where 1 = 2'
  for (const snuid of duplicateSnuids) {
    query += ` or [bs_number] = '${snuid}' or [ms_number] = '${snuid}' or [phd_number] = '${snuid}'`
  }
  console.log(query + ';')
}

migrateAll().then(_ => console.log('Migration done')).catch(e => console.log(e))
