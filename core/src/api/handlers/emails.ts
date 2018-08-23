import Model from '../../model/model'
import { EmailAddress } from '../../model/email_addresses'
import { IMiddleware } from 'koa-router'
import * as nodemailer from 'nodemailer'
import { sendEmail } from '../email'

export function sendVerificationEmail(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { emailLocal, emailDomain } = body

    if (!emailLocal || !emailDomain) {
      ctx.status = 400
      return
    }

    let emailIdx: number = -1
    let token: string = ''

    try {
      // create email address and generate token
      // TODO: expire unverificated email address
      await model.pgDo(async c => {
        emailIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
        token = await model.emailAddresses.generateVerificationToken(c, emailIdx)
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    try {
      // send email
      await sendEmail(`${emailLocal}@${emailDomain}`, token,  model.log)
    } catch (e) {
      // should I throw error?
      model.log.warn(`sending email to ${emailLocal}@${emailDomain} just failed.`)
    }

    ctx.status = 200
    await next()
  }
}

export function checkToken(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { token } = body
    let emailAddress: EmailAddress
    let result

    try {
      await model.pgDo(async c => {
        emailAddress = await model.emailAddresses.getEmailAddressByToken(c, token)
        await model.emailAddresses.ensureTokenNotExpired(c, token)
        result = {
          emailLocal: emailAddress.local,
          emailDomain: emailAddress.domain,
        }
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    if (ctx.session) {
      ctx.session.verificationToken = token
    } else {
      ctx.status = 500
      return
    }

    ctx.status = 200
    ctx.body = result

    await next()
  }
}
