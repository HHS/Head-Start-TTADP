import awsElasticSearchIndexJob from './awsElasticSearchIndexJob';
import { auditLogger } from '../logger';

awsElasticSearchIndexJob().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
