import * as nodemailer from 'nodemailer'
import Config from '../config'
import * as Bunyan from 'bunyan'
import * as fs from 'fs'
import { ResendLimitExeededError } from '../model/errors'

export interface EmailOption {
  address: string
  token: string
  subject: string
  url: string
  template: string
  resendCount: number
}

export function sanitizeEmail(emailLocal: string) {
  const clean = emailLocal.trim().toLowerCase()
  if (!/^[a-z0-9\-_\.]+$/i.test(clean)) {
    // throw "InvalidEmailError"?
    return ''
  }
  return clean
}

export async function sendEmail(opt: EmailOption, logger: Bunyan, config: Config) {
  if (config === null) {
    logger.warn('No config, so the verification email will not be sent.')
    return
  }

  const { address, token, subject, url, template, resendCount } = opt

  if (resendCount >= config.email.resendLimit) {
    throw new ResendLimitExeededError()
  }

  const transporterOption = {
    host: config.email.host,
    port: 465,
    secure: true,
    auth: {
      user: config.email.username,
      pass: config.email.password,
    },
    logger: logger ? logger : false,
  }

  const transporter = nodemailer.createTransport(transporterOption)
  const tokenAddress = `${url}?token=${token}`

  const messageOption = {
    from: config.email.username,
    to: address,
    subject,
    html: template.replace('VERIFICATION_LINK', tokenAddress),
  }

  // should we have to await this promise?
  await transporter.sendMail(messageOption)
}
