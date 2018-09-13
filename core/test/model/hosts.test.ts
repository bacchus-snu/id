import test from 'ava'
import * as uuid from 'uuid/v4'

import * as fs from 'fs'
import Model from '../../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../../src/config'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

test('add host and host group', async t => {
  const name = uuid()
  const host = '127.0.0.1'
  const hostGroupName = uuid()
  await model.pgDo(async c => {
    const hostIdx = await model.hosts.addHost(c, name, host)
    const query = 'SELECT idx FROM hosts WHERE host = $1'
    const result = await c.query(query, [host])
    t.is(result.rows[0].idx, hostIdx)
    let byInet = await model.hosts.getHostByInet(c, host)
    t.is(byInet.idx, hostIdx)

    const hostGroupIdx = await model.hosts.addHostGroup(c, hostGroupName)
    await model.hosts.addHostToGroup(c, hostIdx, hostGroupIdx)

    byInet = await model.hosts.getHostByInet(c, host)
    t.is(byInet.host, host)
    t.is(byInet.hostGroupIdx, hostGroupIdx)

    await model.hosts.deleteHost(c, hostIdx)
  })
})

test('host authorization', async t => {
  const name = uuid()
  const hostname = '127.0.0.2'
  const hostGroupName = uuid()
  const trans = { ko: uuid(), en: uuid() }
  await model.pgDo(async c => {
    const hostIdx = await model.hosts.addHost(c, name, hostname)
    const hostGroupIdx = await model.hosts.addHostGroup(c, hostGroupName)
    await model.hosts.addHostToGroup(c, hostIdx, hostGroupIdx)

    const permissionIdx = await model.permissions.create(c, trans, trans)
    const groupIdx = await model.groups.create(c, trans, trans)
    const userIdx = await model.users.create(c, uuid(), uuid(), uuid(), '/bin/bash', 'ko')
    await model.users.addUserMembership(c, userIdx, groupIdx)
    await model.permissions.addPermissionRequirement(c, groupIdx, permissionIdx)
    await model.hosts.setHostGroupPermission(c, hostGroupIdx, permissionIdx)

    const host = await model.hosts.getHostByInet(c, hostname)
    // should pass
    await model.hosts.authorizeUserByHost(c, userIdx, host)

    const newPermissionIdx = await model.permissions.create(c, trans, trans)
    await model.hosts.setHostGroupPermission(c, hostGroupIdx, newPermissionIdx)
    try {
      await model.hosts.authorizeUserByHost(c, userIdx, host)
    } catch (e) {
      t.pass()
      await model.hosts.deleteHost(c, hostIdx)
      return
    }
    await model.hosts.deleteHost(c, hostIdx)
    t.fail()
  })
})
