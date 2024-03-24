import * as bunyan from 'bunyan';
import * as fs from 'fs';
import Config from '../src/config.js';
import Model from '../src/model/model.js';

const config: Config = JSON.parse(fs.readFileSync('config.json', { encoding: 'utf-8' }));

const log = bunyan.createLogger({
  name: config.instanceName,
  level: config.logLevel,
});

const model = new Model(config, log);

async function rebuildCache() {
  await model.pgDo(async tr => {
    await model.groups.updateGroupReachableCache(tr);
  }, ['group_reachable_cache']);
}

rebuildCache().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(() => {
  console.error('Fail!');
  process.exit(1);
});
