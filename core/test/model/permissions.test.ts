import test from 'ava'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'
import * as uuid from 'uuid/v4'

import { createGroup, createPermission } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config.postgresql, log)

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
