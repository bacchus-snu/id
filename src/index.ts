import * as bunyan from 'bunyan';
import * as fs from 'fs';
import createAPIServer from './api/server.js';
import Config from './config.js';

const config: Config = JSON.parse(fs.readFileSync('config.json', { encoding: 'utf-8' }));

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
});

function run() {
  const apiServer = createAPIServer(config, log);
  apiServer.listen(config.api.listenPort, config.api.listenHost);
}

run();
