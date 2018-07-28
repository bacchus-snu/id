import * as express from 'express';

const api = express.Router({ caseSensitive: true, strict: true });

api.get('/', (req, res) => {
  res.send('Welcome');
});

export default api;
