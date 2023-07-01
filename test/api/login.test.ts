import test from 'ava'
import * as request from 'supertest'
import * as tweetnacl from 'tweetnacl'
import { v4 as uuid } from 'uuid'
import moment from 'moment'
import { jwtVerify } from 'jose'
import { createPublicKey } from 'crypto'
import { app, model, config } from '../_setup'
import { createUser, createGroup, createPermission, createGroupRelation } from '../_test_utils'

test('test login with credential', async t => {
  let username = ''
  let password = ''
  let userIdx = -1

  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users'])

  const agent = request.agent(app)

  let response

  response = await agent.post('/api/login').send({
    username,
    password: 'doge!',
  })
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)

  await model.pgDo(async tr => {
    const query = 'SELECT last_login_at FROM users WHERE idx = $1'
    const result = await tr.query(query, [userIdx])
    const lastLogin = moment(result.rows[0].last_login_at)
    t.true(lastLogin.isBetween(moment().subtract(10, 'seconds'), moment().add(10, 'seconds')))
  })
})

test.serial('test PAM login with credential and host', async t => {
  let username = ''
  let password = ''
  let userIdx = -1
  let hostIdx = -1
  let groupIdx = -1
  let hostGroupIdx = -1
  let permissionIdx = -1

  const trans = {
    ko: uuid(),
    en: uuid(),
  }

  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()

    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    groupIdx = await model.groups.create(tr, trans, trans)
    await model.users.addUserMembership(tr, userIdx, groupIdx)

    hostIdx = await model.hosts.addHost(tr, 'test', '127.0.0.1')
    hostGroupIdx = await model.hosts.addHostGroup(tr, 'test group')
    await model.hosts.addHostToGroup(tr, hostIdx, hostGroupIdx)

    permissionIdx = await model.permissions.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, permissionIdx)
    tr.ensureHasAccessExclusiveLock('hosts')
  }, ['users', 'group_reachable_cache', 'hosts'])

  const agent = request.agent(app)

  let response

  response = await agent.post('/api/login/pam').send({
    username,
    password: 'doge!',
  })
  t.is(response.status, 401)

  response = await agent.post('/api/login/pam').send({
    username,
    password,
  })
  t.is(response.status, 200)

  await model.pgDo(async tr => {
    const newGroupIdx = await model.groups.create(tr, trans, trans)
    const newPermissionIdx = await model.permissions.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, newGroupIdx, newPermissionIdx)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, newPermissionIdx)
  }, ['group_reachable_cache'])

  response = await agent.post('/api/login/pam').send({
    username,
    password,
  })
  t.is(response.status, 401)

  // Cleanup
  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
    await tr.query('DELETE FROM host_groups WHERE name = $1', ['test group'])
  })
})

test.serial('test PAM login with credential and pubkey', async t => {
  let username = ''
  let password = ''
  let userIdx = -1
  let hostIdx = -1
  let groupIdx = -1
  let hostGroupIdx = -1
  let permissionIdx = -1

  const trans = {
    ko: uuid(),
    en: uuid(),
  }

  const keypair = tweetnacl.sign.keyPair()
  const publicKey = Buffer.from(keypair.publicKey)
  const secretKey = Buffer.from(keypair.secretKey)
  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()

    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    groupIdx = await model.groups.create(tr, trans, trans)
    await model.users.addUserMembership(tr, userIdx, groupIdx)

    hostIdx = await model.hosts.addHost(tr, 'test', '127.0.0.1', publicKey)
    hostGroupIdx = await model.hosts.addHostGroup(tr, 'test group')
    await model.hosts.addHostToGroup(tr, hostIdx, hostGroupIdx)

    permissionIdx = await model.permissions.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, permissionIdx)
    tr.ensureHasAccessExclusiveLock('hosts')
  }, ['users', 'group_reachable_cache', 'hosts'])

  const agent = request.agent(app)

  let response

  // cannot authorize without signature
  {
    const body = JSON.stringify({ username, password })
    response = await agent.post('/api/login/pam')
      .set('Content-Type', 'application/json')
      .send(body)
    t.is(response.status, 401)
  }

  // bad signature
  {
    const body = JSON.stringify({ username, password })
    let timestamp = Date.now().toString()
    timestamp = timestamp.substring(0, timestamp.length - 3)
    response = await agent.post('/api/login/pam')
      .set('Content-Type', 'application/json')
      .set('X-Bacchus-Id-Pubkey', publicKey.toString('base64'))
      .set('X-Bacchus-Id-Timestamp', timestamp)
      .set('X-Bacchus-Id-Signature', Buffer.alloc(64, 0).toString('base64'))
      .send(body)
    t.is(response.status, 401)
  }

  // wrong password
  {
    const body = JSON.stringify({ username, password: 'doge!' })
    let timestamp = Date.now().toString()
    timestamp = timestamp.substring(0, timestamp.length - 3)
    const signature = tweetnacl.sign.detached(Buffer.from(timestamp + body), secretKey)
    response = await agent.post('/api/login/pam')
      .set('Content-Type', 'application/json')
      .set('X-Bacchus-Id-Pubkey', publicKey.toString('base64'))
      .set('X-Bacchus-Id-Timestamp', timestamp)
      .set('X-Bacchus-Id-Signature', Buffer.from(signature).toString('base64'))
      .send(body)
    t.is(response.status, 401)
  }

  // success case
  {
    const body = JSON.stringify({ username, password })
    let timestamp = Date.now().toString()
    timestamp = timestamp.substring(0, timestamp.length - 3)
    const signature = tweetnacl.sign.detached(Buffer.from(timestamp + body), secretKey)
    response = await agent.post('/api/login/pam')
      .set('Content-Type', 'application/json')
      .set('X-Bacchus-Id-Pubkey', publicKey.toString('base64'))
      .set('X-Bacchus-Id-Timestamp', timestamp)
      .set('X-Bacchus-Id-Signature', Buffer.from(signature).toString('base64'))
      .send(body)
    t.is(response.status, 200)
  }

  await model.pgDo(async tr => {
    const newGroupIdx = await model.groups.create(tr, trans, trans)
    const newPermissionIdx = await model.permissions.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, newGroupIdx, newPermissionIdx)
    await model.hosts.setHostGroupPermission(tr, hostGroupIdx, newPermissionIdx)
  }, ['group_reachable_cache'])

  {
    const body = JSON.stringify({ username, password })
    let timestamp = Date.now().toString()
    timestamp = timestamp.substring(0, timestamp.length - 3)
    const signature = tweetnacl.sign.detached(Buffer.from(timestamp + body), secretKey)
    response = await agent.post('/api/login/pam')
      .set('Content-Type', 'application/json')
      .set('X-Bacchus-Id-Pubkey', publicKey.toString('base64'))
      .set('X-Bacchus-Id-Timestamp', timestamp)
      .set('X-Bacchus-Id-Signature', Buffer.from(signature).toString('base64'))
      .send(body)
    t.is(response.status, 401)
  }

  // Cleanup
  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
    await tr.query('DELETE FROM host_groups WHERE name = $1', ['test group'])
  })
})

test('test checkLogin', async t => {
  let username = ''
  let password = ''
  let userIdx = -1

  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users'])

  const agent = request.agent(app)

  let response

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 200)
  t.is(response.body.username, username)

  response = await agent.post('/api/logout').send()
  t.is(response.status, 200)

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 401)
})

test('test legacy login', async t => {
  let username = ''
  let password = ''
  let userIdx = -1
  let userMembershipIdx = -1
  const trans = {
    ko: uuid(),
    en: uuid(),
  }

  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      tr, username, password, uuid(), '/bin/bash', 'en')
    const groupIdx = await model.groups.create(tr, trans, trans)
    userMembershipIdx = await model.users.addUserMembership(tr, userIdx, groupIdx)
    const permissionIdx = await model.permissions.create(tr, trans, trans)
    await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)
    config.permissions.snucse = permissionIdx
  }, ['users', 'group_reachable_cache'])

  const agent = request.agent(app)

  /* eslint-disable @typescript-eslint/naming-convention */
  let response

  response = await agent.post('/Authentication/Login.aspx').send({
    member_account: username,
    member_password: 'doge!',
  })
  t.is(response.status, 200)

  response = await agent.post('/Authentication/Login.aspx').send({
    member_account: username,
    member_password: password,
  })
  t.is(response.status, 302)

  // test with insufficient permission
  await model.pgDo(async tr => {
    await model.users.deleteUserMembership(tr, userMembershipIdx)
  })
  response = await agent.post('/Authentication/Login.aspx').send({
    member_account: username,
    member_password: password,
  })
  t.is(response.status, 200)
})

/* eslint-enable @typescript-eslint/naming-convention */

test('test jwt', async t => {
  let username = ''
  let password = ''
  let userIdx = -1

  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users'])

  const agent = request.agent(app)

  let response

  response = await agent.post('/api/issue-jwt').send()
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)

  // test expiry
  {
    response = await agent.post('/api/issue-jwt').send()
    t.is(response.status, 200)
    const token = response.body.token as string

    const futureDate = new Date()
    futureDate.setSeconds(futureDate.getSeconds() + config.jwt.expirySec + 20)

    const publicKey = createPublicKey({
      key: config.jwt.privateKey,
      format: 'pem',
    })
    t.throwsAsync(() => jwtVerify(
      token,
      publicKey,
      {
        algorithms: ['ES256'],
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
        currentDate: futureDate,
      },
    ))
  }

  // with no permission check
  {
    response = await agent.post('/api/issue-jwt').send()
    t.is(response.status, 200)
    const token = response.body.token as string
    t.falsy(response.body.hasPermission)

    const publicKey = createPublicKey({
      key: config.jwt.privateKey,
      format: 'pem',
    })
    const { payload } = await jwtVerify(
      token,
      publicKey,
      {
        algorithms: ['ES256'],
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
        currentDate: new Date(),
      },
    )

    t.is(payload.userIdx, userIdx)
    t.is(payload.username, username)
    t.is(payload.permissionIdx, -1)
  }

  // with permission check, but has no permission
  let groupIdx = -1
  let permissionIdx = -1
  {
    await model.pgDo(async tr => {
      groupIdx = await createGroup(tr, model)
      permissionIdx = await createPermission(tr, model)
      await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)
    }, ['group_reachable_cache'])
    response = await agent.post('/api/issue-jwt').send({
      permissionIdx,
    })
    t.is(response.status, 200)
    const token = response.body.token as string
    t.false(response.body.hasPermission)

    const publicKey = createPublicKey({
      key: config.jwt.privateKey,
      format: 'pem',
    })
    const { payload } = await jwtVerify(
      token,
      publicKey,
      {
        algorithms: ['ES256'],
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
        currentDate: new Date(),
      },
    )

    t.is(payload.userIdx, userIdx)
    t.is(payload.username, username)
    t.is(payload.permissionIdx, -1)
  }

  // with permission check, and has permission
  {
    await model.pgDo(async tr => {
      await model.users.addUserMembership(tr, userIdx, groupIdx)
    })
    response = await agent.post('/api/issue-jwt').send({
      permissionIdx,
    })
    t.is(response.status, 200)
    const token = response.body.token as string
    t.true(response.body.hasPermission)

    const publicKey = createPublicKey({
      key: config.jwt.privateKey,
      format: 'pem',
    })
    const { payload } = await jwtVerify(
      token,
      publicKey,
      {
        algorithms: ['ES256'],
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
        currentDate: new Date(),
      },
    )

    t.is(payload.userIdx, userIdx)
    t.is(payload.username, username)
    t.is(payload.permissionIdx, permissionIdx)
  }

  // cross origin
  {
    response = await agent.options('/api/issue-jwt').send()
    t.falsy(response.header['access-control-allow-origin'])

    response = await agent.options('/api/issue-jwt')
      .set('origin', 'https://reservation.snucse.org')
      .set('access-control-request-method', 'POST')
      .send()
    t.is(response.status, 204)
    t.is(response.header['access-control-allow-origin'], 'https://reservation.snucse.org')
    t.is(response.header['access-control-allow-methods'], 'POST')
    t.is(response.header['access-control-allow-credentials'], 'true')

    response = await agent.post('/api/issue-jwt')
      .set('origin', 'https://reservation.snucse.org')
      .set('access-control-request-method', 'POST')
      .send()
    t.is(response.status, 200)
  }

  response = await agent.post('/api/logout').send()
  t.is(response.status, 200)

  response = await agent.post('/api/issue-jwt').send()
  t.is(response.status, 401)
})

test('login and jwt', async t => {
  let username = ''
  let password = ''
  let userIdx = -1

  await model.pgDo(async tr => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users'])

  const agent = request.agent(app)
  let response

  {
    response = await agent.post('/api/login/jwt').send({ username, password })
    t.is(response.status, 200)
    const token = response.body.token as string
    t.falsy(response.body.hasPermission)

    const publicKey = createPublicKey({
      key: config.jwt.privateKey,
      format: 'pem',
    })

    const { payload } = await jwtVerify(
      token,
      publicKey,
      {
        algorithms: ['ES256'],
        audience: config.jwt.audience,
        issuer: config.jwt.issuer,
        currentDate: new Date(),
      },
    )

    t.is(payload.userIdx, userIdx)
    t.is(payload.username, username)
    t.is(payload.permissionIdx, -1)
  }
})
