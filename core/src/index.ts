import createLDAPServer from './ldap/server'
import Model from './model/model'
import * as bunyan from 'bunyan'

const log = bunyan.createLogger({
  name: 'id',
  level: bunyan.INFO,
})
const server = createLDAPServer()
server.listen(389, '127.0.0.1', () => log.info('LDAP server listening'))
const model = new Model({
  user: 'id',
  host: '127.0.0.1',
  database: 'id',
  password: 'idpass',
  port: 3321,
})
const result: Promise<void> = model.pgDo(() => model.users.create('bacchus', 'Bacchus', 'bacchuspassword'))
result.then(() => log.info('Query OK'))
result.catch(e => log.error(e, 'Query fail'))
