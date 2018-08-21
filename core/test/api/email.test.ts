import * as nodemailer from 'nodemailer'
import test from 'ava'
import Config from '../../src/config'
import * as fs from 'fs'

const config: Config = JSON.parse(fs.readFileSync('config.test.json', {encoding: 'utf-8'}))

test.skip('email configuration is correct', async t => {
  const emailOption = {
    host: config.email.host,
    port: 465,
    secure: true,
    auth: {
      user: config.email.username,
      pass: config.email.password,
    },
  }
  const transport = nodemailer.createTransport(emailOption)
  await transport.verify()
  t.pass()
})
