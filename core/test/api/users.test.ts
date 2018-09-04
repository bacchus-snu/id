import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import * as crypto from 'crypto'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import app from '../setup'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config.postgresql, log)

test('create user step by step', async t => {
  const agent = request.agent(app)

  let response
  const emailLocal = uuid()
  const emailDomain = 'snu.ac.kr'
  const username = 'a' + crypto.randomBytes(4).toString('hex')
  const password = uuid()
  const name = uuid()
  const preferredLanguage = 'en'
  const studentNumbers = [uuid(), uuid()]

  response = await agent.post('/api/email/verify').send({
    emailLocal,
    emailDomain,
  })
  t.is(response.status, 200)

  let token: string = ''
  await model.pgDo(async c => {
    const idx = await model.emailAddresses.getIdxByAddress(c, emailLocal, emailDomain)
    const result = await c.query('SELECT token FROM email_verification_tokens WHERE email_idx = $1', [idx])
    token = result.rows[0].token
  })

  response = await agent.post('/api/user').send({
    username,
    password,
    name,
    preferredLanguage,
    studentNumbers,
  })
  // request without session token will be fail
  t.is(response.status, 401)

  response = await agent.post('/api/email/check-token').send({
    token,
  })
  t.is(response.status, 200)

  // test validation check
  response = await agent.post('/api/user').send({
    username: '0abcdefghijk',
    password,
    name,
    preferredLanguage,
    studentNumbers,
  })
  t.is(response.status, 400)

  // test validation check
  response = await agent.post('/api/user').send({
    username: 'a' + crypto.randomBytes(32).toString('hex'),
    password,
    name,
    preferredLanguage,
    studentNumbers,
  })
  t.is(response.status, 400)

  response = await agent.post('/api/user').send({
    username,
    password: 'asdf',
    name,
    preferredLanguage,
    studentNumbers,
  })
  t.is(response.status, 400)

  response = await agent.post('/api/user').send({
    username,
    password,
    name,
    preferredLanguage,
  })
  t.is(response.status, 400)

  response = await agent.post('/api/user').send({
    username,
    password,
    name,
    preferredLanguage,
    studentNumbers,
  })
  t.is(response.status, 201)
})

test('get user email addresses', async t => {
  const username = uuid()
  const password = uuid()
  let userIdx

  await model.pgDo(async c => {
    const emailIdx1 = await model.emailAddresses.create(c, uuid(), uuid())
    const emailIdx2 = await model.emailAddresses.create(c, uuid(), uuid())

    userIdx = await model.users.create(c, username, password, uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(c, userIdx, emailIdx1)
    await model.emailAddresses.validate(c, userIdx, emailIdx2)
  })

  const agent = request.agent(app)

  let response

  response = await agent.get('/api/user/emails').send({})
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)

  response = await agent.get('/api/user/emails').send({})
  t.is(response.status, 200)
  t.is(response.body.emails.length, 2)
})

test('change password', async t => {
  const username = uuid()
  const password = uuid()
  const emailLocal = uuid()
  const emailDomain = uuid()
  let userIdx = -1

  await model.pgDo(async c => {
    const emailIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    userIdx = await model.users.create(c, username, password, uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(c, userIdx, emailIdx)
  })

  const agent = request.agent(app)

  let response

  response = await agent.post('/api/user/send-password-token').send({
    emailLocal,
    emailDomain,
  })
  t.is(response.status, 200)

  let token
  await model.pgDo(async c => {
    const result = await c.query('SELECT token FROM password_change_tokens WHERE user_idx = $1', [userIdx])
    t.is(result.rows.length, 1)
    token = result.rows[0].token
  })

  const newPassword = uuid()
  response = await agent.post('/api/user/change-password').send({
    newPassword,
    token: 'doge',
  })
  t.is(response.status, 401)

  response = await agent.post('/api/user/change-password').send({
    newPassword,
    token,
  })
  t.is(response.status, 200)

  await model.pgDo(async c => {
    await model.users.authenticate(c, username, newPassword)
  })

  t.pass()
})

test('change shell', async t => {
  const username = uuid()
  const password = uuid()
  const newShell = uuid()
  let userIdx = -1

  await model.pgDo(async c => {
    const emailIdx = await model.emailAddresses.create(c, uuid(), uuid())
    userIdx = await model.users.create(c, username, password, uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(c, userIdx, emailIdx)
    await model.shells.addShell(c, newShell)
  })

  const agent = request.agent(app)

  let response

  response = await agent.get('/api/user/shell').send()
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)

  response = await agent.post('/api/user/shell').send({
    shell: newShell,
  })
  t.is(response.status, 200)

  response = await agent.get('/api/user/shell').send({})
  t.is(response.body.shell, newShell)
})

test('verification email resend limit', async t => {
  const emailLocal = uuid()
  const emailDomain = 'snu.ac.kr'
  const resendLimit = config.email.resendLimit
  let emailIdx = -1

  await model.pgDo(async c => {
    emailIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
  })

  const agent = request.agent(app)
  let response

  for (let i = 0; i < resendLimit; i++) {
    response = await agent.post('/api/email/verify').send({
      emailLocal,
      emailDomain,
    })
    t.is(response.status, 200)
  }

  response = await agent.post('/api/email/verify').send({
    emailLocal,
    emailDomain,
  })
  t.is(response.status, 400)
})

test('password change email resend limit', async t => {
  const emailLocal = uuid()
  const emailDomain = 'snu.ac.kr'
  const resendLimit = config.email.resendLimit
  let emailIdx = -1

  await model.pgDo(async c => {
    emailIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
    const userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(c, userIdx, emailIdx)
  })

  const agent = request.agent(app)
  let response

  for (let i = 0; i < resendLimit; i++) {
    response = await agent.post('/api/user/send-password-token').send({
      emailLocal,
      emailDomain,
    })
    t.is(response.status, 200)
  }

  response = await agent.post('/api/user/send-password-token').send({
    emailLocal,
    emailDomain,
  })
  t.is(response.status, 400)
})
