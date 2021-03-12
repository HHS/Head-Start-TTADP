import {} from 'dotenv/config';
import { option } from 'yargs';
import importActivityReports from './importActivityReports';
import { logger } from '../logger';

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
}).option('region', {
  description: 'grant\'s region',
  type: 'number',
})
  .help()
  .alias('help', 'h');

const { file, region } = argv;

if (!file) {
  logger.error('File not provided to importSSActivityReports');
  process.exit(1);
}

if (!region) {
  logger.error('Region not provided to importSSActivityReports');
  process.exit(1);
}

importActivityReports(file, region);
