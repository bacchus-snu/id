import type {
  AdapterConstructor,
  AdapterFactory,
  Configuration,
  CookiesSetOptions,
  JWKS,
// @ts-expect-error: https://github.com/microsoft/TypeScript/issues/49721
} from 'oidc-provider'
import Config from '../config'
import RedisAdapter from './redis'

export default class OIDCConfig implements Configuration {
  adapter?: AdapterConstructor | AdapterFactory | undefined
  jwks?: JWKS | undefined
  features?: {
    devInteractions?: {
      enabled?: boolean | undefined
    } | undefined
    deviceFlow?: {
      enabled?: boolean | undefined
    } | undefined
    revocation?: {
      enabled?: boolean | undefined
    } | undefined
  }
  cookies?: {
    names?: {
      session?: string | undefined
      interaction?: string | undefined
      resume?: string | undefined
      state?: string | undefined
    } | undefined
    long?: CookiesSetOptions | undefined
    short?: CookiesSetOptions | undefined
    keys?: Array<string | Buffer> | undefined
  } | undefined

  constructor(public readonly oidcConfig: Config['oidc']) {
    if (oidcConfig.redisURL) {
      RedisAdapter.connect(oidcConfig.redisURL)
      this.adapter = RedisAdapter
    }
    this.jwks = oidcConfig.jwks
    this.features = {
      devInteractions: {
        enabled: oidcConfig.devInteractions
      },
      deviceFlow: {
        enabled: oidcConfig.deviceFlow
      },
      revocation: {
        enabled: oidcConfig.revocation
      },
    }
  }
}
