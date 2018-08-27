import * as nodemailer from 'nodemailer'
import Config from '../config'
import * as Bunyan from 'bunyan'
import * as fs from 'fs'

export async function sendEmail(emailAddrsss: string, token: string,
  subject: string, url: string, template: string, logger: Bunyan, config: Config) {
  if (config === null) {
    logger.warn('No config, so the verification email will not be sent.')
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
  const tokenAddress = `${url}?token=${token}`

  const messageOption = {
    from: config.email.username,
    to: emailAddrsss,
    subject,
    html: template.replace('VERIFICATION_LINK', tokenAddress),
  }

  // should we have to await this promise?
  await transporter.sendMail(messageOption)
}
