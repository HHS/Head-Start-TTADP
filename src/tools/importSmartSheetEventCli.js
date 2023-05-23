import {} from 'dotenv/config';
import { option } from 'yargs';
import importSmartSheetEvent from './importSmartSheetEvent';
import { logger } from '../logger';

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
}).help()
  .alias('help', 'h');

const { file } = argv;

if (!file) {
  logger.error('File not provided to importSmartSheetEvent');
  process.exit(1);
}

importSmartSheetEvent(file);