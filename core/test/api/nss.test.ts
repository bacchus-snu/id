import test, { GenericTestContext } from 'ava'
import * as request from 'supertest'
import * as uuid from 'uuid/v4'
import { app, model, config } from '../setup'
import { createUser } from '../test_utils'

test.serial('fetch passwd entries', async t => {
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
  response = await agent.get('/api/nss/passwd')
  t.is(response.status, 401)

  // With host
  await model.pgDo(async tr => {
    return await model.hosts.addHost(tr, 'test', '127.0.0.1')
  })

  response = await agent.get('/api/nss/passwd')
  t.is(response.status, 200)
  t.true(response.text.includes(expect))

  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
  })
})

test.serial('fetch group entries', async t => {
  const agent = request.agent(app)

  let username = ''
  let expect = ''
  await model.pgDo(async tr => {
    const userIdx = await createUser(tr, model)
    const user = await model.users.getByUserIdx(tr, userIdx)
    if (user.username) {
      username = user.username
    }
    expect = `${config.posix.userGroupName}:x:${config.posix.userGroupGid}:`
  }, ['users'])

  let response

  // No host
  response = await agent.get('/api/nss/group')
  t.is(response.status, 401)

  // With host
  await model.pgDo(async tr => {
    return await model.hosts.addHost(tr, 'test', '127.0.0.1')
  })

  response = await agent.get('/api/nss/group')
  t.is(response.status, 200)
  t.true(response.text.startsWith(expect))
  t.true(response.text.split(':')[3].includes(username))

  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
  })
})

test.serial('test not-modified posix entries', async t => {
  const agent = request.agent(app)

  await model.pgDo(async tr => {
    return await model.hosts.addHost(tr, 'test', '127.0.0.1')
  })

  let response
  let lastMod

  response = await agent.get('/api/nss/passwd').send()
  t.is(response.status, 200)

  lastMod = response.header['last-modified']
  response = await agent.get('/api/nss/passwd').set('if-modified-since', lastMod)
  t.is(response.status, 304)

  response = await agent.get('/api/nss/group').send()
  t.is(response.status, 200)

  lastMod = response.header['last-modified']
  response = await agent.get('/api/nss/group').set('if-modified-since', lastMod)
  t.is(response.status, 304)

  await model.pgDo(async tr => {
    await tr.query('DELETE FROM hosts WHERE name = $1', ['test'])
  })
})
