/**
 * id.snucse.org instance configuration
 */

import * as path from 'path';
import * as fs from 'fs';

/* Configuration interface */

interface Configuration {
  /**
   * Whether or not to set session cookies as secure.
   */
  secureCookie: boolean;
}

/* Specifying configuration file from command line */
let configFilePath = process.argv[2] === '-c' ? process.argv[3] : null;
if (configFilePath === undefined) {
  console.error('Path to the configuration file is missing after \'-c\' option.');
  process.exit(1);
}

/* Reading configuration file */
let configString: string = null;

if (configFilePath === null) {
  // Try to find 'config.json' from current directory and upward
  const dirs = process.cwd().split(path.sep);
  while (dirs.length > 0) {
    configFilePath = dirs.concat('config.json').join(path.sep);
    try {
      configString = fs.readFileSync(configFilePath, 'utf8');
      break;
    } catch (e) {
    }
    dirs.pop();
  }
  if (configString === null) {
    console.error('Cannot find config.json');
    process.exit(1);
  }
} else {
  try {
    configString = fs.readFileSync(configFilePath, 'utf8');
  } catch (e) {
    console.error('Cannot read the specified config file');
    console.error(e.message);
    process.exit(1);
  }
}

/* Parsing configuration */
let config: Object;
try {
  config = JSON.parse(configString);
} catch (e) {
  console.error('Cannot parse configuration file', configFilePath);
  console.error(e.message);
  process.exit(1);
}

export default config as Configuration;
