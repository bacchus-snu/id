import * as ldap from 'ldapjs'
import { PosixAccount, posixAccountObjectClass } from './types'
import { OrganizationalUnit, organizationalUnitObjectClass } from './types'
import { RootDSE } from './types'
import { Subschema, subschemaObjectClass } from './types'

const server = ldap.createServer()
const subschema: ldap.SearchEntry<Subschema> = {
  dn: 'cn=subschema,dc=snucse,dc=org',
  attributes: {
    objectClass: subschemaObjectClass,
    cn: 'subschema',
    subtreeSpecification: '{ base "ou=cseusers,dc=snucse,dc=org" }',
  },
}
const users: Array<ldap.SearchEntry<PosixAccount>> = [
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

const cseusers: ldap.SearchEntry<OrganizationalUnit> = {
  dn: 'ou=cseusers,dc=snucse,dc=org',
  attributes: {
    objectClass: organizationalUnitObjectClass,
    ou: 'cseusers',
    description: 'SNUCSE Users',
  },
}

const rootDSE: ldap.SearchEntry<RootDSE> = {
  dn: '',
  attributes: {
    namingContexts: 'ou=cseusers,dc=snucse,dc=org',
    subschemaSubentry: 'cn=subschema,dc=snucse,dc=org',
    supportedLDAPVersion: 3,
  },
}

server.listen(389, '127.0.0.1', () => console.log('Connected'))
server.bind('ou=cseusers,dc=snucse,dc=org', (req, res, next) => {
  console.log(req)
  if (req.dn.toString() === 'cn=bacchus, ou=cseusers, dc=snucse, dc=org' && req.credentials === 'bpassword') {
    res.end()
    return next()
  }
  if (req.dn.toString() === 'cn=master, ou=cseusers, dc=snucse, dc=org' && req.credentials === 'mpassword') {
    res.end()
    return next()
  }
  return next(new ldap.InvalidCredentialsError())
})
server.search('', (req, res, next) => {
  if (req.dn.toString() === '' && req.scope === 'base') {
    res.send(rootDSE)
  }
  res.end()
  return next()
})
server.search('cn=subschema, dc=snucse, dc=org', (req, res, next) => {
  if (req.dn.toString() === 'cn=subschema, dc=snucse, dc=org' && req.scope === 'base') {
    res.send(subschema)
  }
  res.end()
  return next()
})
server.search('ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
  //
  // TODO: check req against the type definition
  // console.log(req)
  //
  if (req.dn.toString() === 'ou=cseusers, dc=snucse, dc=org') {
    if (req.scope === 'base') {
      res.send(cseusers)
    } else {
      // Same results for 'one' and 'sub'
      console.log(req.filter)
      if (req.filter.matches(users[0])) {
        res.send(users[0])
      }
      if (req.filter.matches(users[1])) {
        res.send(users[1])
      }
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
