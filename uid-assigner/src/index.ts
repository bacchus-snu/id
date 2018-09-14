import * as fs from 'fs'
import Model from './model/model'
import * as bunyan from 'bunyan'
import Config from './config'

const config: Config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

const doAssignUid = async () => {
  model.pgDo(async c => {
    const usersWithNullUid = (await c.query('SELECT idx FROM users WHERE uid IS NULL')).rows
    for (const row of usersWithNullUid) {
      const idx = row.idx
      const uid = await model.users.generateUid(c)
      await c.query('UPDATE users SET uid = $1 WHERE idx = $2', [uid, idx])
      log.info(`${idx} => ${uid}`)
    }
  })
}

doAssignUid().then(_ => log.info('OK')).catch(e => log.error(e))
