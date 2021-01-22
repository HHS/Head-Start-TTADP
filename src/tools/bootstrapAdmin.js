import { User, Permission } from '../models';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

const { ADMIN } = SCOPES;

export const ADMIN_EMAIL = 'ryan.ahearn@gsa.gov';

const bootstrapAdmin = async () => {
  const user = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (user === null) {
    throw new Error(`User ${ADMIN_EMAIL} could not be found to bootstrap admin`);
  }

  const [permission, created] = await Permission.findOrCreate({
    where: {
      userId: user.id,
      scopeId: ADMIN,
      regionId: 14,
    },
  });
  if (created) {
    auditLogger.warn(`Setting ${ADMIN_EMAIL} as an ADMIN`);
  }
  return permission;
};

export default bootstrapAdmin;
