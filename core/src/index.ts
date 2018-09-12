import * as fs from 'fs'
import createLDAPServer from './ldap/server'
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

const ldapOptions = {
  log,
  certificate: fs.readFileSync(config.ldap.certificate),
  key: fs.readFileSync(config.ldap.key),
}

const ldapServer = createLDAPServer(ldapOptions, model, config)
ldapServer.listen(config.ldap.listenPort, config.ldap.listenHost,
  () => log.info(`LDAP server listening on ${config.ldap.listenHost}:${config.ldap.listenPort}`))

const apiServer = createAPIServer(log, model, config)
apiServer.listen(config.api.listenPort, config.api.listenHost)
