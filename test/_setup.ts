import test from 'ava';
import Logger, * as bunyan from 'bunyan';
import * as fs from 'fs';
import { Server } from 'node:http';
import createAPIServer from '../src/api/server';
import Model from '../src/model/model';

export let config: any;
export let log: Logger;
export let model: Model;
export let app: Server;
test.before(async () => {
  config = JSON.parse(await fs.promises.readFile('config.test.json', { encoding: 'utf-8' }));
  log = bunyan.createLogger({
    name: config.instanceName,
    level: config.logLevel,
  });
  model = new Model(config, log);
  const koa = await createAPIServer(config, log, model);
  app = koa.listen();
});
