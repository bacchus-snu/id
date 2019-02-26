import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import { GroupUserInfo } from '../../src/model/groups'
import { app, model, config } from '../setup'
import { createUser, createGroup, createGroupRelation } from '../test_utils'

test('group listing', async t => {
  const username = uuid()
  const password = uuid()

  let noneGroupIdx: number
  let memberGroupIdx: number
  let indirectGroupIdx: number
  let pendingGroupIdx: number
  let ownerGroupIdx: number

  await model.pgDo(async tr => {
    noneGroupIdx = await createGroup(tr, model)
    memberGroupIdx = await createGroup(tr, model)
    indirectGroupIdx = await createGroup(tr, model)
    pendingGroupIdx = await createGroup(tr, model)
    ownerGroupIdx = await createGroup(tr, model)
    await model.groups.setOwnerGroup(tr, noneGroupIdx, noneGroupIdx)
    await model.groups.setOwnerGroup(tr, memberGroupIdx, noneGroupIdx)
    await model.groups.setOwnerGroup(tr, indirectGroupIdx, noneGroupIdx)
    await model.groups.setOwnerGroup(tr, pendingGroupIdx, noneGroupIdx)
    await model.groups.setOwnerGroup(tr, ownerGroupIdx, memberGroupIdx)
    await await createGroupRelation(tr, model, memberGroupIdx, indirectGroupIdx)

    const userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    await model.users.addUserMembership(tr, userIdx, memberGroupIdx)
    await model.users.addPendingUserMembership(tr, userIdx, pendingGroupIdx)
  }, ['users', 'group_reachable_cache'])

  const agent = request.agent(app)
  let response

  response = await agent.get('/api/group')
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username, password,
  })
  t.is(response.status, 200)

  response = await agent.get('/api/group')
  t.is(response.status, 200)

  const body = response.body as Array<GroupUserInfo>

  t.true(body.some(g => {
    return g.idx === noneGroupIdx && !g.isMember && !g.isPending && !g.isOwner
  }))
  t.true(body.some(g => {
    return g.idx === memberGroupIdx && g.isMember && !g.isPending && !g.isOwner
  }))
  t.true(body.some(g => {
    return g.idx === indirectGroupIdx && g.isMember && !g.isPending && !g.isOwner
  }))
  t.true(body.some(g => {
    return g.idx === pendingGroupIdx && !g.isMember && g.isPending && !g.isOwner
  }))
  t.true(body.some(g => {
    return g.idx === ownerGroupIdx && !g.isMember && !g.isPending && g.isOwner
  }))
})

test('pending listing', async t => {
  const username = uuid()
  const password = uuid()

  let userIdx = 0
  let groupIdx = 0
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model)
    await model.groups.setOwnerGroup(tr, groupIdx, groupIdx)
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users', 'group_reachable_cache'])

  const agent = request.agent(app)
  let response

  response = await agent.get(`/api/group/${groupIdx}/pending`)
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username, password,
  })
  t.is(response.status, 200)

  response = await agent.get(`/api/group/${groupIdx}/pending`)
  t.is(response.status, 401)

  await model.pgDo(async tr => {
    await model.users.addUserMembership(tr, userIdx, groupIdx)
  })

  response = await agent.get(`/api/group/${groupIdx}/pending`)
  t.is(response.status, 200)
  t.deepEqual(response.body, [])

  let pendingUserIdx = 0
  await model.pgDo(async tr => {
    pendingUserIdx = await createUser(tr, model)
    await model.users.addStudentNumber(tr, pendingUserIdx, uuid())
    await model.users.addPendingUserMembership(tr, pendingUserIdx, groupIdx)
  }, ['users'])

  response = await agent.get(`/api/group/${groupIdx}/pending`)
  t.is(response.status, 200)
  t.is(response.body.length, 1)
  t.is(response.body[0].uid, pendingUserIdx)
})

test('apply to group', async t => {
  const username = uuid()
  const password = uuid()

  let userIdx = 0
  let groupIdx = 0
  await model.pgDo(async tr => {
    groupIdx = await createGroup(tr, model)
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
  }, ['users', 'group_reachable_cache'])

  const agent = request.agent(app)
  let response

  response = await agent.post(`/api/group/${groupIdx}/apply`)
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username, password,
  })
  t.is(response.status, 200)

  response = await agent.post(`/api/group/${groupIdx}/apply`)
  t.is(response.status, 400)

  await model.pgDo(async tr => {
    await model.groups.setOwnerGroup(tr, groupIdx, groupIdx)
  })

  response = await agent.post(`/api/group/${groupIdx}/apply`)
  t.is(response.status, 200)

  response = await agent.post(`/api/group/${groupIdx}/apply`)
  t.is(response.status, 400)

  await model.pgDo(async tr => {
    const pendingIdx = await model.users.getPendingUserMembership(tr, userIdx, groupIdx)
    await model.users.deletePendingUserMembership(tr, pendingIdx)
    await model.users.addUserMembership(tr, userIdx, groupIdx)
  })

  response = await agent.post(`/api/group/${groupIdx}/apply`)
  t.is(response.status, 400)
})
