import * as mssql from 'mssql'
import * as pg from 'pg'
import * as fs from 'fs'

const config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))

const test = async () => {
  const pool = new mssql.ConnectionPool(config.mssql)
  const ps = new mssql.PreparedStatement(pool)
  await ps.prepare('SELECT TOP 10 * FROM [users]')
  try {
    const result = await ps.execute({})
    console.log(result)
  } finally {
    await ps.unprepare()
  }
}
