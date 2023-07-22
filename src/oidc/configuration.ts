// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Configuration } from 'oidc-provider'
import type Model from '../model/model'
import Config from '../config'
import RedisAdapter from './redis'
import OIDCAccount from './account'

export default function createOIDCConfig(model: Model, oidcConfig: Config['oidc']): Configuration {
  let adapter
  if (oidcConfig.redisURL) {
    adapter = RedisAdapter(oidcConfig.redisURL)
  }

  return {
    adapter,
    findAccount: async (ctx, id) => {
      const groups = await model.pgDo(async tr => {
        const groupSet = await model.users.getUserReachableGroups(tr, Number(id))
        const result = await tr.query('SELECT identifier FROM groups WHERE idx = ANY($1)', [[...groupSet]])
        return result.rows.map(r => r.identifier)
      })

      return new OIDCAccount(id, groups)
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
    claims: {
      openid: ['sub', 'groups'],
    },
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
