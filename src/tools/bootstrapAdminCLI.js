import bootstrapAdmin from './bootstrapAdmin';
import { auditLogger } from '../logger';

/**
 * bootstrapAdminCLI is responsible for setting the first ADMIN for TTA Smart Hub.
 * It should be run via `cf run-task tta-smarthub-prod "yarn db:bootstrap:admin"`
 *
 * All other admins and permissions should be set via the admin UI.
 *
 * To change the initial admin (for instance, after the previous one has left the project)
 * Open a new issue and PR to update the ADMIN_EMAIL constant within bootstrapAdmin.js
 */
bootstrapAdmin().catch((e) => {
  auditLogger.error(e);
  return process.exit(1);
});
