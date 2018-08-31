import * as ldap from 'ldapjs'
import { PosixAccount, posixAccountObjectClass } from './types'
import { OrganizationalUnit, organizationalUnitObjectClass } from './types'
import { RootDSE } from './types'
import { Subschema, subschemaObjectClass } from './types'
import * as bunyan from 'bunyan'
import Model from '../model/model'
import { User } from '../model/users'
import Config from '../config'
import { NoSuchEntryError } from '../model/errors'

const createServer = (options: ldap.ServerOptions, model: Model, config: Config) => {
  const server = ldap.createServer(options)
  if (server.log.level() <= bunyan.DEBUG) {
    throw new Error(`The log level for LDAP server (${server.log.level()}) is too fine. Passwords can be logged.`)
  }

  const usersDN = `ou=${config.ldap.usersOU},${config.ldap.baseDN}`
  const groupsDN = `ou=${config.ldap.groupsOU},${config.ldap.baseDN}`
  const parsedUsersDN = ldap.parseDN(usersDN)

  const userToPosixAccount: (user: User) => ldap.SearchEntry<PosixAccount> = user => {
    if (user.username === null || user.shell === null) {
      throw new Error('Cannot convert to posixAccount')
    }
    return {
      dn: `cn=${user.username},${usersDN}`,
      attributes: {
        uid: user.username,
        cn: user.username,
        gecos: user.name,
        homeDirectory: `${config.posix.homeDirectoryPrefix}/${user.username}`,
        loginShell: user.shell,
        objectClass: posixAccountObjectClass,
        uidNumber: user.uid === null ? config.posix.nullUid : user.uid,
        gidNumber: config.posix.userGroupGid,
      },
    }
  }
  const usersToPosixAccounts: (users: Array<User>) => Array<ldap.SearchEntry<PosixAccount>> = users => {
    const posixAccounts: Array<ldap.SearchEntry<PosixAccount>> = []
    users.forEach(user => {
      try {
        posixAccounts.push(userToPosixAccount(user))
      } catch (e) {
        // do nothing
      }
    })
    return posixAccounts
  }
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

  const rootDSE: ldap.SearchEntry<RootDSE> = {
    dn: '',
    attributes: {
      namingContexts: [config.ldap.baseDN, usersDN, groupsDN],
      subschemaSubentry: config.ldap.subschemaDN,
      supportedLDAPVersion: 3,
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
        // user must log in agagin
        return next(new ldap.InvalidCredentialsError())
      } else {
        res.end()
        return next()
      }
    } catch (e) {
      return next(new ldap.InvalidCredentialsError())
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
        usersToPosixAccounts(await model.pgDo(c => model.users.getAll(c))).forEach(account => {
          if (req.filter.matches(account.attributes)) {
            res.send(account)
          }
        })
      }
    } else if (parentDN != null && req.scope === 'base' && req.dn.rdns[0].attrs.cn != null) {
      if (parentDN.equals(parsedUsersDN)) {
        const wantedUid = req.dn.rdns[0].attrs.cn.value
        try {
          const user = await model.pgDo(c => model.users.getByUsername(c, wantedUid))
          if (user.uid === null) {
            await model.pgDo(c => model.users.assignUid(c, user.idx, config.posix.minUid))
            res.send(userToPosixAccount(await model.pgDo(c => model.users.getByUserIdx(c, user.idx))))
          } else {
            res.send(userToPosixAccount(user))
          }
        } catch (e) {
          if (!(e instanceof NoSuchEntryError)) {
            throw e
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
