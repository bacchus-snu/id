import test from 'ava'

import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'

import { createGroup, createUser, createGroupRelation } from '../_test_utils'
import { v4 as uuid } from 'uuid'
import { model } from '../_setup'

const name: Translation = {
  ko: '도지',
  en: 'doge',
}

const description: Translation = {
  ko: '강아지',
  en: 'dog',
}

test('create and delete group', async t => {
  await model.pgDo(async tr => {

    const idx = await model.groups.create(tr, name, description)
    const row = await model.groups.getByIdx(tr, idx)

    t.deepEqual(row.name, name)
    t.deepEqual(row.description, description)

    const deleteIdx = await model.groups.delete(tr, idx)
    t.is(idx, deleteIdx)

    try {
      await model.groups.getByIdx(tr, idx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return
      }
    }

    t.fail()
  }, ['group_reachable_cache'])
})

test('set owner group', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)
    const ownerGroupIdx = await createGroup(tr, model)

    await model.groups.setOwnerGroup(tr, groupIdx, ownerGroupIdx)
    t.is((await model.groups.getByIdx(tr, groupIdx)).ownerGroupIdx, ownerGroupIdx)

    await model.groups.setOwnerGroup(tr, groupIdx, null)
    t.is((await model.groups.getByIdx(tr, groupIdx)).ownerGroupIdx, null)
  }, ['group_reachable_cache'])
})

test('get group list about user', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)
    const ownerGroupIdx = await createGroup(tr, model)
    const noOwnerGroupIdx = await createGroup(tr, model)
    await model.groups.setOwnerGroup(tr, groupIdx, ownerGroupIdx)
    await model.groups.setOwnerGroup(tr, ownerGroupIdx, ownerGroupIdx)
    await createGroupRelation(tr, model, ownerGroupIdx, groupIdx)

    const userIdx = await createUser(tr, model)
    const pendingUserIdx = await createUser(tr, model)
    const ownerUserIdx = await createUser(tr, model)
    await model.users.addPendingUserMembership(tr, pendingUserIdx, groupIdx)
    await model.users.addUserMembership(tr, ownerUserIdx, ownerGroupIdx)

    let group

    group = (await model.groups.getUserGroupList(tr, userIdx)).find(g => g.idx === noOwnerGroupIdx)
    t.is(group, undefined)

    group = (await model.groups.getUserGroupList(tr, userIdx)).find(g => g.idx === groupIdx)
    if (group) {
      t.truthy(group.name.ko)
      t.truthy(group.name.en)
      t.truthy(group.description.ko)
      t.truthy(group.description.en)
      t.false(group.isMember)
      t.false(group.isDirectMember)
      t.false(group.isPending)
      t.false(group.isOwner)
    } else {
      t.fail('group not found')
    }

    group = (await model.groups.getUserGroupList(tr, pendingUserIdx)).find(g => g.idx === groupIdx)
    if (group) {
      t.truthy(group.name.ko)
      t.truthy(group.name.en)
      t.truthy(group.description.ko)
      t.truthy(group.description.en)
      t.false(group.isMember)
      t.false(group.isDirectMember)
      t.true(group.isPending)
      t.false(group.isOwner)
    } else {
      t.fail('group not found')
    }

    group = (await model.groups.getUserGroupList(tr, ownerUserIdx)).find(g => g.idx === groupIdx)
    if (group) {
      t.truthy(group.name.ko)
      t.truthy(group.name.en)
      t.truthy(group.description.ko)
      t.truthy(group.description.en)
      t.true(group.isMember)
      t.false(group.isDirectMember)
      t.false(group.isPending)
      t.true(group.isOwner)
    } else {
      t.fail('group not found')
    }

    group = (await model.groups.getUserGroupList(tr, ownerUserIdx)).find(g => g.idx === ownerGroupIdx)
    if (group) {
      t.truthy(group.name.ko)
      t.truthy(group.name.en)
      t.truthy(group.description.ko)
      t.truthy(group.description.en)
      t.true(group.isMember)
      t.true(group.isDirectMember)
      t.false(group.isPending)
      t.true(group.isOwner)
    } else {
      t.fail('group not found')
    }
  }, ['users', 'group_reachable_cache'])
})

test('get reachable group object', async t => {
  await model.pgDo(async tr => {
    const g: Array<number> = []
    const range: Array<number> = [...Array(5).keys()]
    for (const _ of range) {
      g.push(await createGroup(tr, model))
    }

    await createGroupRelation(tr, model, g[0], g[1])
    await createGroupRelation(tr, model, g[0], g[2])
    await createGroupRelation(tr, model, g[1], g[3])
    await createGroupRelation(tr, model, g[1], g[4])

    let result: Array<number> = []

    result = await model.groups.getGroupReachableArray(tr, g[0])
    t.deepEqual(result.sort(), [g[0], g[1], g[2], g[3], g[4]].sort())

    result = await model.groups.getGroupReachableArray(tr, g[1])
    t.deepEqual(result.sort(), [g[1], g[3], g[4]].sort())

    result = await model.groups.getGroupReachableArray(tr, g[2])
    t.deepEqual(result, [g[2]])

    result = await model.groups.getGroupReachableArray(tr, g[3])
    t.deepEqual(result, [g[3]])

    result = await model.groups.getGroupReachableArray(tr, g[4])
    t.deepEqual(result, [g[4]])
  }, ['group_reachable_cache'])
})
