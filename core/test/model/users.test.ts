import test from 'ava'

import * as phc from '@phc/format'
import { NoSuchEntryError, AuthenticationError, NotActivatedError } from '../../src/model/errors'
import { v4 as uuid } from 'uuid'
import * as moment from 'moment'

import { createUser, createGroup } from '../_test_utils'
import { model } from '../_setup'

test('create and delete user', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)

    const user1 = await model.users.getByUserIdx(tr, userIdx)
    if (user1.username === null) {
      t.fail()
      return
    }

    const user2 = await model.users.getByUsername(tr, user1.username)
    t.is(user2.name, user1.name)

    const deletedUserIdx = await model.users.delete(tr, userIdx)
    t.is(deletedUserIdx, userIdx)

    try {
      await model.users.getByUserIdx(tr, userIdx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return
      }
    }

    t.fail()
  }, ['users'])
})

test('authenticate user', async t => {
  await model.pgDo(async tr => {
    const username = uuid()
    const password = uuid()
    const userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    await model.users.activate(tr, userIdx)

    t.is(await model.users.authenticate(tr, username, password), userIdx)

    try {
      await model.users.authenticate(tr, username, password + 'doge')
    } catch (e) {
      if (e instanceof AuthenticationError) {
        return
      }
    }

    t.fail()
  }, ['users'])
})

test('reject not activated user', async t => {
  await model.pgDo(async tr => {
    const username = uuid()
    const password = uuid()
    const userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    await model.users.deactivate(tr, userIdx)

    try {
      await model.users.authenticate(tr, username, password)
    } catch (e) {
      if (e instanceof NotActivatedError) {
        t.pass()
        return
      }
    }

    t.fail()
  }, ['users'])
})

test('add and delete user membership', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)
    const groupIdx = await createGroup(tr, model)
    const userMembershipIdx = await model.users.addUserMembership(tr, userIdx, groupIdx)

    const query = 'SELECT * FROM user_memberships WHERE idx = $1'
    const result = await tr.query(query, [userMembershipIdx])

    t.truthy(result.rows[0])
    t.is(result.rows[0].user_idx, userIdx)
    t.is(result.rows[0].group_idx, groupIdx)

    t.is(await model.users.deleteUserMembership(tr, userMembershipIdx), userMembershipIdx)

    try {
      await model.users.deleteUserMembership(tr, userMembershipIdx)
    } catch (e) {
      if (e instanceof NoSuchEntryError) {
        return
      }
    }

    t.fail()
  }, ['users', 'group_reachable_cache'])
})

test('get all user memberships', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)
    const groupIdx1 = await createGroup(tr, model)
    const groupIdx2 = await createGroup(tr, model)

    const idx1 = await model.users.addUserMembership(tr, userIdx, groupIdx1)
    const idx2 = await model.users.addUserMembership(tr, userIdx, groupIdx2)

    const result = await model.users.getAllUserMemberships(tr, userIdx)

    t.deepEqual(result.map(um => um.groupIdx).sort(), [groupIdx1, groupIdx2].sort())
  }, ['users', 'group_reachable_cache'])
})

test('get user membership by uid and gid', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)
    const groupIdx = await createGroup(tr, model)
    await model.users.addUserMembership(tr, userIdx, groupIdx)

    let result
    result = await model.users.hasUserMembership(tr, userIdx, groupIdx + 1)
    t.false(result)
    result = await model.users.hasUserMembership(tr, userIdx, groupIdx)
    t.true(result)
  }, ['users', 'group_reachable_cache'])
})

test('get all user membership users', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)
    const userIdx = await createUser(tr, model)
    const studentNumberIdx = await model.users.addStudentNumber(tr, userIdx, uuid())
    const membership = await model.users.addUserMembership(tr, userIdx, groupIdx)

    const allMembership = await model.users.getAllMembershipUsers(tr, groupIdx)

    t.is(allMembership.length, 1)
    t.is(allMembership[0].idx, userIdx)
  }, ['users', 'group_reachable_cache'])
})

test('get pending user membership by uid and gid', async t => {
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)
    const groupIdx = await createGroup(tr, model)
    await model.users.addPendingUserMembership(tr, userIdx, groupIdx)

    let result
    result = await model.users.hasPendingUserMembership(tr, userIdx, groupIdx + 1)
    t.false(result)
    result = await model.users.hasPendingUserMembership(tr, userIdx, groupIdx)
    t.true(result)
  }, ['users', 'group_reachable_cache'])
})

test('get all pending user membership users', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)
    const userIdx = await createUser(tr, model)
    const studentNumberIdx = await model.users.addStudentNumber(tr, userIdx, uuid())
    const membership = await model.users.addPendingUserMembership(tr, userIdx, groupIdx)

    const allPendingMembership = await model.users.getAllPendingMembershipUsers(tr, groupIdx)

    t.is(allPendingMembership.length, 1)
    t.is(allPendingMembership[0].idx, userIdx)
  }, ['users', 'group_reachable_cache'])
})

test('accept pending applications', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)

    const userIdx1 = await createUser(tr, model)
    const userIdx2 = await createUser(tr, model)
    const userIdx3 = await createUser(tr, model)
    await model.users.addStudentNumber(tr, userIdx1, uuid())
    await model.users.addStudentNumber(tr, userIdx2, uuid())
    await model.users.addStudentNumber(tr, userIdx3, uuid())

    await model.users.addUserMembership(tr, userIdx2, groupIdx)
    await model.users.addPendingUserMembership(tr, userIdx3, groupIdx)

    const result = await model.users.acceptUserMemberships(tr, groupIdx, [userIdx1, userIdx2, userIdx3])
    t.is(result, 1)

    const pendingMemberships = await model.users.getAllPendingMembershipUsers(tr, groupIdx)
    t.is(pendingMemberships.length, 0)

    const userMemberships = await model.users.getAllMembershipUsers(tr, groupIdx)
    t.deepEqual(userMemberships.map(g => g.idx).sort(), [userIdx2, userIdx3].sort())
  }, ['users', 'group_reachable_cache'])
})

test('reject pending applications', async t => {
  await model.pgDo(async tr => {
    const groupIdx = await createGroup(tr, model)

    const userIdx1 = await createUser(tr, model)
    const userIdx2 = await createUser(tr, model)
    const userIdx3 = await createUser(tr, model)
    await model.users.addStudentNumber(tr, userIdx1, uuid())
    await model.users.addStudentNumber(tr, userIdx2, uuid())
    await model.users.addStudentNumber(tr, userIdx3, uuid())

    await model.users.addUserMembership(tr, userIdx1, groupIdx)
    await model.users.addUserMembership(tr, userIdx2, groupIdx)
    await model.users.addPendingUserMembership(tr, userIdx3, groupIdx)

    const result = await model.users.rejectUserMemberships(tr, groupIdx, [userIdx2, userIdx3])
    t.is(result, 2)

    const pendingMemberships = await model.users.getAllPendingMembershipUsers(tr, groupIdx)
    t.is(pendingMemberships.length, 0)

    const userMemberships = await model.users.getAllMembershipUsers(tr, groupIdx)
    t.is(userMemberships.length, 1)
    t.deepEqual(userMemberships[0].idx, userIdx1)
  }, ['users', 'group_reachable_cache'])
})

test('change password', async t => {
  await model.pgDo(async tr => {
    const username = uuid()
    const password = uuid()
    const emailIdx = await model.emailAddresses.create(tr, uuid(), uuid())
    const userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')

    const newPassword = uuid()
    await model.users.changePassword(tr, userIdx, newPassword)

    await model.users.authenticate(tr, username, newPassword)
    t.pass()
  }, ['users'])
})

test('change password token request with identical email idx', async t => {
  await model.pgDo(async tr => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain)
    const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const oldToken = await model.users.generatePasswordChangeToken(tr, userIdx)
    const newToken = await model.users.generatePasswordChangeToken(tr, userIdx)

    const query = 'SELECT token FROM password_change_tokens WHERE user_idx = $1'
    const result = await tr.query(query, [userIdx])
    const token = result.rows[0].token
    t.is(newToken, token)
    t.not(oldToken, token)
  }, ['users'])
})

test('token expiration', async t => {
  await model.pgDo(async tr => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain)
    const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const token = await model.users.generatePasswordChangeToken(tr, userIdx)
    const expiryResult = await tr.query('SELECT expires FROM password_change_tokens WHERE token = $1', [token])
    const originalExpires = expiryResult.rows[0].expires

    const query = 'UPDATE password_change_tokens SET expires = $1 WHERE token = $2'
    let newExpiry = moment(originalExpires).subtract(12, 'hours').toDate()
    await tr.query(query, [newExpiry, token])
    await model.users.ensureTokenNotExpired(tr, token)

    newExpiry = moment(originalExpires).subtract(1, 'day').toDate()
    await tr.query(query, [newExpiry, token])

    try {
      await model.users.ensureTokenNotExpired(tr, token)
    } catch (e) {
      t.pass()
      return
    }

    t.fail()
  }, ['users'])
})

test('change user shell', async t => {
  await model.pgDo(async tr => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain)
    const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    const newShell = uuid()
    await model.shells.addShell(tr, newShell)
    await model.users.changeShell(tr, userIdx, newShell)

    const currentShell = await model.users.getShell(tr, userIdx)
    t.is(currentShell, newShell)
  }, ['users'])
})

test('reset resend count of expired password change token', async t => {
  await model.pgDo(async tr => {
    const emailIdx = await model.emailAddresses.create(tr, uuid(), uuid())
    const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    let token = await model.users.generatePasswordChangeToken(tr, userIdx)
    const expiryResult = await tr.query('SELECT expires FROM password_change_tokens WHERE token = $1', [token])
    const originalExpires = expiryResult.rows[0].expires
    const query = 'UPDATE password_change_tokens SET expires = $1, resend_count = 100 WHERE token = $2'
    const newExpiry = moment(originalExpires).subtract(2, 'day').toDate()
    await tr.query(query, [newExpiry, token])
    token = await model.users.generatePasswordChangeToken(tr, userIdx)

    const resendCount = await model.users.getResendCount(tr, token)
    t.is(resendCount, 1)
  }, ['users'])
})

test('legacy mssql password (sha512)', async t => {
  const username = 'good_old_doge'
  const password = 'dogepassword'
  const legacyPasswordDigest = phc.serialize({id: 'mssql-sha512',
    salt: Buffer.from('251C01B8', 'hex'),
    hash: Buffer.from('CF413665AC3A350E2F61EF6A8845B729CE771DD70E3FA2808C0F24CE3945A19A43F160087' +
      '60ED06D7AF5181986AC39563CE1356BA451468BD27F936FF5D1BAA9', 'hex')})
  await model.pgDo(async tr => {
    const result = await tr.query('INSERT INTO users (username, password_digest, name, uid, shell, ' +
      'preferred_language) VALUES ($1, $2, \'OLDoge\', 10, \'/bin/bash\', \'en\') RETURNING idx',
      [username, legacyPasswordDigest])
    const userIdx = result.rows[0].idx
    // doge should be able to login using password stored in old doggy password format
    await model.users.authenticate(tr, username, password)
    // doge should be automatically migrated to brand-new password format
    const selectResult: string = (await tr.query('SELECT password_digest FROM users WHERE username=$1',
      [username])).rows[0].password_digest
    t.is(selectResult.split('$')[1], 'argon2id')
    // doge should be able to login using password stored in brand-new password format. wow.
    await model.users.authenticate(tr, username, password)
    await model.users.delete(tr, userIdx)
  })
})
