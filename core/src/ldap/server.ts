import * as ldap from 'ldapjs'
import { PosixGroup } from './types'
import { OrganizationalUnit, organizationalUnitObjectClass, posixGroupObjectClass } from './types'
import { RootDSE } from './types'
import { Subschema, subschemaObjectClass } from './types'
import * as bunyan from 'bunyan'
import Model from '../model/model'
import { User } from '../model/users'
import Config from '../config'
import { NoSuchEntryError, AuthenticationError } from '../model/errors'

const createServer = (options: ldap.ServerOptions, model: Model, config: Config) => {
  const server = ldap.createServer(options)
  if (server.log.level() <= bunyan.DEBUG) {
    throw new Error(`The log level for LDAP server (${server.log.level()}) is too fine. Passwords can be logged.`)
  }

  const usersDN = `ou=${config.ldap.usersOU},${config.ldap.baseDN}`
  const groupsDN = `ou=${config.ldap.groupsOU},${config.ldap.baseDN}`
  const parsedUsersDN = ldap.parseDN(usersDN)
  const parsedGroupsDN = ldap.parseDN(groupsDN)

  const subschema: ldap.SearchEntry<Subschema> = {
    dn: config.ldap.subschemaDN,
    attributes: {
      objectClass: subschemaObjectClass,
      cn: 'subschema',
      subtreeSpecification: `{ base "${config.ldap.baseDN}" }`,
    },
  }

  const usersOU: ldap.SearchEntry<OrganizationalUnit> = {
    dn: usersDN,
    attributes: {
      objectClass: organizationalUnitObjectClass,
      ou: config.ldap.usersOU,
    },
  }

  const groupsOU: ldap.SearchEntry<OrganizationalUnit> = {
    dn: groupsDN,
    attributes: {
      objectClass: organizationalUnitObjectClass,
      ou: config.ldap.groupsOU,
    },
  }

  const rootDSE: ldap.SearchEntry<RootDSE> = {
    dn: '',
    attributes: {
      namingContexts: [config.ldap.baseDN, usersDN, groupsDN],
      subschemaSubentry: config.ldap.subschemaDN,
      supportedLDAPVersion: 3,
    },
  }

  const usersGroup: ldap.SearchEntry<PosixGroup> = {
    dn: `cn=${config.posix.userGroupName},${groupsDN}`,
    attributes: {
      objectClass: posixGroupObjectClass,
      cn: config.posix.userGroupName,
      gidNumber: config.posix.userGroupGid,
    },
  }

  // Non-anonymous bind.
  server.bind(usersDN, async (req, res, next) => {
    if (req.dn.rdns.length === 0 || req.dn.rdns[0].attrs.cn == null) {
      return next(new ldap.InvalidCredentialsError())
    }
    const cn = req.dn.rdns[0].attrs.cn.value
    try {
      const userIdx = await model.pgDo(c => model.users.authenticate(c, cn, req.credentials))
      if (await model.pgDo(c => model.users.assignUid(c, userIdx, config.posix.minUid))) {
        // assigned uid
        // user must log in again
        return next(new ldap.InvalidCredentialsError())
      } else {
        res.end()
        return next()
      }
    } catch (e) {
      if (e instanceof AuthenticationError) {
        return next(new ldap.InvalidCredentialsError())
      }
      server.log.error(e)
      return next(new ldap.OtherError())
    }
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
  const subschemaDN = ldap.parseDN(config.ldap.subschemaDN)
  server.search(config.ldap.subschemaDN, (req, res, next) => {
    if (req.dn.equals(subschemaDN) && req.scope === 'base') {
      res.send(subschema)
    }
    res.end()
    return next()
  })

  // Account lookups.
  server.search(usersDN, async (req, res, next) => {
    const parentDN = req.dn.parent()
    if (req.dn.equals(parsedUsersDN)) {
      if (req.scope === 'base') {
        res.send(usersOU)
      } else {
        // Same results for 'one' and 'sub'
        // TODO: do not assign uid if the user is not capable to sign in to the LDAP host.
        (await model.pgDo(c => model.users.getAllAsPosixAccounts(c))).forEach(account => {
          if (req.filter.matches(account.attributes)) {
            res.send(account)
          }
        })
      }
    } else if (parentDN != null && req.scope === 'base' && req.dn.rdns[0].attrs.cn != null) {
      if (parentDN.equals(parsedUsersDN)) {
        const wantedUid = req.dn.rdns[0].attrs.cn.value
        try {
          const user = await model.pgDo(c => model.users.getByUsernameAsPosixAccount(c, wantedUid))
          res.send(user)
        } catch (e) {
          if (!(e instanceof NoSuchEntryError)) {
            server.log.error(e)
            return next(new ldap.OtherError())
          }
        }
      }
    }
    res.end()
    return next()
  })

  // groups lookup
  server.search(groupsDN, async (req, res, next) => {
    const parentDN = req.dn.parent()
    if (req.dn.equals(parsedGroupsDN)) {
      if (req.scope === 'base') {
        res.send(groupsOU)
      } else {
        // Same results for 'one' and 'sub'
        res.send(usersGroup)
      }
    } else if (parentDN != null && parentDN.equals(parsedGroupsDN) && req.scope === 'base') {
      if (req.dn.rdns[0].attrs.cn.value === config.posix.userGroupName) {
        res.send(usersGroup)
      }
    }
    res.end()
    return next()
  })

  return server
}

export default createServer
