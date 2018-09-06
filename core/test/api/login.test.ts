import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import * as moment from 'moment'

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

test('test login with credential', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

  await model.pgDo(async c => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      c, username, password, uuid(), '/bin/bash', 'en')
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

  await model.pgDo(async c => {
    const query = 'SELECT last_login_at FROM users WHERE idx = $1'
    const result = await c.query(query, [userIdx])
    const lastLogin = moment(result.rows[0].last_login_at)
    t.true(lastLogin.isBetween(moment().subtract(10, 'seconds'), moment().add(10, 'seconds')))
  })
})

test('test checkLogin', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

  await model.pgDo(async c => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      c, username, password, uuid(), '/bin/bash', 'en')
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
  t.is(response.body.username, username)

  response = await agent.get('/api/logout').send()
  t.is(response.status, 200)

  response = await agent.get('/api/check-login').send()
  t.is(response.status, 401)
})

test('test legacy login', async t => {
  let username: string = ''
  let password: string = ''
  let userIdx: number = -1

  await model.pgDo(async c => {
    username = uuid()
    password = uuid()
    userIdx = await model.users.create(
      c, username, password, uuid(), '/bin/bash', 'en')
  })

  const agent = request.agent(app)

  let response

  response = await agent.post('/Authentication/Login.aspx').send({
    member_account: username,
    member_password: 'doge!',
  })
  t.is(response.status, 200)

  response = await agent.post('/Authentication/Login.aspx').send({
    member_account: username,
    member_password: password,
  })
  t.is(response.status, 302)
})
