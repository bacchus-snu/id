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
  pg.connect((err, client, done) => {
    if (err) {
      console.error('error pool', err);
      return;
    }
    client.query('INSERT INTO a values ($1)', [session['views']], (err, result) => {
      done();
    });
  });
});

export default api;
