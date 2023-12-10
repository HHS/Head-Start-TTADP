import { Op } from 'sequelize';
import db from '../models';
import { GROUP_COLLABORATORS } from '../constants';
import { getCollaboratorTypeMapping } from './collaboratorType';
import SCOPES from '../middleware/scopeConstants';

const {
  CollaboratorType,
  Grant,
  Group,
  GroupCollaborator,
  GroupGrant,
  Permission,
  Program,
  Recipient,
  Role,
  User,
  Sequelize,
} = db;

interface GroupData {
  name: string;
  id?: number;
  grants: number[];
  isPublic: boolean;
  creator: { userId: number },
  coOwners?: { userId: number }[],
  cohorts?: { userId: number }[],
}

interface GroupGrantData {
  id: number;
  grantId: number;
  groupId: number;
}

interface GrantsResponse {
  id: number;
  regionId: number;
  recipientId: number;
  status: string;
}

interface GroupCollaboratorsResponse {
  id: number;
  collaboratorType: { name: string };
  user: { id: number, name: string };
}

interface GroupResponse {
  id: number;
  name: string;
  grants: GrantsResponse[];
  groupCollaborators: GroupCollaboratorsResponse[];
  isPublic: boolean;
}

/**
 * Checks if a group name is available.
 *
 * @param name - The name of the group to check.
 * @param groupId - Optional. The ID of the group to exclude from the check.
 * @returns A Promise that resolves to a boolean value indicating if the group name is available
 * (true) or not (false).
 */
export async function checkGroupNameAvailable(name: string, groupId?: number): Promise<boolean> {
  // Find an existing group with the given name and optional groupId
  const existingGroup = await Group.findOne({
    attributes: ['id'],
    where: {
      name: {
        [Op.iLike]: name.trim(), // Case-insensitive comparison of the name
      },
      // Exclude the group with the given groupId if provided
      ...(groupId && { groupId: { [Op.not]: groupId } }),
    },
  });
  return !!existingGroup; // Return true if an existing group is found, false otherwise
}

/**
 * Retrieves groups by region.
 *
 * @param region - The region ID to filter the groups by.
 * @returns A promise that resolves to an array of GroupResponse objects.
 * @throws This function does not throw any exceptions.
 */
export async function groupsByRegion(region: number): Promise<GroupResponse[]> {
  // TODO: needs to take current userID as an arg so the permissions can be checked in the query
  return Group.findAll({
    attributes: [
      'id',
      'name',
    ],
    where: {
      '$grants.regionId$': { [Op.eq]: region },
    },
    include: [
      {
        model: GroupCollaborator,
        as: 'groupCollaborators',
        required: true,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            required: true,
            attributes: ['name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
          },
        ],
        attributes: [],
      },
      {
        attributes: [
          'regionId',
          'recipientId',
          'number',
          'id',
          'granteeName',
          'recipientInfo',
        ],
        model: Grant,
        as: 'grants',
        include: [
          {
            attributes: [
              'name',
              'id',
            ],
            model: Recipient,
            as: 'recipient',
          },
        ],
      },
    ],
  });
}

/**
 * Retrieves groups based on the provided user ID and regions.
 *
 * @param userId - The ID of the user.
 * @param regions - An optional array of region IDs.
 * @returns A promise that resolves to an array of GroupResponse objects.
 */
export async function groups(userId: number, regions: number[] = []): Promise<GroupResponse[]> {
  return Group.findAll({
    where: {
      [Op.or]: [
        {
          '$grants.regionId$': { [Op.in]: regions },
          isPublic: true,
        },
        {
          '$groupCollaborators.userId$': userId,
        },
      ],
    },
    include: [
      {
        model: GroupCollaborator,
        as: 'groupCollaborators',
        required: true,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            required: true,
            attributes: ['name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            include: [
              {
                model: Permission,
                as: 'permissions',
                attributes: ['regionId'],
                where: { scopeId: SCOPES.READ_REPORTS },
              },
            ],
          },
        ],
        attributes: [],
      },
      {
        attributes: [
          'regionId',
          'recipientId',
          'number',
          'id',
          'granteeName',
          'recipientInfo',
        ],
        model: Grant,
        as: 'grants',
        include: [
          {
            attributes: [
              'name',
              'id',
            ],
            model: Recipient,
            as: 'recipient',
          },
        ],
      },
    ],
  });
}

/**
 * Retrieves a group with the given groupId.
 *
 * @param groupId - The ID of the group to retrieve.
 * @returns A Promise that resolves to a GroupResponse object representing the retrieved group.
 * @throws If there is an error while retrieving the group.
 */
export async function group(groupId: number): Promise<GroupResponse> {
  // Find a group with the given groupId
  return Group.findOne({
    attributes: [
      'id',
      'name',
    ],
    where: {
      id: groupId,
    },
    include: [
      {
        model: GroupCollaborator,
        as: 'groupCollaborators',
        required: true,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            required: true,
            attributes: ['name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            include: [
              {
                model: Permission,
                as: 'permissions',
                attributes: ['userId', 'scopeId', 'regionId'],
              },
            ],
          },
        ],
        attributes: [],
      },
      {
        attributes: [
          'regionId',
          'recipientId',
          'number',
          'id',
          'granteeName',
          'recipientInfo',
        ],
        model: Grant,
        as: 'grants',
        include: [
          {
            attributes: [
              'name',
              'id',
            ],
            model: Recipient,
            as: 'recipient',
          },
        ],
      },
    ],
  });
}

/**
 * Retrieves the region IDs of all users who have the specified group as their creator.
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of region IDs.
 * @throws {Error} If there is an error retrieving the region IDs.
 */
async function groupCreatorRegionIds(groupId: number): Promise<number[]> {
  return Permission.findAll({
    attributes: ['regionId'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: [],
        required: true,
        include: [{
          model: GroupCollaborator,
          as: 'groupCollaborators',
          attributes: [],
          required: true,
          where: { groupId },
          include: [{
            model: CollaboratorType,
            as: 'collaboratorType',
            attributes: [],
            required: true,
            where: { name: GROUP_COLLABORATORS.CREATOR },
          }],
        }],
      },
    ],
    where: { scopeId: SCOPES.READ_REPORTS },
    raw: true,
  });
}

/**
 * Retrieves users who have the permission to read reports in the specified group and all the
 * regions they have access to.
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of users who have the permission to read reports
 * in all the regions they have access to.
 * @throws {Error} If there is an error retrieving the users.
 */
export async function potentialCoOwnersAndCohorts(
  groupId: number,
): Promise<{ userId: number, name: string }[]> {
  // Retrieve the regionIds of group creator from permissions to read reports specified by group
  const creatorsRegionIds = await groupCreatorRegionIds(groupId);

  // Retrieve users who have the permission to read reports in all the regionIds obtained above
  const users = await User.findAll({
    attributes: [
      ['id', 'userId'],
      'name',
      [Sequelize.literal('ARRAY_AGG(DISTINCT "roles"."name")'), 'roles'],
    ],
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: [],
        required: true,
        where: {
          scopeId: SCOPES.READ_REPORTS,
          regionId: creatorsRegionIds,
        },
      },
      {
        model: Role,
        as: 'roles',
        required: true,
        attributes: [],
        through: {
          attributes: [],
        },
      },
      {
        model: GroupCollaborator,
        as: 'groupCollaborators',
        attributes: [],
        required: false,
        where: { groupId },
      },
    ],
    where: {
      // Add the top-level where clause for null groupCollaborators.id
      '$groupCollaborators.id$': null,
    },
    group: [
      ['userId', 'ASC'],
      ['name', 'ASC'],
    ],
    having: {
      [Op.and]: [
        // Filter out users who have different regionIds than the ones obtained above
        Sequelize.literal(`COUNT(DISTINCT "permissions"."regionId") FILTER (WHERE "permissions"."scopeId" = ${SCOPES.READ_REPORTS}) = ${creatorsRegionIds.length}`),
        // Filter out users who have do not have site access
        Sequelize.literal(`COUNT(DISTINCT "permissions"."id") FILTER (WHERE "permissions"."scopeId" = ${SCOPES.SITE_ACCESS}) = 1`),
      ],
    },
    raw: true,
  });

  return users;
}

/**
 * Retrieves potential recipient grants based on the provided group ID.
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of potential recipient grants.
 * @throws If there is an error while retrieving the grants.
 */
export async function potentialRecipientGrants(groupId: number): Promise<{
  grantId: number,
  grantNumber: string,
  name: string,
  regionId: number,
  uei: string,
  programType: string,
}[]> {
  // Retrieve the regionIds of group creator from permissions to read reports specified by group
  const creatorsRegionIds = await groupCreatorRegionIds(groupId);

  // Retrieve grants with specific attributes and conditions
  const grants = await Grant.findAll({
    attributes: [
      // Alias the 'id' column as 'grantId'
      ['id', 'grantId'],
      // Alias the 'number' column as 'grantNumber'
      ['number', 'grantNumber'],
      // Alias the 'recipient.columnName' as 'name'
      ['recipient.columnName', 'name'],
      // Include the 'regionId' column
      'regionId',
      // Alias the 'recipient.uei' column as 'uei'
      ['recipient.uei', 'uei'],
      // Alias the 'program.programType' column as 'programType'
      ['program.programType', 'programType'],
    ],
    // Filter grants with 'status' as 'Active' and 'regionId' in creatorsRegionIds
    where: {
      status: 'Active',
      regionId: creatorsRegionIds,
      // Add the top-level where clause for null groupGrants.id
      '$groupGrants.id$': null,
    },
    include: [
      // Include the 'Recipient' model with alias 'recipient'
      {
        model: Recipient,
        as: 'recipient',
        // Exclude all attributes of the 'Recipient' model
        attributes: [],
        // Require a matching record in the 'Recipient' model
        required: true,
      },
      // Include the 'Program' model with alias 'program'
      {
        model: Program,
        as: 'program',
        // Exclude all attributes of the 'Program' model
        attributes: [],
        // Require a matching record in the 'Program' model
        required: true,
      },
      {
        model: GroupGrant,
        as: 'groupGrants',
        attributes: [],
        required: false,
      },
    ],
    // Return raw data instead of Sequelize model instances
    raw: true,
  });

  return grants;
}

/**
 * Edits a group with the specified groupId using the provided data.
 *
 * @param groupId - The ID of the group to edit.
 * @param data - The data to update the group with.
 * @returns A Promise that resolves to the updated group.
 * @throws {Error} If there is an error performing the database operations.
 */
export async function editGroup(groupId: number, data: GroupData): Promise<GroupResponse> {
  const { grants, coOwners, cohorts } = data;

  // Get all existing group grants, current group co-owners, current group cohorts,
  // and collaborator types
  const [
    existingGroupGrants,
    currentGroupCoOwners,
    currentGroupCohorts,
    collaboratorTypeMapping,
  ] = await Promise.all([
    // Find all group grants with matching groupId and grantId
    GroupGrant.findAll({
      where: {
        groupId,
        grantId: data.grants,
      },
    }),
    // Find all group collaborators with matching groupId and collaboratorType 'co-owner'
    GroupCollaborator.findAll({
      where: {
        groupId,
      },
      include: [{
        model: CollaboratorType,
        as: 'collaboratorType',
        required: true,
        where: {
          name: GROUP_COLLABORATORS.CO_OWNER,
        },
        attributes: [],
      }],
    }),
    // Find all group collaborators with matching groupId and collaboratorType 'cohort'
    GroupCollaborator.findAll({
      where: {
        groupId,
      },
      include: [{
        model: CollaboratorType,
        as: 'collaboratorType',
        required: true,
        where: {
          name: GROUP_COLLABORATORS.COHORT,
        },
        attributes: [],
      }],
    }),
    // Find all collaborator types that are valid for 'Groups'
    getCollaboratorTypeMapping('Groups'),
  ]);

  // Determine the grants, co-owners, and cohorts to add and remove
  const [
    addGrants,
    removeGrants,
    addCoOwners,
    removeCoOwners,
    addCohorts,
    removeCohorts,
  ] = [
    // Find grants that are not already existing group grants
    grants
      .filter((grantId) => !existingGroupGrants
        .find((egg) => egg.dataValues.grantId === grantId)),
    // Find existing group grants that are not in the grants list
    existingGroupGrants
      .filter(({
        dataValues: { grantId },
      }: {
        dataValues: { grantId: number },
      }) => !grants.find((grant: number) => grant === grantId))
      .map(({
        dataValues: { grantId },
      }: {
        dataValues: { grantId: number },
      }) => grantId),
    // Find co-owners that are not already current group co-owners
    coOwners
      .filter(({ userId }) => !currentGroupCoOwners
        .find((cgco) => cgco.dataValues.userId === userId)),
    // Find current group co-owners that are not in the co-owners list
    currentGroupCoOwners
      .filter(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => !coOwners.find(({ userId: user }) => user === userId))
      .map(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => userId),
    // Find cohorts that are not already current group cohorts
    cohorts
      .filter(({ userId }) => !currentGroupCohorts
        .find((cgc) => cgc.dataValues.userId === userId)),
    // Find current group cohorts that are not in the cohorts list
    currentGroupCohorts
      .filter(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => !coOwners.find(({ userId: user }) => user === userId))
      .map(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => userId),
  ];

  // Perform the necessary database operations
  await Promise.all([
    // Add new group grants
    addGrants && addGrants.length > 0
      ? GroupGrant.bulkCreate(
        addGrants.map((grantId) => ({ groupId, grantId })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // Remove existing group grants
    removeGrants && removeGrants.length > 0
      ? GroupGrant.destroy(
        {
          where: {
            groupId,
            grantId: removeGrants,
          },
        },
        { individualHooks: true },
      )
      : Promise.resolve(),
    // Add new group co-owners
    addCoOwners && addCoOwners.length > 0
      ? GroupCollaborator.bulkCreate(
        addCoOwners.map((userId) => ({
          groupId,
          userId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.CO_OWNER],
        })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // Remove existing group co-owners
    removeCoOwners && removeCoOwners.length > 0
      ? GroupCollaborator.destroy(
        {
          where: {
            groupId,
            userId: removeCoOwners,
            collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.CO_OWNER],
          },
        },
        { individualHooks: true },
      )
      : Promise.resolve(),
    // Add new group cohorts
    addCohorts && addCohorts.length > 0
      ? GroupCollaborator.bulkCreate(
        addCohorts.map((userId) => ({
          groupId,
          userId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.COHORT],
        })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // Remove existing group cohorts
    removeCohorts && removeCohorts.length > 0
      ? GroupCollaborator.destroy(
        {
          where: {
            groupId,
            userId: removeCohorts,
            collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.COHORT],
          },
        },
        { individualHooks: true },
      )
      : Promise.resolve(),
    // Update group name and isPublic
    Group.update({
      name: data.name.trim(),
      isPublic: data.isPublic,
    }, {
      where: {
        id: groupId,
      },
      returning: true,
    }),
  ]);

  // Return the updated group
  return group(groupId);
}

/**
 * Creates a new group with the given data.
 *
 * @param data - The data for creating the group.
 * @returns A Promise that resolves to the newly created group's response.
 */
export async function createNewGroup(data: GroupData): Promise<GroupResponse> {
  const {
    name,
    isPublic,
    grants,
    coOwners,
    cohorts,
  } = data;

  const [
    newGroup,
    collaboratorTypeMapping,
  ] = await Promise.all([
    // Create a new group with the given name and isPublic flag
    Group.create({
      name: name.trim(),
      isPublic,
    }),
    // Retrieve the collaborator type mapping for groups
    getCollaboratorTypeMapping('Groups'),
  ]);

  await Promise.all([
    // If there are grants, create group grants for each grant ID
    grants && grants.length > 0
      ? GroupGrant.bulkCreate(
        grants.map((grantId) => ({ groupId: newGroup.id, grantId })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // If there are co-owners, create group collaborators with co-owner role
    coOwners && coOwners.length > 0
      ? GroupCollaborator.bulkCreate(
        coOwners.map((userId) => ({
          groupId: newGroup.id,
          userId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.CO_OWNER],
        })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // If there are cohorts, create group collaborators with cohort role
    cohorts && cohorts.length > 0
      ? GroupCollaborator.bulkCreate(
        cohorts.map((userId) => ({
          groupId: newGroup.id,
          userId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.COHORT],
        })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
  ]);

  // Return the newly created group's ID
  return group(newGroup.id);
}

/**
 * Destroys a group and all its associated group grants and collaborators.
 *
 * @param groupId - The ID of the group to be destroyed.
 * @returns A Promise that resolves to the number of destroyed groups.
 * @throws If there is an error while destroying the group, group grants, or group collaborators.
 */
export async function destroyGroup(groupId: number): Promise<number> {
  // first we have to destroy all group grants, and collaborators
  await Promise.all([
    // Destroy all group grants associated with the given groupId
    GroupGrant.destroy({
      where: {
        groupId,
      },
      individualHooks: true,
    }),
    // Destroy all group collaborators associated with the given groupId
    GroupCollaborator.destroy({
      where: {
        groupId,
      },
      individualHooks: true,
    }),
  ]);

  // then we can destroy the group
  // Destroy the group with the given groupId
  return Group.destroy({
    where: {
      id: groupId,
    },
    individualHooks: true,
  });
}
