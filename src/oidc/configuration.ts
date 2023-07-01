// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
import type { Configuration } from 'oidc-provider'
import Config from '../config'
import RedisAdapter from './redis'

export default function createOIDCConfig(oidcConfig: Config['oidc']): Configuration {
  let adapter
  if (oidcConfig.redisURL) {
    adapter = RedisAdapter(oidcConfig.redisURL)
  }

  return {
    adapter,
    cookies: {
      keys: [oidcConfig.cookieKey]
    },
    jwks: oidcConfig.jwks,
    pkce: {
      required: () => false,
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
    clients: oidcConfig.clients,
  }
}
