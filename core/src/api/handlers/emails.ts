import Model from '../../model/model'
import Config from '../../config'
import { EmailAddress } from '../../model/email_addresses'
import { IMiddleware } from 'koa-router'
import { EmailOption, sendEmail } from '../email'
import { ResendLimitExeededError, InvalidEmailError } from '../../model/errors'
import emailVerificationTemplate from '../templates/verification_email_template'

export function sendVerificationEmail(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    let { emailLocal, emailDomain } = body
    emailLocal = emailLocal.trim()
    emailDomain = emailDomain.trim()

    if (!emailLocal || !emailDomain) {
      ctx.status = 400
      return
    }

    if (emailDomain !== 'snu.ac.kr') {
      ctx.status = 400
      return
    }

    let emailIdx: number = -1
    let token: string = ''
    let resendCount: number = -1

    try {
      // create email address and generate token
      await model.pgDo(async c => {
        emailIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
        const isValidated = await model.emailAddresses.isValidatedEmail(c, emailIdx)
        if (isValidated) {
          throw new Error('already validated')
        }
        token = await model.emailAddresses.generateVerificationToken(c, emailIdx)
        resendCount = await model.emailAddresses.getResendCount(c, token)
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    try {
      // send email
      const option = {
        address: `${emailLocal}@${emailDomain}`,
        token,
        subject: config.email.verificationEmailSubject,
        url: config.email.verificationEmailUrl,
        template: emailVerificationTemplate,
        resendCount,
      }
      await sendEmail(option,  model.log, config)
    } catch (e) {
      if (e instanceof ResendLimitExeededError || e instanceof InvalidEmailError) {
        ctx.status = 400
        return
      }
      model.log.warn(`sending email to ${emailLocal}@${emailDomain} just failed.`)
    }

    ctx.status = 200
    await next()
  }
}

export function checkVerificationEmailToken(model: Model): IMiddleware {
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
