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
  rl.question('How many reports should we index at once (defaults to 100)?', async (batch) => {
    try {
      await createAwsElasticSearchIndexes(!batch || Number.isNaN(batch) ? 100 : batch);
      process.exit();
    } catch (e) {
      auditLogger.error(e);
    }
  });
});
