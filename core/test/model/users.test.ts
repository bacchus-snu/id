import test from 'ava'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import * as phc from '@phc/format'
import { NoSuchEntryError, AuthenticationError, NotActivatedError } from '../../src/model/errors'
import * as uuid from 'uuid/v4'
import * as moment from 'moment'

import { createUser, createGroup } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

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
    const userIdx = await model.users.create(c, username, password, uuid(), '/bin/bash', 'en')
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
    const userIdx = await model.users.create(c, username, password, uuid(), '/bin/bash', 'en')
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

test('change password', async t => {
  await model.pgDo(async c => {
    const username = uuid()
    const password = uuid()
    const emailIdx = await model.emailAddresses.create(c, uuid(), uuid())
    const userIdx = await model.users.create(c, username, password, uuid(), '/bin/bash', 'en')

    const newPassword = uuid()
    await model.users.changePassword(c, userIdx, newPassword)

    await model.users.authenticate(c, username, newPassword)
    t.pass()
  })
})

test('change password token request with identical email idx', async t => {
  await model.pgDo(async c => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const oldToken = await model.users.generatePasswordChangeToken(c, userIdx)
    const newToken = await model.users.generatePasswordChangeToken(c, userIdx)

    const query = 'SELECT token FROM password_change_tokens WHERE user_idx = $1'
    const result = await c.query(query, [userIdx])
    const token = result.rows[0].token
    t.is(newToken, token)
    t.not(oldToken, token)
  })
})

test('token expiration', async t => {
  await model.pgDo(async c => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const token = await model.users.generatePasswordChangeToken(c, userIdx)
    const expiryResult = await c.query('SELECT expires FROM password_change_tokens WHERE token = $1', [token])
    const originalExpires = expiryResult.rows[0].expires

    const query = 'UPDATE password_change_tokens SET expires = $1 WHERE token = $2'
    let newExpiry = moment(originalExpires).subtract(12, 'hours').toDate()
    await c.query(query, [newExpiry, token])
    await model.users.ensureTokenNotExpired(c, token)

    newExpiry = moment(originalExpires).subtract(1, 'day').toDate()
    await c.query(query, [newExpiry, token])

    try {
      await model.users.ensureTokenNotExpired(c, token)
    } catch (e) {
      t.pass()
      return
    }

    t.fail()
  })
})

test('change user shell', async t => {
  await model.pgDo(async c => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const newShell = uuid()
    await model.shells.addShell(c, newShell)
    await model.users.changeShell(c, userIdx, newShell)

    const currentShell = await model.users.getShell(c, userIdx)
    t.is(currentShell, newShell)
  })
})

test('reset resend count of expired password change token', async t => {
  await model.pgDo(async c => {
    const emailIdx = await model.emailAddresses.create(c, uuid(), uuid())
    const userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const token = await model.users.generatePasswordChangeToken(c, userIdx)
    const expiryResult = await c.query('SELECT expires FROM password_change_tokens WHERE token = $1', [token])
    const originalExpires = expiryResult.rows[0].expires
    const query = 'UPDATE email_verification_tokens SET expires = $1, resend_count = 100 WHERE token = $2'
    const newExpiry = moment(originalExpires).subtract(2, 'day').toDate()
    await c.query(query, [newExpiry, token])
    await model.users.resetResendCountIfExpired(c, userIdx)

    const resendCount = await model.users.getResendCount(c, token)
    t.is(resendCount, 0)
  })
})

test('legacy mssql password (sha512)', async t => {
  const username = 'good_old_doge'
  const password = 'dogepassword'
  const legacyPasswordDigest = phc.serialize({id: 'mssql-sha512',
    salt: Buffer.from('251C01B8', 'hex'),
    hash: Buffer.from('CF413665AC3A350E2F61EF6A8845B729CE771DD70E3FA2808C0F24CE3945A19A43F160087' +
      '60ED06D7AF5181986AC39563CE1356BA451468BD27F936FF5D1BAA9', 'hex')})
  await model.pgDo(async c => {
    const result = await c.query('INSERT INTO users (username, password_digest, name, shell, preferred_language)' +
      'VALUES ($1, $2, \'OLDoge\', \'/bin/bash\', \'en\') RETURNING idx', [username, legacyPasswordDigest])
    const userIdx = result.rows[0].idx
    // doge should be able to login using password stored in old doggy password format
    await model.users.authenticate(c, username, password)
    // doge should be automatically migrated to brand-new password format
    const selectResult: string = (await c.query('SELECT password_digest FROM users WHERE username=$1',
      [username])).rows[0].password_digest
    t.is(selectResult.split('$')[1], 'argon2i')
    // doge should be able to login using password stored in brand-new password format. wow.
    await model.users.authenticate(c, username, password)
    await model.users.delete(c, userIdx)
  })
})

test.serial('user ldap search result cache test', async t => {
  const username = uuid()
  const password = uuid()
  const name = uuid()
  const newName = uuid()
  let userIdx = -1

  await model.pgDo(async c => {
    userIdx = await model.users.create(c, username, password, name, '/bin/bash', 'en')
    // cache it
    await model.users.getAllAsPosixAccounts(c)
    const query = 'UPDATE users SET name = $1 WHERE idx = $2'
    await c.query(query, [newName, userIdx])
    let allPosixUsers = await model.users.getAllAsPosixAccounts(c)
    let posixUser = allPosixUsers.find(elem => elem.attributes.gecos === name)
    if (!posixUser) {
      t.fail()
      return
    }
    // ensure that there is no user having `newName` name in cache
    posixUser = allPosixUsers.find(elem => elem.attributes.gecos === newName)
    if (posixUser) {
      t.fail()
      return
    }
    // okay, we now know the cache exists. then how about cache update?
    // this will make cache invalid
    userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'en')

    allPosixUsers = await model.users.getAllAsPosixAccounts(c)
    posixUser = allPosixUsers.find(elem => elem.attributes.gecos === name)
    // this should not exist
    if (posixUser) {
      t.fail()
      return
    }
    posixUser = allPosixUsers.find(elem => elem.attributes.gecos === newName)
    // if user with name `newName` exists, then we can believe that cache was successfully updated
    if (!posixUser) {
      t.fail()
      return
    }

    t.pass()
  })
})
