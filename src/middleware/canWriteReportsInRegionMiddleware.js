import { auditLogger } from '../logger'
import { currentUserId } from '../services/currentUser'
import ActivityReportPolicy from '../policies/activityReport'
import { userById } from '../services/users'

/**
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export default async function canWriteReportsInRegionMiddleware(req, res, next) {
  // since auth middleware has already run, we know user ID is present and user has site access
  const userId = await currentUserId(req, res)
  const user = await userById(userId)

  // we should only use this middleware after verifying the grant ID param is present
  const { regionId } = req.params

  const policy = new ActivityReportPolicy(user, { regionId })

  if (!policy.canWriteInRegion()) {
    auditLogger.warn(`User ${userId} denied access to region ${regionId}`)
    res.sendStatus(403)
    return
  }

  next()
}
