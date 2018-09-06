import test from 'ava'
import * as uuid from 'uuid/v4'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'

import { createGroup, createUser, createGroupRelation } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

test('get, add, and remove shells', async t => {
  const newShell = uuid()
  await model.pgDo(async c => {
    await model.shells.addShell(c, newShell)
    const result = await model.shells.getShells(c)
    t.true(result.includes(newShell))

    await model.shells.removeShell(c, newShell)
    const result2 = await model.shells.getShells(c)
    t.false(result2.includes(newShell))
  })
})
