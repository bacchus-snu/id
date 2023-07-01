import test from 'ava'
import * as fs from 'fs'
import Koa from 'koa'
import createAPIServer from '../src/api/server'
import Logger, * as bunyan from 'bunyan'
import Model from '../src/model/model'

export let config: any
export let log: Logger
export let model: Model
export let app: Koa
test.before(async () => {
  config = JSON.parse(await fs.promises.readFile('config.test.json', {encoding: 'utf-8'}))
  log = bunyan.createLogger({
    name: config.instanceName,
    level: config.logLevel,
  })
  model = new Model(config, log)
  app = await createAPIServer(config, log, model)
  app.listen()
})
