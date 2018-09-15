import test from 'ava'
import * as fs from 'fs'
import * as path from 'path'
import * as ldap from 'ldapjs'
import { Client } from 'ldapjs'
import createLDAPServer from '../../src/ldap/server'
import { model, config, log } from '../setup'
import * as uuid from 'uuid/v4'

const ldapOptions = {
  log,
  certificate: fs.readFileSync(path.resolve(__dirname, 'cert', 'cert.pem')),
  key: fs.readFileSync(path.resolve(__dirname, 'cert', 'key.pem')),
}

const ldapServer = createLDAPServer(ldapOptions, model, config)
ldapServer.listen(config.ldap.listenPort, config.ldap.listenHost)

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
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
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
