import test from 'ava'

import * as fs from 'fs'
import * as moment from 'moment'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { Translation } from '../../src/model/translation'
import { NoSuchEntryError, AuthenticationError } from '../../src/model/errors'
import * as uuid from 'uuid/v4'

import { createEmailAddress, createUser } from '../test_utils'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

test('create extra email', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)
    const emailAddressIdx = await createEmailAddress(c, model)

    await model.emailAddresses.validate(c, userIdx, emailAddressIdx)

    const query = 'SELECT * FROM email_addresses WHERE idx = $1'
    const result = await c.query(query, [emailAddressIdx])
    t.is(result.rows[0].owner_idx, userIdx)
  })
})

test('generate verification token', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)
    const emailAddressIdx = await createEmailAddress(c, model)
    await model.emailAddresses.generateVerificationToken(c, emailAddressIdx)

    const query = 'SELECT * FROM email_verification_tokens WHERE email_idx = $1'
    const result = await c.query(query, [emailAddressIdx])
    t.is(result.rows.length, 1)
  })
})

test('get email address by token', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    await model.emailAddresses.generateVerificationToken(c, emailAddressIdx)

    const tokenResult = await c.query('SELECT * FROM email_verification_tokens WHERE email_idx = $1', [emailAddressIdx])
    const token: string = tokenResult.rows[0].token

    const result = await model.emailAddresses.getEmailAddressByToken(c, token)

    t.is(result.local, emailLocal)
    t.is(result.domain, emailDomain)
  })
})

test('identical address should not create new row', async t => {
  await model.pgDo(async c => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const newEmailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)

    t.is(emailAddressIdx, newEmailAddressIdx)

    const upperCasedIdx = await model.emailAddresses.create(c, emailLocal.toUpperCase(), emailDomain.toUpperCase())

    t.is(emailAddressIdx, upperCasedIdx)
  })
})

test('verification token request with identical email idx', async t => {
  await model.pgDo(async c => {
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const oldToken = await model.emailAddresses.generateVerificationToken(c, emailAddressIdx)
    const newToken = await model.emailAddresses.generateVerificationToken(c, emailAddressIdx)

    const query = 'SELECT token FROM email_verification_tokens WHERE email_idx = $1'
    const result = await c.query(query, [emailAddressIdx])
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
    const token = await model.emailAddresses.generateVerificationToken(c, emailAddressIdx)
    const expiryResult = await c.query('SELECT expires FROM email_verification_tokens WHERE token = $1', [token])
    const originalExpires = expiryResult.rows[0].expires

    const query = 'UPDATE email_verification_tokens SET expires = $1 WHERE token = $2'
    let newExpiry = moment(originalExpires).subtract(12, 'hours').toDate()
    await c.query(query, [newExpiry, token])
    await model.emailAddresses.ensureTokenNotExpired(c, token)

    newExpiry = moment(originalExpires).subtract(1, 'day').toDate()
    await c.query(query, [newExpiry, token])

    try {
      await model.emailAddresses.ensureTokenNotExpired(c, token)
    } catch (e) {
      t.pass()
      return
    }

    t.fail()
  })
})

test('get user emails', async t => {
  await model.pgDo(async c => {
    const userIdx = await createUser(c, model)
    const emailLocal = uuid()
    const emailDomain = uuid()
    const emailAddressIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const emailAddressIdx2 = await createEmailAddress(c, model)

    await model.emailAddresses.validate(c, userIdx, emailAddressIdx)
    await model.emailAddresses.validate(c, userIdx, emailAddressIdx2)

    const result = await model.emailAddresses.getEmailsByOwnerIdx(c, userIdx)
    t.is(result.length, 2)
    t.is(result[0].local, emailLocal)
    t.is(result[0].domain, emailDomain)
  })
})

test('reset resend count of expired verification token', async t => {
  await model.pgDo(async c => {
    const emailIdx = await model.emailAddresses.create(c, uuid(), uuid())
    const token = await model.emailAddresses.generateVerificationToken(c, emailIdx)
    const expiryResult = await c.query('SELECT expires FROM email_verification_tokens WHERE token = $1', [token])
    const originalExpires = expiryResult.rows[0].expires
    const query = 'UPDATE email_verification_tokens SET expires = $1, resend_count = 100 WHERE token = $2'
    const newExpiry = moment(originalExpires).subtract(2, 'day').toDate()
    await c.query(query, [newExpiry, token])
    await model.emailAddresses.resetResendCountIfExpired(c, emailIdx)

    const resendCount = await model.emailAddresses.getResendCount(c, token)
    t.is(resendCount, 0)
  })
})
