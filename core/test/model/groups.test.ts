import test from 'ava'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'

import { createGroup, createUser } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const name: Translation = {
  ko: '도지',
  en: 'doge',
}

const description: Translation = {
  ko: '강아지',
  en: 'dog',
}

const model = new Model(config.postgresql, log)

test('create and delete group', async t => {
  await model.pgDo(async c => {

    const idx = await model.groups.create(c, name, description)
    const row = await model.groups.getByIdx(c, idx)

    t.deepEqual(row.name, name)
    t.deepEqual(row.description, description)

    const deleteIdx = await model.groups.delete(c, idx)
    t.is(idx, deleteIdx)

    try {
      await model.groups.getByIdx(c, idx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return
      }
    }

    t.fail()
  })
})

test('set owner user', async t => {
  await model.pgDo(async c => {
    const groupIdx = await createGroup(c, model)
    const userIdx = await createUser(c, model)

    await model.groups.setOwnerUser(c, groupIdx, userIdx)
    t.is((await model.groups.getByIdx(c, groupIdx)).ownerUserIdx, userIdx)

    await model.groups.setOwnerUser(c, groupIdx, null)
    t.is((await model.groups.getByIdx(c, groupIdx)).ownerUserIdx, null)
  })
})

test('set owner group', async t => {
  await model.pgDo(async c => {
    const groupIdx = await createGroup(c, model)
    const ownerGroupIdx = await createUser(c, model)

    await model.groups.setOwnerGroup(c, groupIdx, ownerGroupIdx)
    t.is((await model.groups.getByIdx(c, groupIdx)).ownerGroupIdx, ownerGroupIdx)

    await model.groups.setOwnerGroup(c, groupIdx, null)
    t.is((await model.groups.getByIdx(c, groupIdx)).ownerGroupIdx, null)
  })
})
