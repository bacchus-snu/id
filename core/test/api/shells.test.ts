import test from 'ava'
import * as request from 'supertest'

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

test('test getShells', async t => {
  let result
  await model.pgDo(async c => {
    await model.shells.addShell(c, 'dogeshell')
    result = await model.shells.getShells(c)
  })

  const agent = request.agent(app)

  let response

  response = await agent.get('/api/shells').send({})
  t.is(response.status, 200)
  t.true(response.body.shells.includes('dogeshell'))
})
