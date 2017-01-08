/**
 * Routing for id.snucse.org/api/
 */

import * as express from 'express';

const id = express();
id.set('case sensitive routing', true);

const api = express.Router({ caseSensitive: true, strict: true });

api.get('/', (req, res) => {
  res.send('Hello, id!');
});

id.use('/api', api);

id.listen(3000);
