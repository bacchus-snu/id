import test from 'ava'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { Translation } from '../../src/model/translation'
import { NoSuchEntryError, AuthenticationError, NotActivatedError } from '../../src/model/errors'
import * as uuid from 'uuid/v4'

import { createEmailAddress, createUser, createGroup } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config.postgresql, log)

test('create and delete user', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)

    const user1 = await model.users.getByUserIdx(c, userIdx)
    if (user1.username === null) {
      t.fail()
      return
    }

    const user2 = await model.users.getByUsername(c, user1.username)
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

test('authenticate user', async t => {
  await model.pgDo(async c => {
    const username = uuid()
    const password = uuid()
    const emailIdx = await createEmailAddress(c, model)
    const userIdx = await model.users.create(c, username, password, uuid(), emailIdx, '/bin/bash', 'en')
    await model.users.activate(c, userIdx)

    t.is(await model.users.authenticate(c, username, password), userIdx)

    try {
      await model.users.authenticate(c, username, password + 'doge')
    } catch (e) {
      if (e instanceof AuthenticationError) {
        return
      }
    }

    t.fail()
  })
})

test('reject not activated user', async t => {
  await model.pgDo(async c => {
    const username = uuid()
    const password = uuid()
    const emailIdx = await createEmailAddress(c, model)
    const userIdx = await model.users.create(c, username, password, uuid(), emailIdx, '/bin/bash', 'en')
    await model.users.deactivate(c, userIdx)

    try {
      await model.users.authenticate(c, username, password)
    } catch (e) {
      if (e instanceof NotActivatedError) {
        t.pass()
        return
      }
    }

    t.fail()
  })
})

test('add and delete user membership', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)
    const groupIdx = await createGroup(c, model)
    const userMembershipIdx = await model.users.addUserMembership(c, userIdx, groupIdx)

    const query = 'SELECT * FROM user_memberships WHERE idx = $1'
    const result = await c.query(query, [userMembershipIdx])

    t.truthy(result.rows[0])
    t.is(result.rows[0].user_idx, userIdx)
    t.is(result.rows[0].group_idx, groupIdx)

    t.is(await model.users.deleteUserMembership(c, userMembershipIdx), userMembershipIdx)

    try {
      await model.users.deleteUserMembership(c, userMembershipIdx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return
      }
    }

    t.fail()
  })
})

test('get all user memberships', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)
    const groupIdx1 = await createGroup(c, model)
    const groupIdx2 = await createGroup(c, model)

    const idx1 = await model.users.addUserMembership(c, userIdx, groupIdx1)
    const idx2 = await model.users.addUserMembership(c, userIdx, groupIdx2)

    const result = await model.users.getAllUserMemberships(c, userIdx)

    t.deepEqual(result.map(um => um.groupIdx).sort(), [groupIdx1, groupIdx2].sort())
  })
})
