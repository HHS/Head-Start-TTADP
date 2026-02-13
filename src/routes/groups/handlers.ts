import type { Request, Response } from 'express'
import { DECIMAL_BASE } from '@ttahub/common'
import httpCodes from 'http-codes'
import { GROUP_COLLABORATORS } from '../../constants'
import db from '../../models'
import { auditLogger } from '../../logger'
import { userById } from '../../services/users'
import { currentUserId } from '../../services/currentUser'
import {
  group,
  groups,
  editGroup,
  createNewGroup,
  destroyGroup,
  potentialGroupUsers,
  potentialRecipientGrants,
  checkGroupNameAvailable,
  type GroupResponse,
} from '../../services/groups'
import GroupPolicy from '../../policies/group'

const NAMESPACE = 'GROUPS'
const { Grant } = db

const GROUP_ERRORS = {
  ALREADY_EXISTS: 'This group name already exists, please use a different name',
  ERROR_SAVING: 'There was an error saving your group',
  CO_OWNER_PERMISSIONS: 'All co-owners must have permissions matching the owner, and access to all grants within the group',
  SHARED_WITH_PERMISSIONS: 'All sharedWith must have permissions matching the owner, and access to all grants within the group',
}

/**
 * Checks bulk permissions for a given method.
 *
 * @param method - The method to check permissions for.
 * @param userDatas - An array of user data objects with their permissions.
 * @param grants - An array of grants.
 * @param groupData - An optional group object.
 * @returns A boolean indicating whether the bulk permissions check passed or not.
 */
function checkBulkPermissions(
  method: string, // The method to check permissions for
  // An array of user data objects with their permissions
  userDatas: { id: number; permissions: { regionId: number; scopeId: number }[] }[],
  // An array of grants
  grants: { id: number; regionId: number; recipientId?: number; status?: string }[],
  // An optional group object
  groupData?: { id: number; isPublic: boolean; grants?; groupCollaborators? }
): boolean {
  // Negate the result of the following expression
  const resultz = userDatas
    // Map over the userDatas array and create a new GroupPolicy instance for each userData
    .map((userData) => new GroupPolicy(userData, grants, groupData)[method]())
    // Check if every result is false
    .every((result) => result)
  return resultz
}

/**
 * Retrieves the eligible users for a specified group.
 *
 * @param req - The request object containing the 'groupId' parameter.
 * @param res - The response object used to send the JSON response or status codes.
 * @returns - This function does not return anything.
 * @throws - If an error occurs during the execution of the function, an internal server error
 * status code is sent.
 */
export async function getEligibleUsersForGroup(req: Request, res: Response) {
  try {
    // Extract the 'groupId' parameter from the request
    const { groupId: groupIdRaw } = req.params
    // Parse the 'groupId' as an integer
    const groupId = groupIdRaw === 'new' ? null : parseInt(groupIdRaw, 10)
    // Get the current user's ID
    const userId = await currentUserId(req, res)

    // Get the user data based on the user ID
    const user = await userById(userId)

    // If the group isn't saved yet, create a group to check permissions.
    const unsavedGroup = {
      groupCollaborators: [
        {
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        },
      ],
    }
    // Fetch the group data and the potential co-owners asynchronously.
    const [groupData, optionsForCoOwners] = await Promise.all([
      groupId !== null ? group(groupId) : Promise.resolve(unsavedGroup as GroupResponse),
      potentialGroupUsers(groupId, userId),
    ])

    // Create a GroupPolicy instance with the current user, an empty array of roles, and the
    // group data
    const policy = new GroupPolicy(user, [], groupData)
    // Check if the current user can edit the group
    if (!policy.canEditGroup()) {
      // If the user does not have permission to edit the group, send a forbidden status code
      // and return
      res.sendStatus(httpCodes.FORBIDDEN)
      return
    }
    // Send the options for co-owners and sharedWith as a JSON response
    res.json(optionsForCoOwners)
  } catch (e) {
    // Log any errors that occur during the execution of the function
    auditLogger.error(`${NAMESPACE} getEligibleUsersForGroup, ${e}`)
    // Send an internal server error status code
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR)
  }
}

/**
 * Retrieves the options for recipient grants for a given group.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns - The options for recipient grants as a JSON response.
 * @throws - If an exception occurs, an internal server error status code is sent.
 */
export async function getEligibleRecipientGrantsForGroup(req: Request, res: Response) {
  try {
    // Extract the groupId from the request parameters
    const { groupId: groupIdRaw } = req.params
    // Parse the groupId as an integer
    const groupId = groupIdRaw === 'new' ? null : parseInt(groupIdRaw, 10)
    // Get the current user's ID
    const userId = await currentUserId(req, res)
    // Get the user data based on the user ID
    const user = await userById(userId)

    // If the group isn't saved yet, create a group to check permissions.
    const unsavedGroup = {
      groupCollaborators: [
        {
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        },
      ],
    }

    // Retrieve the group data and potential recipient grants in parallel
    const [groupData, optionsForRecipientGrants] = await Promise.all([
      groupId !== null ? group(groupId) : Promise.resolve(unsavedGroup as GroupResponse),
      potentialRecipientGrants({ groupId, userId }),
    ])

    // Create a new GroupPolicy instance based on the current user, an empty array of permissions,
    // and the group data
    const policy = new GroupPolicy(user, [], groupData)
    // Check if the user can edit the group
    if (!policy.canEditGroup()) {
      // If the user does not have permission to edit the group, send a forbidden status code and
      // return
      res.sendStatus(httpCodes.FORBIDDEN)
      return
    }

    // Send the options for recipient grants as a JSON response
    res.json(optionsForRecipientGrants)
  } catch (e) {
    // Log an error message if an exception occurs
    auditLogger.error(`${NAMESPACE} getEligibleRecipientGrantsForGroup, ${e}`)
    // Send an internal server error status code
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR)
  }
}

/**
 * Retrieves the groups for the current user.
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @throws {Error} - If an error occurs while retrieving the groups.
 */
export async function getGroups(req: Request, res: Response) {
  try {
    // Get the current user's ID
    const userId = await currentUserId(req, res)
    // Get the user object using the user ID
    const user = await userById(userId)
    // Get an array of region IDs from the user's permissions
    const userRegions = user.permissions.map((p) => p.regionId)
    // Get the groups for the user using the user ID and user regions
    const usersGroups = await groups(userId, userRegions)
    // Send the user's groups as a JSON response
    res.json(usersGroups)
  } catch (e) {
    // Log an error message with the function name and the caught error
    auditLogger.error(`${NAMESPACE}, 'getGroups', ${e}`)
    // Set the response status to 500 (Internal Server Error)
    res.status(httpCodes.INTERNAL_SERVER_ERROR)
  }
}

/**
 * Retrieves a group based on the provided group ID.
 *
 * @param req - The request object containing the group ID in the parameters.
 * @param res - The response object used to send the group response or error status codes.
 * @returns - None.
 * @throws - If an error occurs during the retrieval process, an 'INTERNAL_SERVER_ERROR' status
 * code is sent.
 */
export async function getGroup(req: Request, res: Response) {
  try {
    // Extract the 'groupId' from the request parameters
    const { groupId: groupIdRaw } = req.params
    const groupId = parseInt(groupIdRaw, DECIMAL_BASE)
    const [userId, groupResponse] = await Promise.all([
      // Get the current user's ID asynchronously
      currentUserId(req, res),
      // Get the group response by calling the 'group' function with the parsed 'groupId'
      group(groupId),
    ])

    // Get the user data based on the user ID
    const user = await userById(userId)

    // Create a new GroupPolicy instance with the current user's ID, an empty array of permissions,
    // and the group response
    const policy = new GroupPolicy(user, groupResponse.grants, groupResponse)

    // Check if the current user can use the group
    if (!policy.canUseGroup()) {
      // If the user does not own the group and the group is not public, send a 'FORBIDDEN'
      // status code
      res.sendStatus(httpCodes.FORBIDDEN)
      return
    }
    // Send the group response as JSON
    res.json(groupResponse)
  } catch (e) {
    // Log the error with the appropriate namespace
    auditLogger.error(`${NAMESPACE} getGroup ${e}`)
    // Send an 'INTERNAL_SERVER_ERROR' status code
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR)
  }
}

/**
 * Creates a new group.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns A Promise that resolves to the group response as JSON.
 * @throws If there is an error while creating the group, an error response with an error message
 * is sent.
 */
export async function createGroup(req: Request, res: Response) {
  try {
    // Destructure the relevant properties from the request body
    const { name, grants: grantIds = [], coOwners: coOwnerIds = [], individuals: individualIds = [], isPublic: isPublicRaw = false } = req.body
    // cast isPublic to boolean
    const isPublic = isPublicRaw === 'true' || isPublicRaw === true
    // Fetch the current user ID and related data in parallel
    const [userId, coOwners, individuals] = await Promise.all([
      currentUserId(req, res),
      coOwnerIds.length ? Promise.all(coOwnerIds.map(async (coOwnerId) => userById(coOwnerId))) : Promise.resolve([]),
      individualIds.length ? Promise.all(individualIds.map(async (sharedWithId) => userById(sharedWithId))) : Promise.resolve([]),
    ])

    // Fetch the user data for the current user
    const [user, grants, nameAvailable] = await Promise.all([userById(userId), potentialRecipientGrants({ userId }), checkGroupNameAvailable(name)])
    const grantsWithId = grants.map((grant) => ({ ...grant, id: grant.grantId }))

    // Create a new GroupPolicy instance with the user and grants data
    const policy = new GroupPolicy(user, grantsWithId)

    // Check if the current user can add to the group
    if (!policy.canAddToGroup()) {
      res.sendStatus(httpCodes.FORBIDDEN)
      return
    }

    // Check if the co-owners have the necessary permissions
    if (!checkBulkPermissions('canAddToGroup', coOwners, grantsWithId)) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'co-owner-permissions',
        message: GROUP_ERRORS.CO_OWNER_PERMISSIONS,
      })
      return
    }

    // Check if the sharedWith have the necessary permissions
    if (!checkBulkPermissions('canUseGroup', individuals, grantsWithId, { id: -1, isPublic })) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'shared-with-permissions',
        message: GROUP_ERRORS.SHARED_WITH_PERMISSIONS,
      })
      return
    }

    // Check if the group name is already taken
    if (!nameAvailable) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'new-group-name',
        message: GROUP_ERRORS.ALREADY_EXISTS,
      })
      return
    }

    // Create a new group with the filtered grants
    const groupResponse = await createNewGroup({
      ...req.body,
      userId,
      grants: grantIds, // filter to only active grants
    })

    // Send the group response as JSON
    res.json(groupResponse)
  } catch (e) {
    auditLogger.error(`${NAMESPACE} createGroup ${e}`)
    res.status(httpCodes.INTERNAL_SERVER_ERROR).json({
      message: GROUP_ERRORS.ERROR_SAVING,
    })
  }
}

/**
 * Updates a group.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns - A Promise that resolves to the updated group response.
 * @throws - If there is an error while updating the group, an error response with a status code
 * of 500 will be sent.
 * @throws - If the user does not have permission to edit the group, a status code of 403 will
 * be sent.
 * @throws - If the new group name is not unique, an error response with a status code of 202
 * will be sent.
 */
export async function updateGroup(req: Request, res: Response) {
  try {
    // Destructure the necessary properties from the request body
    const { id: groupIdRaw, name, grants: grantIds, coOwners: coOwnerIds = [], individuals: individualIds = [], isPublic: isPublicRaw } = req.body

    const isPublic = isPublicRaw === 'true' || isPublicRaw === true
    // Parse the groupId and retrieve necessary data from various async functions
    const groupId = parseInt(groupIdRaw, DECIMAL_BASE)
    // Destructure the array returned by Promise.all into individual variables
    const [
      userId, // Store the result of the currentUserId function
      groupData, // Store the result of the group function
      grants, // Store the result of the Grant.findAll function
      coOwners, // Store the result of the Promise.all function
      individuals, // Store the result of the Promise.all function
    ] = await Promise.all([
      // Call the currentUserId function with req and res parameters and await its result
      currentUserId(req, res),
      group(groupId), // Call the group function with groupId parameter and await its result
      Grant.findAll({
        // Call the findAll method on the Grant model
        attributes: ['id', 'regionId', 'recipientId', 'status'],
        where: {
          id: grantIds,
          status: 'Active',
        },
        raw: true,
      }),
      // Map each coOwnerId to a Promise returned by the userById function and await all promises
      Promise.all(coOwnerIds.map(async (coOwnerId) => userById(coOwnerId))),
      // Map each sharedWithId to a Promise returned by the userById function and await all promises
      Promise.all(individualIds.map(async (sharedWithId) => userById(sharedWithId))),
    ])

    // Create a new GroupPolicy instance and check if the user has permission to edit the group
    const policy = new GroupPolicy({ id: userId, permissions: [] }, [], groupData)
    if (!policy.canEditGroup()) {
      res.sendStatus(httpCodes.FORBIDDEN)
      return
    }

    // Check if the co-owners have the necessary permissions
    if (!checkBulkPermissions('canAddToGroup', coOwners, grants)) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'co-owner-permissions',
        message: GROUP_ERRORS.CO_OWNER_PERMISSIONS,
      })
      return
    }

    // Check if the sharedWith have the necessary permissions
    if (!checkBulkPermissions('canUseGroup', individuals, grants, { ...groupData, isPublic })) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'shared-with-permissions',
        message: GROUP_ERRORS.SHARED_WITH_PERMISSIONS,
      })
      return
    }

    // Check if the new group name is available
    if (!(await checkGroupNameAvailable(name, groupId))) {
      res.status(httpCodes.ACCEPTED).json({
        error: 'new-group-name',
        message: GROUP_ERRORS.ALREADY_EXISTS,
      })
      return
    }

    // Edit the group and send the updated group response
    const groupResponse = await editGroup(groupId, {
      ...req.body,
      grants: grantIds,
    })

    res.json(groupResponse)
  } catch (e) {
    // Log any errors and send an internal server error response
    auditLogger.error(`${NAMESPACE} updateGroup ${e}`)
    res.status(httpCodes.INTERNAL_SERVER_ERROR).json({
      message: GROUP_ERRORS.ERROR_SAVING,
    })
  }
}

/**
 * Deletes a group.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns
 * @throws {Error} If an error occurs while deleting the group.
 */
export async function deleteGroup(req: Request, res: Response) {
  try {
    const { groupId: groupIdRaw } = req.params
    const groupId = parseInt(groupIdRaw, DECIMAL_BASE)
    const [userId, groupData] = await Promise.all([
      currentUserId(req, res),
      group(groupId), // Retrieve the group data using the groupId
    ])

    // We should check that the group exists before we attempt to delete it.
    if (!groupData) {
      // If the group does not exist, respond with an empty JSON object and an HTTP status code
      // of 200 (OK)
      res.status(httpCodes.OK)?.json({})
      return
    }

    // Get the user data based on the user ID
    const user = await userById(userId)

    // Create a new GroupPolicy instance with the user's id, an empty array of permissions, and
    // the groupData
    const policy = new GroupPolicy(user, [], groupData)

    // Check if the user owns the group
    if (!policy.ownsGroup()) {
      // If the user does not own the group, respond with an HTTP status code of 403 (FORBIDDEN)
      res.sendStatus(httpCodes.FORBIDDEN)
      return
    }

    // Delete the group by calling the destroyGroup function asynchronously, passing in the groupId
    const groupResponse = await destroyGroup(groupId)

    // Respond with the groupResponse as JSON in the response body
    res.json(groupResponse)
  } catch (e) {
    // Log any errors that occur during the deletion process
    auditLogger.error(`${NAMESPACE} deleteGroup ${e}`)

    // If an error occurs, respond with an HTTP status code of 500 (INTERNAL_SERVER_ERROR)
    res.sendStatus(httpCodes.INTERNAL_SERVER_ERROR)
  }
}
