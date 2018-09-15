import test from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import { app, model } from '../setup'

test('test getShells', async t => {
  let result
  const newShell = uuid()
  await model.pgDo(async c => {
    await model.shells.addShell(c, newShell)
    result = await model.shells.getShells(c)
  })

  const agent = request.agent(app)

  const response = await agent.get('/api/shells').send({})
  t.is(response.status, 200)
  t.true(response.body.shells.includes(newShell))
})
