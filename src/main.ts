/**
 * id.snucse.org
 */

import * as express from 'express';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';

import config from './config';
import api from './api/main';

/* session configurations */
const sessionConfig: session.SessionOptions = {
  cookie: {
    httpOnly: true,
    maxAge: config.cookieMaxAge,
    path: config.path,
    secure: config.secureCookie,
  },
  name: config.sessionName,
  resave: false,
  rolling: false,
  saveUninitialized: false,
  secret: config.sessionSecret,
  store: new (connectRedis(session))(config.redis),
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
