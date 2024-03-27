import cors from '@koa/cors';
import * as Bunyan from 'bunyan';
import * as crypto from 'crypto';
import Koa from 'koa';
import mount from 'koa-mount';
import OIDCProvider from 'oidc-provider';

import type Config from '../config.js';
import Model from '../model/model.js';
import createOIDCConfig from '../oidc/configuration.js';
import { createRouter } from './router.js';

const createServer = (config: Config, log: Bunyan, inputModel?: Model) => {
  const model = inputModel ?? new Model(config, log);
  const oidcConfig = createOIDCConfig(model, config.oidc);
  const oidcProvider = new OIDCProvider(config.oidc.issuer, oidcConfig);

  const app = new Koa();
  app.proxy = config.api.proxy;
  const router = createRouter(model, oidcProvider, oidcConfig, config);

  const key = crypto.randomBytes(256).toString('hex');
  app.keys = [key];

  app.on('error', e => {
    log.error('API error', e);
  });

  app
    .use(cors({
      origin(ctx) {
        const origin = ctx.headers.origin;
        if (origin == null) {
          return '';
        }

        if (config.api.corsAllowedOrigins.includes(origin)) {
          return origin;
        }
        return '';
      },
      allowMethods: 'POST',
      credentials: true,
    }))
    .use(router.routes())
    .use(router.allowedMethods())
    .use(mount('/o', oidcProvider.app));

  return app;
};

export default createServer;
