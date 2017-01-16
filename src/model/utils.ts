/**
 * Postgresql connection pool
 */

import * as pg from 'pg';

import config from '../config';

type Client = pg.Client;
const pool = new pg.Pool(config.postgres);
const query = pool.query;

export { pool, query, Client };
