import {} from 'dotenv/config';
import { option } from 'yargs';
import createGoal from './goalPilot';
import { logger } from '../logger';

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
})
  .help()
  .alias('help', 'h');

const { file } = argv;

if (!file) {
  logger.error('File not provided to script');
  process.exit(1);
}

createGoal(file).then((recCount) => {
  if (!recCount) {
    logger.error('Error occurred.');
  }
  logger.info(`Processed ${recCount} Recipients`);

  process.exit(0);
});
