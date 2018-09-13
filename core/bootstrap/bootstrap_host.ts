import * as fs from 'fs'
import Model from '../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../src/config'

import { HARDWARE_LAB, SOFTWARE_LAB, LOUNGE } from './hosts_info'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

async function bootstrapHost() {
  await model.pgDo(async c => {
    // hardware lab
    const hardwareLabIdx = await model.hosts.addHostGroup(c, '하드웨어 실습실')
    for (const hostTemplate of HARDWARE_LAB) {
      const hostIdx = await model.hosts.addHost(c, hostTemplate.name, hostTemplate.host)
      await model.hosts.addHostToGroup(c, hostIdx, hardwareLabIdx)
    }

    // software lab
    const softwareLabIdx = await model.hosts.addHostGroup(c, '소프트웨어 실습실')
    for (const hostTemplate of SOFTWARE_LAB) {
      const hostIdx = await model.hosts.addHost(c, hostTemplate.name, hostTemplate.host)
      await model.hosts.addHostToGroup(c, hostIdx, softwareLabIdx)
    }

    // lounge
    const loungeIdx = await model.hosts.addHostGroup(c, '과방')
    for (const hostTemplate of LOUNGE) {
      const hostIdx = await model.hosts.addHost(c, hostTemplate.name, hostTemplate.host)
      await model.hosts.addHostToGroup(c, hostIdx, loungeIdx)
    }
  })
}
