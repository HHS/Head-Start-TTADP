import transitionToMultApprovers from './transitionToMultApprovers';
import { auditLogger } from '../logger';

/**
 * transitionToMultApproverCLI transforms data in the production database to fit
 * the new multiple approver feature. It should be run via
 * `cf run-task tta-smarthub-prod --command "yarn db:transitionToMultApprovers"`
 *
 */
transitionToMultApprovers().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
