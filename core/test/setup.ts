import * as fs from 'fs'
import Config from '../src/config'
import Model from '../src/model/model'
import createAPIServer from '../src/api/server'
import * as bunyan from 'bunyan'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

const app = createAPIServer(log, model, config).listen()

export default app
