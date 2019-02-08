import test, { GenericTestContext } from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import { app, model, config } from '../setup'
import { createUser } from '../test_utils'

test('fetch passwd entries', async t => {
  const agent = request.agent(app)

  const expect = await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)
    const user = await model.users.getByUserIdx(tr, userIdx)
    return `${user.username}:x:${user.uid}:` +
           `${config.posix.userGroupGid}:${user.name}:` +
           `${config.posix.homeDirectoryPrefix}/${user.username}:` +
           `${user.shell}\n`
  }, ['users'])

  let response

  // No host
  response = await agent.get('/api/get-passwd').send()
  t.is(response.status, 401)

  const hostIdx = await model.pgDo(async tr => {
    tr.ensureHasAccessExclusiveLock('hosts')
    return await model.hosts.addHost(tr, 'test', '127.0.0.1')
  }, ['hosts'])

  // With host
  response = await agent.get('/api/get-passwd').send()
  t.is(response.status, 200)
  t.is(response.text, expect)

  // Cleanup
  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
  })
})
