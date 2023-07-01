import { strict as assert } from 'node:assert'

import Router from 'koa-router'
// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type OIDCProvider from 'oidc-provider'
import * as z from 'zod'

import OIDCAccount from './account'
import Model from '../model/model'

const loginSchema = z.object({
  username: z.string().nonempty(),
  password: z.string().nonempty(),
})
const paramsSchema = z.object({
  client_id: z.string(),
})
const detailsSchema = z.object({
  missingOIDCScope: z.optional(z.array(z.string())),
  missingOIDCClaims: z.optional(z.array(z.string())),
  missingResourceScopes: z.optional(z.record(z.array(z.string()))),
})

export default (model: Model, provider: OIDCProvider) => {
  const router = new Router()

  router.use(async (ctx, next) => {
    const { errors } = await import('oidc-provider')

    ctx.set('cache-control', 'no-store')
    try {
      await next()
    } catch (err) {
      if (err instanceof errors.SessionNotFound) {
        ctx.status = err.status
        const { message: error, error_description: desc } = err
        ctx.body = { error, desc }
      } else {
        throw err
      }
    }
  })

  router.post('/interaction/:uid/login', async ctx => {
    const { prompt: { name } } = await provider.interactionDetails(ctx.req, ctx.res)
    assert.equal(name, 'login')
    const login = loginSchema.parse(ctx.body)

    const account = await OIDCAccount.findByLogin(model, login.username, login.password)

    const result = {
      login: {
        accountId: account.accountId,
      },
    }

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    })
  })

  router.post('/interaction/:uid/confirm', async ctx => {
    const interactionDetails = await provider.interactionDetails(ctx.req, ctx.res)
    const {
      prompt: {
        name,
        details: detailsRaw,
      },
      params: paramsRaw,
      session: { accountId } = { accountId: '' },
    } = interactionDetails
    const params = paramsSchema.parse(paramsRaw)
    const details = detailsSchema.parse(detailsRaw)
    assert.equal(name, 'consent')

    let { grantId } = interactionDetails
    let grant: InstanceType<typeof provider.Grant>

    if (grantId) {
      // we'll be modifying existing grant in existing session
      const tempGrant = await provider.Grant.find(grantId)
      if (tempGrant == null) {
        throw new TypeError('')
      }
      grant = tempGrant
    } else {
      // we're establishing a new grant
      grant = new provider.Grant({
        accountId,
        clientId: params.client_id,
      })
    }

    if (details.missingOIDCScope) {
      grant.addOIDCScope(details.missingOIDCScope.join(' '))
    }
    if (details.missingOIDCClaims) {
      grant.addOIDCClaims(details.missingOIDCClaims)
    }
    if (details.missingResourceScopes) {
      for (const [indicator, scope] of Object.entries(details.missingResourceScopes)) {
        grant.addResourceScope(indicator, scope.join(' '))
      }
    }

    grantId = await grant.save()

    const consent = { grantId: '' }
    if (!interactionDetails.grantId) {
      // we don't have to pass grantId to consent, we're just modifying existing one
      consent.grantId = grantId
    }

    const result = { consent }
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: true,
    })
  })

  router.get('/interaction/:uid/abort', async ctx => {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction',
    }

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    })
  })

  return router
}
