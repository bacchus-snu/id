/**
 * id.snucse.org
 */

import * as express from 'express';

import api from './api/main';

const id = express();
id.set('case sensitive routing', true);
id.use('/api', api);

id.listen(3000);
