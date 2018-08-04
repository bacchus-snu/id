import createLDAPServer from './ldap/server'
import Model from './model/model'
import * as bunyan from 'bunyan'
import createAPIServer from './api/server'
import config from './config'

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})
const model = new Model({
  user: config.postgresql.user,
  host: config.postgresql.host,
  database: config.postgresql.database,
  password: config.postgresql.password,
  port: config.postgresql.port,
})
const ldapServer = createLDAPServer({log}, model)
ldapServer.listen(config.ldap.listenPort, config.ldap.listenHost, () => log.info('LDAP server listening'))
const apiServer = createAPIServer(log, model)
apiServer.listen(config.api.listenPort, config.api.listenHost)
model.pgDo(() => model.users.create('bacchus', 'Bacchus', 'bacchuspassword'))
  .then(() => log.info('Query OK'))
  .catch(e => log.error(e, 'Query fail'))
