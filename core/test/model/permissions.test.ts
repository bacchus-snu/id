import test from 'ava'

import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'
import * as uuid from 'uuid/v4'

import { createUser, createGroup, createPermission, createGroupRelation } from '../test_utils'
import { model } from '../setup'

const name: Translation = {
  ko: '도지',
  en: 'doge',
}

const description: Translation = {
  ko: '강아지',
  en: 'dog',
}

test('create and delete permissions', async t => {
  await model.pgDo(async tr => {
    const permissionIdx = await model.permissions.create(tr, name, description)

    const query = 'SELECT * FROM permissions WHERE idx = $1'
    const result = await tr.query(query, [permissionIdx])

    t.truthy(result.rows[0])
    t.deepEqual(result.rows[0].name_ko, name.ko)
    t.deepEqual(result.rows[0].name_en, name.en)
    t.deepEqual(result.rows[0].description_ko, description.ko)
    t.deepEqual(result.rows[0].description_en, description.en)

    const deletedPermissionIdx = await model.permissions.delete(tr, permissionIdx)
    const emptyResult = await tr.query(query, [permissionIdx])

    t.is(emptyResult.rows.length, 0)
  })
})

test('create and delete permission requirements', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)
    const permissionIdx = await createPermission(tr, model)
    const idx = await model.permissions.addPermissionRequirement(tr, groupIdx, permissionIdx)

    const query = 'SELECT * FROM permission_requirements WHERE idx = $1'
    const result = await tr.query(query, [idx])

    t.truthy(result.rows[0])
    t.is(result.rows[0].group_idx, groupIdx)

    const deletedIdx = await model.permissions.deletePermissionRequirement(tr, idx)
    const emptyResult = await tr.query(query, [idx])

    t.is(emptyResult.rows.length, 0)
  })
})

test('check user permission', async t => {
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

    const permissionIdx = await createPermission(tr, model)
    await model.permissions.addPermissionRequirement(tr, g[2], permissionIdx)
    await model.permissions.addPermissionRequirement(tr, g[4], permissionIdx)

    const userIdx1 = await createUser(tr, model)
    await model.users.addUserMembership(tr, userIdx1, g[0])

    t.true(await model.permissions.checkUserHavePermission(tr, userIdx1, permissionIdx))

    const userIdx2 = await createUser(tr, model)
    await model.users.addUserMembership(tr, userIdx2, g[1])

    t.false(await model.permissions.checkUserHavePermission(tr, userIdx2, permissionIdx))

    const userIdx3 = await createUser(tr, model)
    await model.users.addUserMembership(tr, userIdx3, g[1])
    await model.users.addUserMembership(tr, userIdx3, g[2])

    t.true(await model.permissions.checkUserHavePermission(tr, userIdx3, permissionIdx))
  }, ['users'])
})
