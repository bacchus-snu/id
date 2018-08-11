import test from 'ava'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { Translation } from '../../src/model/translation'
import { NoSuchEntryError } from '../../src/model/errors'

import { User } from '../../src/model/users'

import { createUser } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config.postgresql, log)

test('create and delete user', async t => {
  await model.pgDo(async c => {
    // const mailIdx = await model.emailAddresses.create(c, 'drdoge', 'dogeuniverse.com')
    // const userIdx = await model.users.create(c, 'DrDoge', 'dogecoin', '박도지', mailIdx, '/bin/bash', 'en')
    const userIdx = await createUser(c, model)

    const user1 = await model.users.getByUserIdx(c, userIdx)
    t.is(user1.name, 'mrdoge')

    const user2 = await model.users.getByUsername(c, user1.name)
    t.is(user2.name, user1.name)

    const deletedUserIdx = await model.users.delete(c, userIdx)
    t.is(deletedUserIdx, userIdx)

    try {
      await model.users.getByUserIdx(c, userIdx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return
      }
    }

    t.fail()
  })
})
