import {} from 'dotenv/config';
import { auditLogger } from '../logger';
import { validateUserAuthForAccess } from '../services/accessValidation';

const tokenMiddleware = async (req, res, next) => {
  const userId = null;

  if (!userId) {
    res.status(401).json({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    });
  } else if (await validateUserAuthForAccess(userId)) {
    next();
  } else {
    auditLogger.warn(`User ${userId} denied access due to missing SITE_ACCESS`);
    res.status(403).json({
      status: '403',
      title: 'Unauthorized User',
      detail: 'User does not have appropriate permissions to view this resource',
    });
  }
};

export default tokenMiddleware;
