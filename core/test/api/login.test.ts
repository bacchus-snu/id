import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import * as moment from 'moment'
import { app, model, config } from '../setup'

test('test login with credential', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

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

test('test PAM login with credential and host', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1
  let hostIdx: number = -1
  let groupIdx: number = -1
  let hostGroupIdx: number = -1
  let permissionIdx: number = -1

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

  response = await agent.post('/api/login-pam').send({
    username,
    password: 'doge!',
  })
  t.is(response.status, 401)

  response = await agent.post('/api/login-pam').send({
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

  response = await agent.post('/api/login-pam').send({
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

test('test checkLogin', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

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

  response = await agent.get('/api/logout').send()
  t.is(response.status, 200)

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 401)
})

test('test legacy login', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1
  let userMembershipIdx: number = -1
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
