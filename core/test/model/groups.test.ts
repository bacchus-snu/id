import test from 'ava'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config.postgresql, log)

test('create and delete group', async t => {
  await model.pgDo(c => async {
    const name: Translation = {
      ko: '도지',
      en: 'doge',
    }

    const description: Translation = {
      ko: '강아지',
      en: 'dog',
    }
    const idx = await model.groups.create(c, name, description)
    const row = await model.groups.getByIdx(c, idx)

    t.deepEqual(row.name, name)
    t.deepEqual(row.description, description)

    const deleteIdx = await model.groups.delete(c, idx)
    t.is(idx, deleteIdx)

    const shouldThrow = async () => {
      await model.groups.getByIdx(c, idx)
    }

    t.throws(shouldThrow, NoSuchEntryError)
  })
})
