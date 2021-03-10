import { User, Permission } from '../models';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

const { SITE_ACCESS, ADMIN } = SCOPES;

export const ADMIN_USERNAME = 'ryan.ahearn@gsa.gov';

const bootstrapAdmin = async () => {
  const user = await User.findOne({ where: { hsesUsername: ADMIN_USERNAME } });
  if (user === null) {
    throw new Error(`User ${ADMIN_USERNAME} could not be found to bootstrap admin`);
  }

  const [access, accessCreated] = await Permission.findOrCreate({
    where: {
      userId: user.id,
      scopeId: SITE_ACCESS,
      regionId: 14,
    },
  });
  if (accessCreated) {
    auditLogger.info(`Granting SITE_ACCESS to ${ADMIN_USERNAME}`);
  }

  const [admin, adminCreated] = await Permission.findOrCreate({
    where: {
      userId: user.id,
      scopeId: ADMIN,
      regionId: 14,
    },
  });
  if (adminCreated) {
    auditLogger.warn(`Granting ADMIN to ${ADMIN_USERNAME}`);
  }
  return [admin, access];
};

export default bootstrapAdmin;
