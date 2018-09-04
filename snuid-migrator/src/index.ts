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
const mergedEmails: Array<number> = []
const ignoredUsername: Array<string> = []

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
  
  for (const address of (await pgClient.query('SELECT idx FROM email_addresses WHERE owner_idx = $1', [mergedIdx])).rows) {
    await pgClient.query('UPDATE email_addresses SET owner_idx = $1 WHERE idx = $2', [mergerIdx, address.idx])
    mergedEmails.push(address.idx)
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
    ignoredUsername.push(user.account)
    return
  }
  const userIdx = result.rows[0].idx
  try {
    await pgClient.query('INSERT INTO user_memberships (user_idx, group_idx) VALUES ($1, $2)', [userIdx, wingsUsersGroupIdx])
    console.log(` join: ${user.account} added to wingsUser group`)
  } catch (e) {
    errors.push(e)
    duplicateUsername.push(user.account)
    return
  }
  for (const s of new Set([user.bs_number, user.ms_number, user.phd_number])) {
    if (s === null) {
      continue
    }
    const snuid = s.trim()
    if (snuid === '99419-521' || snuid === '2003-81064') {
      continue
    }
    let suffix = ''
    if (user.ms_number !== null && snuid === user.ms_number.trim() && ['89419-011', '92419-018', '93419-031', '96419-001', '98419-016'].includes(snuid)) {
      suffix = '-masters-course'
    } else if (user.phd_number !== null && snuid === user.phd_number.trim() && snuid === '98419-021') {
      suffix = '-doctoral-course'
    }
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

  invalidSnuids.forEach(e => console.error(`invalid: ${e}`))
  duplicateUsername.forEach(e => console.error(`duplicate username: ${e}`))
  duplicateSnuids.forEach(e => console.error(`duplicate id: ${e}`))

  // query to invstigate duplicates
  /*
  let query = 'select * from [user] where 1 = 2'
  for (const snuid of duplicateSnuids) {
    query += ` or [bs_number] = '${snuid}' or [ms_number] = '${snuid}' or [phd_number] = '${snuid}'`
  }
  console.log(query + ';')
  */

  mergedEmails.forEach(e => console.log(`merged email: ${e}`))
  ignoredUsername.forEach(e => console.log(`not found on id: ${e}`))
}

migrateAll().then(_ => console.log('Migration done')).catch(e => console.log(e))
