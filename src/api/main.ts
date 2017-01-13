/**
 * id.snucse.org/api
 */

import * as express from 'express';

import pg from '../pg';

const api = express.Router({ caseSensitive: true, strict: true });

api.get('/', (req, res) => {
  const session = req.session;
  if (session['views']) {
    session['views']++;
  } else {
    session['views'] = 1;
  }
  res.send('Welcome ' + session['views']);
  const queryResult = pg.query('INSERT INTO a values ($1)', [session['views']]);
  queryResult.then(r => console.log('inserted'));
});

export default api;
