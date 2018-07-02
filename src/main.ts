import * as connectRedis from 'connect-redis';
import * as express from 'express';
import * as session from 'express-session';
import api from './api/main';
import config from './config';
import ldap from './ldap/main';

const sessionConfig = {
  cookie: {
    httpOnly: true,
    maxAge: config.session.cookieMaxAge,
    path: config.path,
    sameSite: 'strict',
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

const id = express();
id.set('trust proxy', config.trustProxy);
id.set('case sensitive routing', true);
id.use(session(sessionConfig));
id.use('/api', api);
id.listen(3000);

ldap.listen(1389);
