import cors from '@koa/cors';
import * as Bunyan from 'bunyan';
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

  // Since oidc-provider 9 the Provider is itself a Koa app, and koa-mount runs
  // its middleware on this app's context, so the provider signs its cookies
  // (_interaction, _session, ...) with *these* keys. Our own routes read them
  // through oidcProvider.createContext(), which verifies with
  // oidc.cookieKey, so both apps must share the same signing keys.
  app.keys = [config.oidc.cookieKey];

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
      allowMethods: ['GET', 'POST', 'DELETE'],
      credentials: true,
    }))
    .use(router.routes())
    .use(router.allowedMethods())
    .use(mount('/o', oidcProvider));

  return app;
};

export default createServer;
