/**
 * Postgresql connection pool
 */

import * as pg from 'pg';

import config from './config';

const pgPool = new pg.Pool(config.postgres);

export default pgPool;
