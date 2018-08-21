import Model from '../../model/model'
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
    await model.pgDo(async c => {
      emailIdx = await model.emailAddresses.create(c, emailLocal, emailDomain)
      token = await model.emailAddresses.generateVerificationToken(c, emailIdx)
    })

    await sendEmail(`${emailLocal}@${emailDomain}`, token,  model.log)

    ctx.status = 200
    await next()
  }
}
