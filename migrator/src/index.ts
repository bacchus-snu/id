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

const migrateUser = async (user: WingsUser, pgClient: pg.PoolClient) => {
  console.log(user.account)
}

const migrateAll = async () => {
  const mssqlPool = new mssql.ConnectionPool(config.mssql)
  await mssqlPool.connect()
  const mssqlPS = new mssql.PreparedStatement(mssqlPool)
  await mssqlPS.prepare('SELECT * FROM [user]')
  const pgClient = await (new pg.Pool(config.postgresql)).connect()
  try {
    for (const user of (await mssqlPS.execute({})).recordset) {
      await migrateUser(user, pgClient)
    }
  } finally {
    await mssqlPS.unprepare()
    await mssqlPool.close()
  }
}

migrateAll().then(_ => console.log('Done')).catch(e => console.log(e))
