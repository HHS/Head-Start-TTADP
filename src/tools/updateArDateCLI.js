import updateArDate from './updateArDate';
import { auditLogger } from '../logger';

updateArDate().catch((e) => {
  auditLogger.error(e);
  process.exit(1);
});
