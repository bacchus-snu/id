import createLDAPServer from './ldap/server'
import Model from './model/model'
import * as bunyan from 'bunyan'
import createAPIServer from './api/server'

const log = bunyan.createLogger({
  name: 'id',
  level: bunyan.INFO,
})
const model = new Model({
  user: 'id',
  host: '127.0.0.1',
  database: 'id',
  password: 'idpass',
  port: 3321,
})
const ldapServer = createLDAPServer({log}, model)
ldapServer.listen(389, '127.0.0.1', () => log.info('LDAP server listening'))
const apiServer = createAPIServer(log, model)
apiServer.listen(8089)
model.pgDo(() => model.users.create('bacchus', 'Bacchus', 'bacchuspassword'))
  .then(() => log.info('Query OK'))
  .catch(e => log.error(e, 'Query fail'))
