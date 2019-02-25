import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import { GroupUserInfo } from '../../src/model/groups'
import { app, model, config } from '../setup'
import { createUser, createGroup, createGroupRelation } from '../test_utils'

test('group listing', async t => {
  const username = uuid()
  const password = uuid()

  let noneGroupIdx: number = 0
  let memberGroupIdx: number
  let indirectGroupIdx: number
  let pendingGroupIdx: number
  let ownerGroupIdx: number = 0

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
