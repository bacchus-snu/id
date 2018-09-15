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
  await model.pgDo(async c => {
    const permissionIdx = await model.permissions.create(c, name, description)

    const query = 'SELECT * FROM permissions WHERE idx = $1'
    const result = await c.query(query, [permissionIdx])

    t.truthy(result.rows[0])
    t.deepEqual(result.rows[0].name_ko, name.ko)
    t.deepEqual(result.rows[0].name_en, name.en)
    t.deepEqual(result.rows[0].description_ko, description.ko)
    t.deepEqual(result.rows[0].description_en, description.en)

    const deletedPermissionIdx = await model.permissions.delete(c, permissionIdx)
    const emptyResult = await c.query(query, [permissionIdx])

    t.is(emptyResult.rows.length, 0)
  })
})

test('create and delete permission requirements', async t => {
  await model.pgDo(async c => {
    const groupIdx = await createGroup(c, model)
    const permissionIdx = await createPermission(c, model)
    const idx = await model.permissions.addPermissionRequirement(c, groupIdx, permissionIdx)

    const query = 'SELECT * FROM permission_requirements WHERE idx = $1'
    const result = await c.query(query, [idx])

    t.truthy(result.rows[0])
    t.is(result.rows[0].group_idx, groupIdx)

    const deletedIdx = await model.permissions.deletePermissionRequirement(c, idx)
    const emptyResult = await c.query(query, [idx])

    t.is(emptyResult.rows.length, 0)
  })
})

test('check user permission', async t => {
  await model.pgDo(async c => {
    const g: Array<number> = []
    const range: Array<number> = [...Array(5).keys()]
    for (const _ of range) {
      g.push(await createGroup(c, model))
    }

    await createGroupRelation(c, model, g[0], g[1])
    await createGroupRelation(c, model, g[0], g[2])
    await createGroupRelation(c, model, g[1], g[3])
    await createGroupRelation(c, model, g[1], g[4])

    const permissionIdx = await createPermission(c, model)
    await model.permissions.addPermissionRequirement(c, g[2], permissionIdx)
    await model.permissions.addPermissionRequirement(c, g[4], permissionIdx)

    const userIdx1 = await createUser(c, model)
    await model.users.addUserMembership(c, userIdx1, g[0])

    t.true(await model.permissions.checkUserHavePermission(c, userIdx1, permissionIdx))

    const userIdx2 = await createUser(c, model)
    await model.users.addUserMembership(c, userIdx2, g[1])

    t.false(await model.permissions.checkUserHavePermission(c, userIdx2, permissionIdx))

    const userIdx3 = await createUser(c, model)
    await model.users.addUserMembership(c, userIdx3, g[1])
    await model.users.addUserMembership(c, userIdx3, g[2])

    t.true(await model.permissions.checkUserHavePermission(c, userIdx3, permissionIdx))
  })
})
