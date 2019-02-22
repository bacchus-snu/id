import test from 'ava'

import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'

import { createGroup, createUser, createGroupRelation } from '../test_utils'
import * as uuid from 'uuid/v4'
import { model } from '../setup'

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

test('set owner user', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)
    const userIdx = await createUser(tr, model)

    await model.groups.setOwnerUser(tr, groupIdx, userIdx)
    t.is((await model.groups.getByIdx(tr, groupIdx)).ownerUserIdx, userIdx)

    await model.groups.setOwnerUser(tr, groupIdx, null)
    t.is((await model.groups.getByIdx(tr, groupIdx)).ownerUserIdx, null)
  }, ['users', 'group_reachable_cache'])
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
