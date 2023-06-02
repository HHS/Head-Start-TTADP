import {} from 'dotenv/config';
import { option } from 'yargs';
import importSmartSheetEvent from './importSmartSheetEvent';
import { logger, auditLogger } from '../logger';

async function runImportSmartSheetEvent(file) {
  try {
    await importSmartSheetEvent(file);
    process.exit(0);
  } catch (e) {
    auditLogger.error(e);
    process.exit(1);
  }
}

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

runImportSmartSheetEvent(file);
