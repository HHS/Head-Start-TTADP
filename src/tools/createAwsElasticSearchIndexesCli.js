import createAwsElasticSearchIndexes from './createAwsElasticSearchIndexes';
import { auditLogger } from '../logger';

createAwsElasticSearchIndexes().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
