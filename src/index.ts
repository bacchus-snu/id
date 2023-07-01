import * as fs from 'fs'
import * as bunyan from 'bunyan'
import createAPIServer from './api/server'
import Config from './config'

const config: Config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

async function run() {
  const apiServer = await createAPIServer(config, log)
  apiServer.listen(config.api.listenPort, config.api.listenHost)
}

run()
