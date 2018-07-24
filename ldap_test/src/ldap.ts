import * as ldap from 'ldapjs'
import { PosixAccount, posixAccountObjectClass } from './types'

const server = ldap.createServer()
const users: Array<ldap.Entity<PosixAccount>> = [
  {
    dn: 'cn=bacchus,ou=cseusers,dc=snucse,dc=org',
    attributes: {
      uid: 'bacchus',
      cn: 'bacchus',
      gecos: 'AdminDescription',
      homeDirectory: '/home/bacchus',
      loginShell: '/bin/bash',
      objectClass: posixAccountObjectClass,
      uidNumber: 10000,
      gidNumber: 10004,
    }
  }, {
    dn: 'cn=master,ou=cseusers,dc=snucse,dc=org',
    attributes: {
      cn: 'master',
      uid: 'master',
      gecos: 'hello',
      homeDirectory: '/home/master',
      loginShell: '/bin/bash',
      objectClass: posixAccountObjectClass,
      uidNumber: 10001,
      gidNumber: 10005,
    }
  }
]

server.listen(389, '127.0.0.1', () => console.log('Connected'))
server.bind('ou=cseusers,dc=snucse,dc=org', (req, res, next) => {
  console.log(req.dn.toString())
  if (req.dn.toString() !== 'cn=bacchus, ou=cseusers, dc=snucse, dc=org' || req.credentials !== 'password') {
    return next(new ldap.InvalidCredentialsError())
  }
  res.end()
  return next()
})
server.search('ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'ou=cseusers, dc=snucse, dc=org') {
    res.send(users[0])
    res.send(users[1])
  }
  res.end()
  return next()
})

server.search('cn=bacchus, ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'cn=bacchus, ou=cseusers, dc=snucse, dc=org') {
    res.send(users[0])
  }
  res.end()
  return next()
})

server.search('cn=master, ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'cn=master, ou=cseusers, dc=snucse, dc=org') {
    res.send(users[1])
  }
  res.end()
  return next()
})

export default server
