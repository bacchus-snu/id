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
  const emailDomain = uuid()
  const username = 'a' + crypto.randomBytes(4).toString('hex')
  const password = uuid()
  const name = uuid()
  const preferredLanguage = 'en'

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
  })
  t.is(response.status, 400)

  // test validation check
  response = await agent.post('/api/user').send({
    username: 'a' + crypto.randomBytes(32).toString('hex'),
    password,
    name,
    preferredLanguage,
  })
  t.is(response.status, 400)

  response = await agent.post('/api/user').send({
    username,
    password: 'asdf',
    name,
    preferredLanguage,
  })
  t.is(response.status, 400)

  response = await agent.post('/api/user').send({
    username,
    password,
    name,
    preferredLanguage,
  })
  t.is(response.status, 201)
})
