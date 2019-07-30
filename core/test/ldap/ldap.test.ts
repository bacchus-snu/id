import test from 'ava'
import * as fs from 'fs'
import * as path from 'path'
import * as ldap from 'ldapjs'
import { Client } from 'ldapjs'
import createLDAPServer from '../../src/ldap/server'
import { model, config, log } from '../_setup'
import * as uuid from 'uuid/v4'

const ldapOptions = {
  log,
  certificate: fs.readFileSync(path.resolve(__dirname, 'cert', 'cert.pem')),
  key: fs.readFileSync(path.resolve(__dirname, 'cert', 'key.pem')),
}

const ldapServer = createLDAPServer(ldapOptions, model, config)
ldapServer.listen(config.ldap.listenPort, config.ldap.listenHost)

// need for suppress tls error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function bindPromise(client: Client, dn: string, password: string) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

test.afterEach.always(async t => {
  await model.pgDo(async tr => {
    try {
      await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
    } catch (e) {
      log.warn(e)
    }
    await tr.query('DELETE FROM host_groups WHERE name = $1', ['test group'])
  })
})

test.serial('bind password test', async t => {
  const username = uuid()
  const password = uuid()
  const client = ldap.createClient({
    url: 'ldaps://127.0.0.1:50636',
    log,
  })

  await model.pgDo(async tr => {
    await model.hosts.addHost(tr, 'test', '127.0.0.1')
    await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users'])

  try {
    // with correct password
    await bindPromise(client, `cn=${username},ou=users,dc=snucse,dc=org`, password)
  } catch (e) {
    t.fail(e)
  }

  try {
    await bindPromise(client, `cn=${username},ou=users,dc=snucse,dc=org`, 'dogepassword')
  } catch (e) {
    t.pass()
    return
  }
  t.fail()
})

test.serial('bind with non-exist user', async t => {
  const username = uuid()
  const password = uuid()
  const client = ldap.createClient({
    url: 'ldaps://127.0.0.1:50636',
    log,
  })

  await model.pgDo(async tr => {
    await model.hosts.addHost(tr, 'test', '127.0.0.1')
    await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users'])

  try {
    // with correct username and password
    await bindPromise(client, `cn=${username},ou=users,dc=snucse,dc=org`, password)
  } catch (e) {
    t.fail(e)
  }

  try {
    // try with invalid username
    await bindPromise(client, `cn=${uuid()},ou=users,dc=snucse,dc=org`, password)
  } catch (e) {
    t.pass()
    return
  }
  t.fail()
})

test.serial('authorization with host group', async t => {
  const username = uuid()
  const password = uuid()
  const trans = {
    ko: uuid(),
    en: uuid(),
  }
  const client = ldap.createClient({
    url: 'ldaps://127.0.0.1:50636',
    log,
  })

  let hostIdx = -1
  let hostGroupIdx = -1
  let userIdx = -1
  let permissionIdx = -1

  await model.pgDo(async tr => {
    hostIdx = await model.hosts.addHost(tr, 'test', '127.0.0.1')
    hostGroupIdx = await model.hosts.addHostGroup(tr, 'test group')
    await model.hosts.addHostToGroup(tr, hostIdx, hostGroupIdx)
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    permissionIdx = await model.permissions.create(tr, trans, trans)
    const groupIdx = await model.groups.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)
    await model.users.addUserMembership(tr, userIdx, groupIdx)
  }, ['users', 'group_reachable_cache'])

  try {
    // with no required permission
    await bindPromise(client, `cn=${username},ou=users,dc=snucse,dc=org`, password)
  } catch (e) {
    t.fail(e)
  }

  await model.pgDo(async tr => {
    // set required permission
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, permissionIdx)
  })

  try {
    // with correct required permission
    await bindPromise(client, `cn=${username},ou=users,dc=snucse,dc=org`, password)
  } catch (e) {
    t.fail(e)
  }

  await model.pgDo(async tr => {
    // set to another permission
    const newGroupIdx = await model.groups.create(tr, trans, trans)
    const newPermissionIdx = await model.permissions.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, newGroupIdx, newPermissionIdx)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, newPermissionIdx)
  }, ['group_reachable_cache'])

  try {
    // should fail with AuthorizationError / InsufficientAccessRightsError
    await bindPromise(client, `cn=${username},ou=users,dc=snucse,dc=org`, password)
  } catch (e) {
    t.pass(e)
    return
  }
  t.fail()
})
