import { User, Permission, sequelize } from '../src/models';
import logger from '../src/logger';
import SCOPES from '../src/middleware/scopeConstants';

const { ADMIN } = SCOPES;

export const ADMIN_EMAIL = "ryan.ahearn@gsa.gov";

const bootstrapAdmin = async () => {
  const user = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (user === null) {
    throw new Error(`User ${ADMIN_EMAIL} could not be found to bootstrap admin`);
  }

  const [permission, created] = await Permission.findOrCreate({
    where: {
      userId: user.id,
      scopeId: ADMIN,
      regionId: 14
    }
  });
  if (created) {
    logger.warn(`SECURITY ALERT: Setting ${ADMIN_EMAIL} as an ADMIN`);
  }
  return permission;
}

export default bootstrapAdmin;
