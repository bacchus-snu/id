// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Configuration } from 'oidc-provider'
import type Model from '../model/model'
import Config from '../config'
import OIDCAccount from './account'
import AdapterFactory from './adapter'

const claims = {
  openid: ['sub', 'groups', 'username'],
}

export default function createOIDCConfig(model: Model, oidcConfig: Config['oidc']): Configuration {
  let adapter
  if (oidcConfig.redisURL) {
    adapter = AdapterFactory(oidcConfig.redisURL, model)
  }

  return {
    adapter,
    findAccount: async (ctx, id) => {
      const [groups, username] = await model.pgDo(async tr => {
        const groupSet = await model.users.getUserReachableGroups(tr, Number(id))
        const groupResult = await tr.query('SELECT identifier FROM groups WHERE idx = ANY($1)', [[...groupSet]])
        const groups = groupResult.rows.map(r => r.identifier)

        const userResult = await model.users.getByUserIdx(tr, Number(id))
        if (userResult.username == null) {
          throw new Error('username is null')
        }
        const username = userResult.username

        return [groups, username]
      })

      return new OIDCAccount(id, username, groups)
    },
    async loadExistingGrant(ctx) {
      if (!ctx.oidc.client || !ctx.oidc.session || !ctx.oidc.result) {
        return undefined
      }

      const clientId = ctx.oidc.client.clientId
      const grantId = ctx.oidc.result.consent?.grantId
        || ctx.oidc.session.grantIdFor(ctx.oidc.client.clientId)

      if (grantId) {
        // keep grant expiry aligned with session expiry
        // to prevent consent prompt being requested when grant expires
        const grant = await ctx.oidc.provider.Grant.find(grantId)

        // this aligns the Grant ttl with that of the current session
        // if the same Grant is used for multiple sessions, or is set
        // to never expire, you probably do not want this in your code
        if (grant && ctx.oidc.account && (!grant.exp || grant.exp < ctx.oidc.session.exp)) {
          grant.exp = ctx.oidc.session.exp

          await grant.save()
        }

        return grant
      } else {
        const isFirstParty = await model.pgDo(tr => model.oauth.isFirstParty(tr, clientId))
        if (isFirstParty) {
          const grant = new ctx.oidc.provider.Grant({
            clientId: clientId,
            accountId: ctx.oidc.session.accountId,
          })

          grant.addOIDCScope('openid')
          grant.addOIDCClaims(claims.openid)
          await grant.save()
          return grant
        }
      }

      return undefined
    },
    cookies: {
      keys: [oidcConfig.cookieKey]
    },
    jwks: oidcConfig.jwks,
    pkce: {
      required: () => false,
    },
    clients: oidcConfig.clients,
    interactions: {
      url: (_ctx, interaction) => {
        return `/oauth/${interaction.uid}`
      },
    },
    claims,
    features: {
      devInteractions: {
        enabled: oidcConfig.devInteractions
      },
      deviceFlow: {
        enabled: oidcConfig.deviceFlow
      },
      revocation: {
        enabled: oidcConfig.revocation
      },
    },
  }
}
