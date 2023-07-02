import cors from '@koa/cors'
import Koa from 'koa'
import * as Bunyan from 'bunyan'
import bodyParser from 'koa-bodyparser'
import Session from 'koa-session'
import * as crypto from 'crypto'
import mount from 'koa-mount'

import Model from '../model/model'
import { createRouter } from './router'
import Config from '../config'
import createOIDCConfig from '../oidc/configuration'

const createServer = async (config: Config, log: Bunyan, inputModel?: Model) => {
  const model = inputModel ?? new Model(config, log)
  const OIDCProvider = (await import('oidc-provider')).default
  const oidcConfig = createOIDCConfig(config.oidc)
  const oidcProvider = new OIDCProvider(config.oidc.issuer, oidcConfig)

  const app = new Koa()
  app.proxy = config.api.proxy
  const router = createRouter(model, oidcProvider, config)

  app.use(bodyParser())
  app.use(Session(config.session, app))
  const key = crypto.randomBytes(256).toString('hex')
  app.keys = [key]

  app.on('error', e => {
    log.error('API error', e)
  })

  app
    .use(cors({
      origin(ctx) {
        const origin = ctx.headers.origin
        if (origin == null) {
          return ''
        }

        if (config.api.corsAllowedOrigins.includes(origin)) {
          return origin
        }
        return ''
      },
      allowMethods: 'POST',
      credentials: true,
    }))
    .use(router.routes())
    .use(router.allowedMethods())
    .use(mount('/o', oidcProvider.app))

  return app
}

export default createServer
