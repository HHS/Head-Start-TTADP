import {} from 'dotenv/config';
import { option } from 'yargs';
import importDuration from './importDuration';
import { logger } from '../logger';

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
}).option('region', {
  alias: 'r',
  description: 'grant\'s region',
  type: 'number',
})
  .help()
  .alias('help', 'h');

const { file } = argv;

if (!file) {
  logger.error('File not provided to importActivityReportDuration');
  process.exit(1);
}

importDuration(file);
