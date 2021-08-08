import Model from '../../model/model'
import { EmailAddress } from '../../model/email_addresses'
import { IMiddleware } from 'koa-router'
import Config from '../../config'
import { sendEmail } from '../email'
import { ResendLimitExeededError, InvalidEmailError } from '../../model/errors'
import changePasswordTemplate from '../templates/change_password_email_template'
import { jwtVerify } from 'jose/jwt/verify'
import { createPublicKey } from 'crypto'

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
      await model.pgDo(async tr => {
        emailAddress = await model.emailAddresses.getEmailAddressByToken(tr, token)
      })
    } catch (e) {
      ctx.status = 401
      return
    }

    const { username, name, password, preferredLanguage, studentNumbers } = body

    if (!username || !name || !password || !preferredLanguage ||
      !studentNumbers || studentNumbers.constructor !== Array || studentNumbers.length === 0) {
      ctx.status = 400
      return
    }

    // validates inputs
    if (!/^[a-z][a-z0-9]+$/.test(username) || username.length > 20) {
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

    try {
      // acquires access exclusive lock on 'users'
      await model.pgDo(async tr => {
        const emailAddressIdx = await model.emailAddresses.getIdxByAddress(tr, emailAddress.local, emailAddress.domain)
        const userIdx = await model.users.create(
          tr, username, password, name, config.posix.defaultShell, preferredLanguage)
        await model.emailAddresses.validate(tr, userIdx, emailAddressIdx)
        await model.emailAddresses.removeToken(tr, token)

        const validateStudentNumber = (snuid: string) => {
          const regexList = [
            /^\d\d\d\d\d-\d\d\d$/,
            /^\d\d\d\d-\d\d\d\d$/,
            /^\d\d\d\d-\d\d\d\d\d$/,
          ]
          for (const regex of regexList) {
            if (regex.test(snuid)) {
              return
            }
          }
          throw new Error('Invalid student number')
        }

        for (const studentNumber of studentNumbers) {
          validateStudentNumber(studentNumber)
          await model.users.addStudentNumber(tr, userIdx, studentNumber)
        }
      }, ['users'])
    } catch (e) {
      ctx.status = 400
      return
    }
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

    let { emailLocal, emailDomain } = body
    emailLocal = emailLocal.trim()
    emailDomain = emailDomain.trim()

    if (!emailLocal || !emailDomain) {
      ctx.status = 400
      return
    }

    let token = ''
    let resendCount = -1
    try {
      await model.pgDo(async tr => {
        const userIdx = await model.users.getUserIdxByEmailAddress(tr, emailLocal, emailDomain)
        token = await model.users.generatePasswordChangeToken(tr, userIdx)
        resendCount = await model.users.getResendCount(tr, token)
      })
    } catch (e) {
      // no such entry, but do nothing and just return 200
      ctx.status = 200
      return
    }

    try {
      const option = {
        address: `${emailLocal}@${emailDomain}`,
        token,
        subject: config.email.passwordChangeEmailSubject,
        url: config.email.passwordChangeEmailUrl,
        template: changePasswordTemplate,
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
      await model.pgDo(async tr => {
        const userIdx = await model.users.getUserIdxByPasswordToken(tr, token)
        await model.users.ensureTokenNotExpired(tr, token)
        const user = await model.users.getByUserIdx(tr, userIdx)
        if (user.username === null) {
          throw new Error()
        }
        await model.users.changePassword(tr, userIdx, newPassword)
        await model.users.removeToken(tr, token)
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

    let shell = ''
    try {
      await model.pgDo(async tr => {
        shell = await model.users.getShell(tr, userIdx)
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
      await model.pgDo(async tr => {
        await model.users.changeShell(tr, userIdx, shell)
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
      await model.pgDo(async tr => {
        const owner = await model.users.getByUsername(tr, username)
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
    await model.pgDo(async tr => {
      emails = await model.emailAddresses.getEmailsByOwnerIdx(tr, ownerIdx)
    })

    ctx.status = 200
    ctx.body = { emails }
    await next()
  }
}

export function getUserInfo(model: Model, config: Config): IMiddleware {
  return async (ctx, next) => {
    // authorize
    let userIdx: number
    const auth = ctx.header.authorization

    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const jwt = auth.substring('Bearer '.length)

      const key = createPublicKey(config.jwt.privateKey)
      try {
        const result = await jwtVerify(jwt, key, {
          algorithms: ['ES256'],
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          currentDate: new Date(),
        })

        if (typeof result.payload.userIdx === 'number') {
          userIdx = result.payload.userIdx
        } else {
          ctx.status = 400
          return
        }
      } catch (e) {
        ctx.status = 401
        return
      }
    } else if (ctx.session && ctx.session.userIdx && typeof ctx.session.userIdx === 'number') {
      userIdx = ctx.session.userIdx
    } else {
      ctx.status = 401
      return
    }

    try {
      const [user, studentNumbers, emails] = await model.pgDo(async tr => {
        return Promise.all([
          model.users.getByUserIdx(tr, userIdx),
          model.users.getStudentNumbersByUserIdx(tr, userIdx),
          model.emailAddresses.getEmailsByOwnerIdx(tr, userIdx),
        ])
      })

      ctx.status = 200
      ctx.body = {
        username: user.username,
        name: user.name,
        studentNumbers,
        emailAddresses: emails.map(({ local, domain }) => `${local}@${domain}`),
      }
    } catch (e) {
      // user not found??
      console.error(e)
      ctx.status = 500
      return
    }

    await next()
  }
}
