import * as fs from 'fs'
import Config from '../src/config'
import Model from '../src/model/model'
import createAPIServer from '../src/api/server'
import * as bunyan from 'bunyan'

export const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

export const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

export const model = new Model(config, log)

export const app = createAPIServer(log, model, config).listen()
