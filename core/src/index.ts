import * as fs from 'fs'
import Model from './model/model'
import * as bunyan from 'bunyan'
import createAPIServer from './api/server'
import Config from './config'

const config: Config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

const apiServer = createAPIServer(log, model, config)
apiServer.listen(config.api.listenPort, config.api.listenHost)
