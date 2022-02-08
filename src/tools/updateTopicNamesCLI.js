import updateTopicNames from './updateTopicNames';
import { auditLogger } from '../logger';

updateTopicNames().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
