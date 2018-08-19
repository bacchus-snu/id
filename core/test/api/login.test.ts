import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'

import createAPIServer from '../../src/api/server'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'
import { createEmailAddress } from '../test_utils'
import app from '../setup'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config.postgresql, log)

test('test login with credential', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

  await model.pgDo(async c => {
    username = uuid()
    password = uuid()
    const emailIdx = await createEmailAddress(c, model)
    userIdx = await model.users.create(
      c, username, password, uuid(), emailIdx, '/bin/bash', 'en')
  })

  const agent = request.agent(app)

  let response

  response = await agent.post('/api/login').send({
    username,
    password: 'doge!',
  })
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)
})

test('test checkLogin', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

  await model.pgDo(async c => {
    username = uuid()
    password = uuid()
    const emailIdx = await createEmailAddress(c, model)
    userIdx = await model.users.create(
      c, username, password, uuid(), emailIdx, '/bin/bash', 'en')
  })

  const agent = request.agent(app)

  let response

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 401)

  response = await agent.post('/api/login').send({
    username,
    password,
  })
  t.is(response.status, 200)

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 200)

  response = await agent.get('/api/logout').send()
  t.is(response.status, 200)

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 401)
})
