import * as ldap from 'ldapjs'
import { PosixAccount, posixAccountObjectClass } from './types'
import { OrganizationalUnit, organizationalUnitObjectClass } from './types'
import { RootDSE } from './types'

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
    },
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
    },
  },
]

const cseusers: ldap.Entity<OrganizationalUnit> = {
  dn: 'ou=cseusers,dc=snucse,dc=org',
  attributes: {
    objectClass: organizationalUnitObjectClass,
    ou: 'cseusers',
    description: 'SNUCSE Users',
  },
}

const rootDSE: ldap.Entity<RootDSE> = {
  dn: '',
  attributes: {
    namingContexts: 'ou=cseusers,dc=snucse,dc=org',
    supportedLDAPVersion: 3,
  },
}

server.listen(389, '127.0.0.1', () => console.log('Connected'))
server.bind('ou=cseusers,dc=snucse,dc=org', (req, res, next) => {
  console.log(req.dn.toString())
  if (req.dn.toString() !== 'cn=bacchus, ou=cseusers, dc=snucse, dc=org' || req.credentials !== 'password') {
    return next(new ldap.InvalidCredentialsError())
  }
  res.end()
  return next()
})
server.search('', (req, res, next) => {
  if (req.dn.toString() === '' && req.scope === 'base') {
    res.send(rootDSE)
  }
  res.end()
  return next()
})
server.search('ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'ou=cseusers, dc=snucse, dc=org') {
    if (req.scope === 'base') {
      res.send(cseusers)
    } else {
      res.send(users[1])
      res.send(users[0])
    }
  }
  res.end()
  return next()
})

server.search('cn=bacchus, ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'cn=bacchus, ou=cseusers, dc=snucse, dc=org' && req.scope === 'base') {
    res.send(users[0])
  }
  res.end()
  return next()
})

server.search('cn=master, ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'cn=master, ou=cseusers, dc=snucse, dc=org' && req.scope === 'base') {
    res.send(users[1])
  }
  res.end()
  return next()
})

export default server
