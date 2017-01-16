/**
 * id.snucse.org/api
 */

import * as express from 'express';

const api = express.Router({ caseSensitive: true, strict: true });

api.get('/', (req, res) => {
  const session = req.session;
  if (session['views']) {
    session['views']++;
  } else {
    session['views'] = 1;
  }
  res.send('Welcome ' + session['views']);
});

export default api;
