import * as ldap from 'ldapjs';

import config from '../config';

const server = ldap.createServer();

export default server;
