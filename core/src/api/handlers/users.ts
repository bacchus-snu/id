import Model from '../../model/model'
import { EmailAddress } from '../../model/email_addresses'
import { IMiddleware } from 'koa-router'
import Config from '../../config'
import { sendEmail } from '../email'
import changePasswordTemplate from '../templates/change_password_email_template'

export function createUser(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    if (!ctx.session) {
      ctx.status = 500
      return
    }

    if (!ctx.session.verificationToken) {
      ctx.status = 401
      return
    }

    const token = ctx.session.verificationToken
    let emailAddress: EmailAddress

    // check verification token
    try {
      await model.pgDo(async c => {
        emailAddress = await model.emailAddresses.getEmailAddressByToken(c, token)
      })
    } catch (e) {
      ctx.status = 401
      return
    }

    const { username, name, password, preferredLanguage } = body

    if (!username || !name || !password || !preferredLanguage) {
      ctx.status = 400
      return
    }

    // validates inputs
    if (!/^[a-z][a-z0-9_]+$/.test(username) || username.length > 20) {
      ctx.status = 400
      return
    }

    if (password.length < 8) {
      ctx.status = 400
      return
    }

    if (!(['ko', 'en'].includes(preferredLanguage))) {
      ctx.status = 400
      return
    }

    await model.pgDo(async c => {
      const emailAddressIdx = await model.emailAddresses.getIdxByAddress(c, emailAddress.local, emailAddress.domain)
      const userIdx = await model.users.create(
        c, username, password, name, emailAddressIdx, config.posix.defaultShell, preferredLanguage)
      await model.emailAddresses.validate(c, userIdx, emailAddressIdx)
      await model.emailAddresses.removeToken(c, token)
    })
    ctx.status = 201
    ctx.session.verificationToken = null
    await next()
  }
}

export function sendChangePasswordEmail(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    if (!ctx.session) {
      ctx.status = 400
      return
    }

    const { emailLocal, emailDomain } = body

    if (!emailLocal || !emailDomain) {
      ctx.status = 400
      return
    }

    let token = ''
    try {
      await model.pgDo(async c => {
        const userIdx = await model.users.getUserIdxByEmailAddress(c, emailLocal, emailDomain)
        token = await model.users.generatePasswordChangeToken(c, userIdx)
      })
    } catch (e) {
      // no such entry, but do nothing and just return 200
      ctx.status = 200
      return
    }

    try {
      await sendEmail(`${emailLocal}@${emailDomain}`, token, config.email.passwordChangeEmailSubject,
        config.email.passwordChangeEmailUrl, changePasswordTemplate,  model.log, config)
    } catch (e) {
      model.log.warn(`sending email to ${emailLocal}@${emailDomain} just failed.`)
    }

    ctx.status = 200
    await next()
  }
}

export function changePassword(model: Model): IMiddleware {
  return async (ctx, next) => {
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    if (!ctx.session) {
      ctx.status = 500
      return
    }

    const { newPassword, token } = body

    if (!newPassword || !token) {
      ctx.status = 400
      return
    }

    if (newPassword.length < 8) {
      ctx.status = 400
      return
    }

    try {
      // check token validity
      await model.pgDo(async c => {
        const userIdx = await model.users.getUserIdxByPasswordToken(c, token)
        await model.users.ensureTokenNotExpired(c, token)
        const user = await model.users.getByUserIdx(c, userIdx)
        if (user.username === null) {
          throw new Error()
        }
        await model.users.changePassword(c, userIdx, newPassword)
        await model.users.removeToken(c, token)
      })
    } catch (e) {
      ctx.status = 401
      return
    }

    ctx.status = 200
    await next()
  }
}

export function getUserShell(model: Model): IMiddleware {
  return async (ctx, next) => {
    // authorize
    if (!ctx.session || !ctx.session.userIdx) {
      ctx.status = 401
      return
    }

    const userIdx = ctx.session.userIdx

    let shell: string = ''
    try {
      await model.pgDo(async c => {
        shell = await model.users.getShell(c, userIdx)
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    ctx.status = 200
    ctx.body = {
      shell,
    }
    await next()
  }
}

export function changeUserShell(model: Model): IMiddleware {
  return async (ctx, next) => {
    // authorize
    if (!ctx.session || !ctx.session.userIdx) {
      ctx.status = 401
      return
    }

    const userIdx = ctx.session.userIdx
    const body: any = ctx.request.body

    if (body == null || typeof body !== 'object') {
      ctx.status = 400
      return
    }

    const { shell } = body

    if (!shell || typeof shell !== 'string') {
      ctx.status = 400
      return
    }

    try {
      await model.pgDo(async c => {
        await model.users.changeShell(c, userIdx, shell)
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    ctx.status = 200
    await next()
  }
}

export function getUserEmails(model: Model): IMiddleware {
  return async (ctx, next) => {
    // authorize
    if (!ctx.session || !ctx.session.username) {
      ctx.status = 401
      return
    }

    const username = ctx.session.username

    let ownerIdx: any
    try {
      await model.pgDo(async c => {
        const owner = await model.users.getByUsername(c, username)
        ownerIdx = owner.idx
      })
    } catch (e) {
      ctx.status = 400
      return
    }

    if (!ownerIdx) {
      ctx.status = 400
      return
    }

    let emails
    await model.pgDo(async c => {
      emails = await model.emailAddresses.getEmailsByOwnerIdx(c, ownerIdx)
    })

    ctx.status = 200
    ctx.body = { emails }
    await next()
  }
}
