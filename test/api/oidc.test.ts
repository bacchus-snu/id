import test from 'ava';
import * as crypto from 'crypto';
import * as request from 'supertest';
import createAPIServer from '../../src/api/server.js';
import type Config from '../../src/config.js';
import { config, log, model } from '../_setup.js';

test('authorization request starts an interaction readable by /oauth/:uid/details', async t => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const redirectUri = 'http://localhost:9999/cb';
  const oidcConfig: Config['oidc'] = {
    ...config.oidc,
    jwks: {
      keys: [{ ...privateKey.export({ format: 'jwk' }), kid: 'test', alg: 'ES256', use: 'sig' }],
    },
    clients: [{
      client_id: 'test',
      client_secret: 'secret',
      redirect_uris: [redirectUri],
      response_types: ['code'],
      grant_types: ['authorization_code'],
      id_token_signed_response_alg: 'ES256',
    }],
  };
  const server = createAPIServer({ ...config, oidc: oidcConfig }, log, model).listen();
  t.teardown(() => server.close());

  const agent = request.agent(server);

  let response = await agent.get('/o/auth').query({
    client_id: 'test',
    response_type: 'code',
    scope: 'openid',
    redirect_uri: redirectUri,
    state: 'x',
  });
  t.is(response.status, 303);
  const uid = response.headers.location.split('/').pop();

  response = await agent.get(`/oauth/${uid}/details`);
  t.is(response.status, 200);
  t.is(response.body.prompt.name, 'login');
});
