/**
 * id.snucse.org
 */

import * as express from 'express';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';

import config from './config';
import api from './api/main';
import ldap from './ldap/main';

/* session configurations */
const sessionConfig: session.SessionOptions = {
  cookie: {
    httpOnly: true,
    maxAge: config.session.cookieMaxAge,
    path: config.path,
    secure: config.session.secureCookie,
  },
  name: config.session.name,
  resave: false,
  rolling: false,
  saveUninitialized: false,
  secret: config.session.secret,
  store: new (connectRedis(session))(config.session.redis),
  unset: 'destroy',
};
sessionConfig.cookie['sameSite'] = 'strict';

/* express */
const id = express();
id.set('trust proxy', config.trustProxy);
id.set('case sensitive routing', true);
id.use(session(sessionConfig));
id.use('/api', api);

id.listen(3000);

/* ldap */
ldap.listen(1389);
