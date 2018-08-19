import test from 'ava'

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

const model = new Model(config.postgresql, log)

test('get, add, and remove shells', async t => {
  await model.pgDo(async c => {
    await model.shells.addShell(c, 'dogeshell')
    const result = await model.shells.getShells(c)
    t.true(result.includes('dogeshell'))

    await model.shells.removeShell(c, 'dogeshell')
    const result2 = await model.shells.getShells(c)
    t.false(result2.includes('dogeshell'))
  })
})
