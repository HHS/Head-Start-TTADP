import readline from 'readline';
import createAwsElasticSearchIndexes from './createAwsElasticSearchIndexes';
import { auditLogger } from '../logger';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Are you sure you want to delete and recreate all search indexes? [y\\n]', async (answer) => {
  if (answer.toLowerCase() !== 'y') {
    auditLogger.info('-- Aborted job --');
    process.exit();
  }
  try {
    await createAwsElasticSearchIndexes();
    process.exit();
  } catch (e) {
    auditLogger.error(e);
  }
});
