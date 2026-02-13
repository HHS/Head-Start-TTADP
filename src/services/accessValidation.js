import { Op } from 'sequelize'
import { uniq } from 'lodash'
import { DECIMAL_BASE } from '@ttahub/common'
import { Permission } from '../models'
import { auditLogger as logger } from '../logger'
import SCOPES from '../middleware/scopeConstants'
import { userById } from './users'

const { SITE_ACCESS, ADMIN } = SCOPES

const namespace = 'SERVICE:ACCESS_VALIDATION'

const logContext = {
  namespace,
}

async function getUserRegionsByPermissions(userId, scopeIds) {
  const permissions = await Permission.findAll({
    attributes: ['regionId'],
    where: {
      userId,
      scopeId: {
        [Op.in]: scopeIds,
      },
    },
  })
  return permissions.map((p) => p.regionId)
}

export async function validateUserAuthForAccess(userId) {
  try {
    if (!userId || typeof userId !== 'number') {
      return false
    }

    const userPermission = await Permission.findOne({
      where: {
        userId,
        scopeId: SITE_ACCESS,
      },
    })
    return userPermission !== null
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - Access error - ${error}`)
    return false
  }
}

export async function userIsPocRegionalCollaborator(userId) {
  const userPermissions = await Permission.findAll({
    attributes: ['scopeId', 'userId'],
    where: {
      userId,
    },
  })

  // the user sees only reports where they are a collaborator
  // if they don't have the scope READ_WRITE_TRAINING_REPORTS
  // and the scope READ_REPORTS

  const hasReadReports = userPermissions.some((p) => p.scopeId === SCOPES.READ_REPORTS)

  const hasReadWriteReports = userPermissions.some((p) => p.scopeId === SCOPES.READ_WRITE_TRAINING_REPORTS)
  const hasCollaborator = userPermissions.some((p) => p.scopeId === SCOPES.POC_TRAINING_REPORTS)

  // if they have the other scopes, their access is not limited
  return hasCollaborator && !hasReadReports && !hasReadWriteReports
}

export async function validateUserAuthForAdmin(userId) {
  if (!userId || typeof userId !== 'number') {
    return false
  }

  try {
    const userPermission = await Permission.findOne({
      where: {
        userId,
        scopeId: ADMIN,
      },
    })
    if (userPermission !== null) {
      logger.info(`User ${userId} successfully checked ADMIN access`)
      return true
    }
    logger.warn(`User ${userId} unsuccessfully checked ADMIN access`)
    return false
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - ADMIN Access error - ${error}`)
    throw error
  }
}

export async function getUserReadRegions(userId) {
  try {
    const readActivityReportScopes = [SCOPES.READ_WRITE_REPORTS, SCOPES.READ_REPORTS, SCOPES.APPROVE_REPORTS]

    return await getUserRegionsByPermissions(userId, readActivityReportScopes)
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - Read region retrieval error - ${error}`)
    throw error
  }
}

export async function getUserTrainingReportReadRegions(userId) {
  try {
    const readTrainingReportScopes = [SCOPES.READ_WRITE_TRAINING_REPORTS, SCOPES.READ_REPORTS, SCOPES.POC_TRAINING_REPORTS]

    return await getUserRegionsByPermissions(userId, readTrainingReportScopes)
  } catch (error) {
    logger.error(`${JSON.stringify({ ...logContext })} - Read region retrieval error - ${error}`)
    throw error
  }
}

/**
 *
 * @param {Number} userId
 * @returns boolean whether the user is from the central office or not
 */
export async function isCentralOffice(userId) {
  const user = await userById(userId)
  return user.homeRegionId === 14
}

async function setRegionsInQuery(query, regions) {
  // if region.in is part of query (user has requested specific regions)
  if ('region.in' in query && Array.isArray(query['region.in']) && query['region.in'][0]) {
    // first check to see if "all regions (central office)" is selected
    // if so, return all regions has access to

    if (query['region.in'].length === 1 && parseInt(query['region.in'][0], DECIMAL_BASE) === 14) {
      return {
        ...query,
        'region.in': regions,
      }
    }

    // otherwise return filtered array of all regions user has access to vs requested regions
    return {
      ...query,
      'region.in': query['region.in'].filter((r) => regions.includes(parseInt(r, DECIMAL_BASE))),
    }
  }

  // otherwise region.in is not in query and we return all read regions
  return {
    ...query,
    'region.in': regions,
  }
}

/*
  Make sure the user has read permissions to the regions requested. If no regions
  are explicitly requested default to all regions which the user has access to.
*/
export async function setReadRegions(query, userId) {
  const readRegions = await getUserReadRegions(userId)

  return setRegionsInQuery(query, readRegions)
}

export async function setTrainingReportReadRegions(query, userId) {
  const readRegions = await getUserTrainingReportReadRegions(userId)

  return setRegionsInQuery(query, readRegions)
}

export async function setTrainingAndActivityReportReadRegions(query, userId) {
  const trainingReportReadRegions = await getUserTrainingReportReadRegions(userId)
  const activityReportReadRegions = await getUserReadRegions(userId)
  const readRegions = uniq([...trainingReportReadRegions, ...activityReportReadRegions])
  return setRegionsInQuery(query, readRegions)
}
