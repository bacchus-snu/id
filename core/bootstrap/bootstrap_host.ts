import * as fs from 'fs'
import Model from '../src/model/model'
import * as bunyan from 'bunyan'
import Config from '../src/config'

import { HARDWARE_LAB, SOFTWARE_LAB, LOUNGE, PRACTICE_SERVER } from './hosts_info'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
})

const model = new Model(config, log)

async function bootstrapHost() {
  await model.pgDo(async tr => {
    // hardware lab
    const hardwareLabIdx = await model.hosts.addHostGroup(tr, '하드웨어 실습실')
    for (const hostTemplate of HARDWARE_LAB) {
      const hostIdx = await model.hosts.addHost(tr, hostTemplate.name, hostTemplate.host)
      console.log(`Added ${hostTemplate.name}: ${hostTemplate.host}`)
      await model.hosts.addHostToGroup(tr, hostIdx, hardwareLabIdx)
    }

    // software lab
    const softwareLabIdx = await model.hosts.addHostGroup(tr, '소프트웨어 실습실')
    for (const hostTemplate of SOFTWARE_LAB) {
      const hostIdx = await model.hosts.addHost(tr, hostTemplate.name, hostTemplate.host)
      console.log(`Added ${hostTemplate.name}: ${hostTemplate.host}`)
      await model.hosts.addHostToGroup(tr, hostIdx, softwareLabIdx)
    }

    // lounge
    const loungeIdx = await model.hosts.addHostGroup(tr, '과방')
    for (const hostTemplate of LOUNGE) {
      const hostIdx = await model.hosts.addHost(tr, hostTemplate.name, hostTemplate.host)
      console.log(`Added ${hostTemplate.name}: ${hostTemplate.host}`)
      await model.hosts.addHostToGroup(tr, hostIdx, loungeIdx)
    }

    // practice server
    const serverIdx = await model.hosts.addHostGroup(tr, '실습 서버')
    for (const hostTemplate of PRACTICE_SERVER) {
      const hostIdx = await model.hosts.addHost(tr, hostTemplate.name, hostTemplate.host)
      console.log(`Added ${hostTemplate.name}: ${hostTemplate.host}`)
      await model.hosts.addHostToGroup(tr, hostIdx, serverIdx)
    }
  })
}

bootstrapHost().then(() => {
  console.log('Done!')
}).catch(() => {
  console.error('Fail!')
})
