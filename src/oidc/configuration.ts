// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Configuration } from 'oidc-provider'
import type Model from '../model/model'
import Config from '../config'
import OIDCAccount from './account'
import AdapterFactory from './adapter'

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
      openid: ['sub', 'groups', 'username'],
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
