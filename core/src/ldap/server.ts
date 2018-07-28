import * as ldap from 'ldapjs'
import { PosixAccount, posixAccountObjectClass } from './types'
import { OrganizationalUnit, organizationalUnitObjectClass } from './types'
import { RootDSE } from './types'
import { Subschema, subschemaObjectClass } from './types'
import * as bunyan from 'bunyan'

const createServer = () => {
  const server = ldap.createServer()
  if (server.log.level() <= bunyan.DEBUG) {
    throw new Error(`The log level for LDAP server (${server.log.level()}) is too fine. Passwords can be logged.`)
  }
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

  // Non-anonymous bind.
  server.bind('ou=cseusers,dc=snucse,dc=org', (req, res, next) => {
    if (req.dn.rdns.length === 0 || req.dn.rdns[0].attrs['cn'] == null) {
      return next(new ldap.InvalidCredentialsError())
    }
    const cn = req.dn.rdns[0].attrs['cn'].value
    if (cn === 'bacchus' && req.credentials === 'bpassword') {
      res.end()
      return next()
    }
    if (cn === 'master' && req.credentials === 'bmaster') {
      res.end()
      return next()
    }
    return next(new ldap.InvalidCredentialsError())
  })

  // Root DSE.
  server.search('', (req, res, next) => {
    if (req.dn.rdns.length === 0 && req.scope === 'base') {
      res.send(rootDSE)
    }
    res.end()
    return next()
  })

  // Subschema subentry.
  server.search('cn=subschema, dc=snucse, dc=org', (req, res, next) => {
    if (req.dn.equals(ldap.parseDN('cn=subschema, dc=snucse, dc=org')) && req.scope === 'base') {
      res.send(subschema)
    }
    res.end()
    return next()
  })

  const cseusersDN = ldap.parseDN('ou=cseusers, dc=snucse, dc=org')

  // Account lookups.
  server.search('ou=cseusers, dc=snucse, dc=org', (req, res, next) => {
    const parentDN = req.dn.parent()
    if (req.dn.equals(cseusersDN)) {
      if (req.scope === 'base') {
        res.send(cseusers)
      } else {
        // Same results for 'one' and 'sub'
        for (const user of users) {
          if (req.filter.matches(user.attributes)) {
            res.send(user)
          }
        }
      }
    } else if (parentDN != null && req.scope === 'base' && req.dn.rdns[0].attrs['cn'] != null) {
      if (parentDN.equals(cseusersDN)) {
        const wantedUid = req.dn.rdns[0].attrs['cn'].value
        for (const user of users) {
          if (user.attributes.uid === wantedUid) {
            res.send(user)
          }
        }
      }
    }
    res.end()
    return next()
  })

  return server
}

export default createServer
