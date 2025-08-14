import { auditLogger } from '../logger';
// import { validateUserAuthForAccess } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import { Grant } from '../models';
import ActivityReportPolicy from '../policies/activityReport';
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

  const policy = new ActivityReportPolicy(user, { regionId: grant.regionId });

  if (!policy.canWriteInRegion()) {
    auditLogger.warn(`User ${userId} denied access to grant ${grantId}`);
    res.sendStatus(403);
    return;
  }

  next();
}
