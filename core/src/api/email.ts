import * as nodemailer from 'nodemailer'
import Config from '../config'
import * as Bunyan from 'bunyan'
import * as fs from 'fs'
import htmlTemplate from './verification_email_template'

let config: Config | null
try {
  config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf-8'}))
} catch (e) {
  config =  null
}

export async function sendEmail(emailAddrsss: string, token: string, logger: Bunyan) {
  if (config === null) {
    logger.warn('No config.json, so the verification email will not be sent.')
    return
  }

  const emailOption = {
    host: config.email.host,
    port: 465,
    secure: true,
    auth: {
      user: config.email.username,
      pass: config.email.password,
    },
    logger: logger ? logger : false,
  }

  const transporter = nodemailer.createTransport(emailOption)
  const tokenAddress = `https://id.snucse.org/sign-up?token=${token}`

  const messageOption = {
    from: config.email.username,
    to: emailAddrsss,
    subject: config.email.subject,
    html: htmlTemplate.replace('VERIFICATION_LINK', tokenAddress),
  }

  // should we have to await this promise?
  await transporter.sendMail(messageOption)
}
