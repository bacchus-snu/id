import { AdapterConstructor, AdapterFactory, Configuration, CookiesSetOptions, JWKS } from 'oidc-provider'
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

  constructor(public readonly config: Config) {
    if (config.oidc.redisURL) {
      RedisAdapter.connect(config.oidc.redisURL)
      this.adapter = RedisAdapter
    }
    this.jwks = config.oidc.jwks
    this.features = {
      devInteractions: {
        enabled: config.oidc.devInterations
      },
      deviceFlow: {
        enabled: config.oidc.deviceFlow
      },
      revocation: {
        enabled: config.oidc.revocation
      },
    }
  }
}
