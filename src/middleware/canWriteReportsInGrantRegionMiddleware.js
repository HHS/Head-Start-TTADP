import { auditLogger } from '../logger';
import { Grant } from '../models';
import ActivityReportPolicy from '../policies/activityReport';
import { validateUserAuthForAdmin } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import { userById } from '../services/users';

/**
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export default async function canWriteReportsInGrantRegionMiddleware(req, res, next) {
  // since auth middleware has already run, we know user ID is present and user has site access
  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  // we should only use this middleware after verifying the grant ID param is present
  const { grantId } = req.params;

  const grant = await Grant.findOne({
    attributes: ['id', 'regionId'],
    where: {
      id: grantId,
    },
  });

  if (!grant) {
    auditLogger.warn(`User ${userId} denied access due to invalid grant param`);
    res.sendStatus(403);
    return;
  }

  // admin users should have access to all grants, so we can skip the rest of the checks if the user is an admin
  const isAdmin = await validateUserAuthForAdmin(userId);
  if (isAdmin) {
    return next();
  }

  const policy = new ActivityReportPolicy(user, { regionId: grant.regionId });

  if (!policy.canWriteInRegion()) {
    auditLogger.warn(`User ${userId} denied access to grant ${grantId}`);
    res.sendStatus(403);
    return;
  }

  next();
}
