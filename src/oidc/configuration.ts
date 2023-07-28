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
      let groups: Array<string>
      let username: string

      await model.pgDo(async tr => {
        const groupSet = await model.users.getUserReachableGroups(tr, Number(id))
        const groupResult = await tr.query('SELECT identifier FROM groups WHERE idx = ANY($1)', [[...groupSet]])
        groups = groupResult.rows.map(r => r.identifier)

        const userResult = await model.users.getByUserIdx(tr, Number(id))
        if (userResult.username == null) {
          throw new Error('username is null')
        }
        username = userResult.username
      })

      return new OIDCAccount(id, username, groups)
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
