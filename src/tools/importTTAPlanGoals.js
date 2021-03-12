import {} from 'dotenv/config';
import { option } from 'yargs';
import importGoals from './importPlanGoals';
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

const { file, region } = argv;

if (!file) {
  logger.error("File not provided to importTTAPlanGoals");
  process.exit(1);
}

if (!region) {
  logger.error("Region not provided to importTTAPlanGoals");
  process.exit(1);
}

importGoals(file, region);
