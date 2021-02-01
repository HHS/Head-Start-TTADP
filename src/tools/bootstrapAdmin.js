import { User, Permission } from '../models';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

const { SITE_ACCESS, ADMIN } = SCOPES;

export const ADMIN_EMAIL = 'ryan.ahearn@gsa.gov';

const bootstrapAdmin = async () => {
  const user = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (user === null) {
    throw new Error(`User ${ADMIN_EMAIL} could not be found to bootstrap admin`);
  }

  const [access, accessCreated] = await Permission.findOrCreate({
    where: {
      userId: user.id,
      scopeId: SITE_ACCESS,
      regionId: 14,
    },
  });
  if (accessCreated) {
    auditLogger.info(`Granting SITE_ACCESS to ${ADMIN_EMAIL}`);
  }

  const [admin, adminCreated] = await Permission.findOrCreate({
    where: {
      userId: user.id,
      scopeId: ADMIN,
      regionId: 14,
    },
  });
  if (adminCreated) {
    auditLogger.warn(`Granting ADMIN to ${ADMIN_EMAIL}`);
  }
  return [admin, access];
};

export default bootstrapAdmin;
