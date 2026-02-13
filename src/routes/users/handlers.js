import { DECIMAL_BASE } from '@ttahub/common'
import { uniq } from 'lodash'
import UserPolicy from '../../policies/user'
import EventPolicy from '../../policies/event'
import SCOPES from '../../middleware/scopeConstants'
import { userById, usersWithPermissions, setFlag, getTrainingReportUsersByRegion, getUserNamesByIds, usersByRoles } from '../../services/users'
import handleErrors from '../../lib/apiErrorHandler'
import { statesByGrantRegion } from '../../services/grant'
import { createAndStoreVerificationToken, validateVerificationToken } from '../../services/token'
import { sendEmailVerificationRequestWithToken } from '../../lib/mailer'
import { currentUserId } from '../../services/currentUser'
import { auditLogger } from '../../logger'
import activeUsers from '../../services/activeUsers'
import { FEATURE_FLAGS } from '../../constants'

const verifyTrViewPermissions = async (req, res) => {
  const user = await userById(await currentUserId(req, res))

  const { permissions } = user
  const trPermissions = permissions.filter(({ scopeId }) =>
    [SCOPES.POC_TRAINING_REPORTS, SCOPES.READ_REPORTS, SCOPES.READ_WRITE_TRAINING_REPORTS, SCOPES.ADMIN].includes(scopeId)
  )

  const isAdmin = permissions.some(({ scopeId }) => scopeId === SCOPES.ADMIN)
  const regionIds = uniq(trPermissions.map(({ regionId }) => regionId))

  if (!trPermissions.length) {
    res.sendStatus(403)
  }

  return {
    isAdmin,
    regionIds,
  }
}

export async function getPossibleCollaborators(req, res) {
  try {
    const user = await userById(await currentUserId(req, res))
    const { region } = req.query
    const authorization = new UserPolicy(user)
    if (!authorization.canViewUsersInRegion(parseInt(region, DECIMAL_BASE))) {
      res.sendStatus(403)
      return
    }

    const users = await usersWithPermissions([region], SCOPES.READ_WRITE_REPORTS)
    res.json(users)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USER' })
  }
}

export async function getPossibleStateCodes(req, res) {
  try {
    const user = await userById(await currentUserId(req, res))
    const regions = user.permissions.map((permission) => permission.regionId)
    const stateCodes = await statesByGrantRegion(regions)
    res.json(stateCodes)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USER' })
  }
}

export async function requestVerificationEmail(req, res) {
  try {
    const user = await userById(await currentUserId(req, res))
    const token = await createAndStoreVerificationToken(user.id, 'email')

    await sendEmailVerificationRequestWithToken(user, token)
    res.sendStatus(200)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USER' })
  }
}

export async function verifyEmailToken(req, res) {
  const { token } = req.params
  const userId = await currentUserId(req, res)

  if (!token || !userId) {
    res.sendStatus(400)
    return
  }

  try {
    const validated = await validateVerificationToken(userId, token, 'email')
    if (!validated) {
      res.sendStatus(403)
      return
    }
    res.sendStatus(200)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USER' })
  }
}

/**
 * Handler for the active users csv download.
 *
 * @param {import('express').Request} req - request
 * @param {import('express').Response} res - response
 * @returns {*} - active users in a CSV format
 */
export async function getActiveUsers(req, res) {
  try {
    const user = await userById(await currentUserId(req, res))
    const authorization = new UserPolicy(user)

    if (!authorization.isAdmin()) {
      auditLogger.warn(`User ${user.id} without permissions attempted to access active users`)
      res.sendStatus(403)
      return
    }
    const usersStream = await activeUsers()

    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' })

    usersStream.on('end', () => res.end())
    usersStream.pipe(res)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:ACTIVEUSERS' })
  }
}

/**
 * Handler setting of a feature flag.
 *
 * @param {import('express').Request} req - request
 * @param {import('express').Response} res - response
 * @returns {*} - empty array and a number of users affected
 */
export async function setFeatureFlag(req, res) {
  try {
    const { flag, on } = req.body

    const user = await userById(await currentUserId(req, res))
    const authorization = new UserPolicy(user)

    if (!authorization.isAdmin()) {
      auditLogger.warn(`User ${user.id} without permissions attempted to set feature flags`)
      res.sendStatus(403)
      return
    }
    const result = await setFlag(flag, on)

    res.json(result)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USERS' })
  }
}

export async function getFeatureFlags(req, res) {
  try {
    const user = await userById(await currentUserId(req, res))
    const authorization = new UserPolicy(user)

    res.json(authorization.isAdmin() ? FEATURE_FLAGS : user.flags)
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:USERS' })
  }
}

export async function getTrainingReportUsers(req, res) {
  try {
    const user = await userById(await currentUserId(req, res))

    const authorization = new EventPolicy(user, {})
    const { regionId, eventId } = req.query

    const region = parseInt(regionId, DECIMAL_BASE)
    const event = parseInt(eventId, DECIMAL_BASE)

    if (!authorization.canGetTrainingReportUsersInRegion(region)) {
      res.sendStatus(403)
      return
    }

    res.json(await getTrainingReportUsersByRegion(region, event))
  } catch (err) {
    await handleErrors(req, res, err, { namespace: 'SERVICE:USERS' })
  }
}

export async function getTrainingReportTrainersByRegionAndNationalCenter(req, res) {
  try {
    const { isAdmin, regionIds } = await verifyTrViewPermissions(req, res)

    if (res.headersSent) {
      return
    }

    const regionalTrainers = await usersByRoles(
      [
        // roles pulled from this answer in Slack:
        // https://adhoc.slack.com/docs/T025UGMV9/F09LB5EQUN4?focus_section_id=temp:C:efWcf6d8bbdaef14ed6b85b02369
        // plus national center users
        'HS',
        'SS',
        'ECS',
        'GS',
        'FES',
        'TTAC',
        'ECM',
        'GSM',
        // admins see all users
      ],
      isAdmin ? null : regionIds
    )

    const nationalCenterTrainers = await usersByRoles(['NC'])

    res.json([...regionalTrainers, ...nationalCenterTrainers])
  } catch (err) {
    await handleErrors(req, res, err, { namespace: 'SERVICE:USERS' })
  }
}

export async function getTrainingReportTrainersByRegion(req, res) {
  try {
    const { regionId } = req.params

    const { regionIds, isAdmin } = await verifyTrViewPermissions(req, res)
    if (res.headersSent) {
      return
    }

    const regionIdInt = parseInt(regionId, DECIMAL_BASE)

    if (!regionIds.includes(regionIdInt) && !isAdmin) {
      res.sendStatus(403)
      return
    }

    const regionalTrainers = await usersByRoles(
      [
        // roles pulled from this answer in Slack:
        // https://adhoc.slack.com/docs/T025UGMV9/F09LB5EQUN4?focus_section_id=temp:C:efWcf6d8bbdaef14ed6b85b02369
        // plus national center users
        'HS',
        'SS',
        'ECS',
        'GS',
        'FES',
        'TTAC',
        'ECM',
        'GSM',
      ],
      regionIdInt
    )

    res.json([...regionalTrainers])
  } catch (err) {
    await handleErrors(req, res, err, { namespace: 'SERVICE:USERS' })
  }
}

export async function getTrainingReportNationalCenterUsers(req, res) {
  try {
    // this fn sends a status of 403 if the user lacks permissions/is not an admin
    await verifyTrViewPermissions(req, res)

    if (res.headersSent) {
      return
    }

    const nationalCenterTrainers = await usersByRoles(['NC'])
    res.json(nationalCenterTrainers)
  } catch (err) {
    await handleErrors(req, res, err, { namespace: 'SERVICE:USERS' })
  }
}

export async function getNamesByIds(req, res) {
  try {
    const { ids } = req.query
    if (!ids) {
      res.sendStatus(400)
      return
    }
    res.json(await getUserNamesByIds(ids))
  } catch (err) {
    await handleErrors(req, res, err, { namespace: 'SERVICE:USERS' })
  }
}
