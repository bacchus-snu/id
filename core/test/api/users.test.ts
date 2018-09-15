import test, { GenericTestContext } from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import * as crypto from 'crypto'
import { app, model, config } from '../setup'

test('create user step by step', async t => {
  const agent = request.agent(app)

  let response
  const emailLocal = uuid()
  const emailDomain = 'snu.ac.kr'
  const username = 'a' + crypto.randomBytes(4).toString('hex')
  const password = uuid()
  const name = uuid()
  const preferredLanguage = 'en'
  const studentNumbers = [
    '1111-11111',
    '11111-111',
    '1111-1111',
  ]

  response = await agent.post('/api/email/verify').send({
    emailLocal,
    emailDomain,
  })
  t.is(response.status, 200)

  let token: string = ''
  await model.pgDo(async tr => {
    const idx = await model.emailAddresses.getIdxByAddress(tr, emailLocal, emailDomain)
    const result = await tr.query('SELECT token FROM email_verification_tokens WHERE email_idx = $1', [idx])
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

  await model.pgDo(async tr => {
    await tr.query('TRUNCATE student_numbers')
  })
})

test('get user email addresses', async t => {
  const username = uuid()
  const password = uuid()
  let userIdx

  await model.pgDo(async tr => {
    const emailIdx1 = await model.emailAddresses.create(tr, uuid(), uuid())
    const emailIdx2 = await model.emailAddresses.create(tr, uuid(), uuid())

    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(tr, userIdx, emailIdx1)
    await model.emailAddresses.validate(tr, userIdx, emailIdx2)
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

  await model.pgDo(async tr => {
    const emailIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain)
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(tr, userIdx, emailIdx)
  })

  const agent = request.agent(app)

  let response

  response = await agent.post('/api/user/send-password-token').send({
    emailLocal,
    emailDomain,
  })
  t.is(response.status, 200)

  let token
  await model.pgDo(async tr => {
    const result = await tr.query('SELECT token FROM password_change_tokens WHERE user_idx = $1', [userIdx])
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

  await model.pgDo(async tr => {
    await model.users.authenticate(tr, username, newPassword)
  })

  t.pass()
})

test('change shell', async t => {
  const username = uuid()
  const password = uuid()
  const newShell = uuid()
  let userIdx = -1

  await model.pgDo(async tr => {
    const emailIdx = await model.emailAddresses.create(tr, uuid(), uuid())
    userIdx = await model.users.create(tr, username, password, uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(tr, userIdx, emailIdx)
    await model.shells.addShell(tr, newShell)
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

  await model.pgDo(async tr => {
    emailIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain)
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

  await model.pgDo(async tr => {
    emailIdx = await model.emailAddresses.create(tr, emailLocal, emailDomain)
    const userIdx = await model.users.create(tr, uuid(), uuid(), uuid(), '/bin/bash', 'en')
    await model.emailAddresses.validate(tr, userIdx, emailIdx)
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

{
  const NUMBER_OF_USERS_TO_CREATE = 100
  test('multiple user creation', async t => {
    const promises: Array<Promise<void>> = []
    const indices: Array<number> = []
    let count = 0

    for (let i = 0; i < NUMBER_OF_USERS_TO_CREATE; i++) {
      promises[i] = model.pgDo(async tr => {
        indices[i] = await model.users.create(tr, i.toString(), 'password' + i, i.toString(), '/bin/bash', 'en')
      }).then(async () => {
        count++
        if (count === NUMBER_OF_USERS_TO_CREATE) {
          await verifyResult(t, indices)
          await cleanUpUsers(t, indices)
        }
      }).catch(reason => {
        throw reason
      })
    }

    await Promise.all(promises)
  })

  async function verifyResult<T>(t: GenericTestContext<T>, indcies: Array<number>) {
    for (let i = 0; i < NUMBER_OF_USERS_TO_CREATE; i++) {
      await model.pgDo(async tr => {
        const user = await model.users.getByUserIdx(tr, indcies[i])
        t.is(user.name, i.toString())
      })
    }
  }

  async function cleanUpUsers<T>(t: GenericTestContext<T>, indices: Array<number>) {
    for (let i = 0; i < NUMBER_OF_USERS_TO_CREATE; i++) {
      await model.pgDo(async tr => {
        await model.users.delete(tr, indices[i])
      })
    }
  }
}
