import { Op, WhereOptions } from 'sequelize';
import { GROUP_SHARED_WITH } from '@ttahub/common';
import db, { sequelize } from '../models';
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
  userId: number;
  grants: number[];
  isPublic: boolean;
  creator: { userId: number },
  coOwners?: number[];
  individuals?: number[];
  sharedWith?: GROUP_SHARED_WITH;
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

export interface GroupResponse {
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
      ...(groupId && { id: { [Op.not]: groupId } }),
    },
  });
  // Return true if the name is available, false otherwise.
  return !existingGroup;
}

/**
 * Retrieves groups by region.
 *
 * @param region - The region ID to filter the groups by.
 * @returns A promise that resolves to an array of GroupResponse objects.
 * @throws This function does not throw any exceptions.
 */
export async function groupsByRegion(region: number, userId: number): Promise<GroupResponse[]> {
  return Group.findAll({
    attributes: [
      'id',
      'name',
    ],
    where: {
      '$grants.regionId$': region,
      [Op.or]: [
        {
          isPublic: true,
          sharedWith: GROUP_SHARED_WITH.EVERYONE,
        },
        {
          '$groupCollaborators.id$': { [Op.not]: null },
        },
      ],
    },
    include: [
      {
        model: GroupCollaborator,
        as: 'groupCollaborators',
        required: false,
        attributes: [],
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: [],
          required: true,
          include: [{
            model: Permission,
            as: 'permissions',
            attributes: [],
            required: true,
            where: { regionId: region },
            // through: { attributes: [] },
          }],
        }],
      },
      {
        model: Grant,
        as: 'grants',
        attributes: [
          'regionId',
          'recipientId',
          'number',
          'id',
          'granteeName',
          'recipientInfo',
        ],
        include: [
          {
            model: Recipient,
            as: 'recipient',
            attributes: [
              'name',
              'id',
            ],
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
  const returnGroups = await Group.findAll({
    attributes: [
      'id',
      'name',
      'isPublic',
      'updatedAt',
      'sharedWith',
    ],
    where: {
      '$grants.regionId$': { [Op.in]: regions },
      [Op.or]: [
        {
          isPublic: true,
          sharedWith: GROUP_SHARED_WITH.EVERYONE,
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
        attributes: ['id'],
        required: true,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            required: true,
            attributes: ['id', 'name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            required: true,
            include: [{
              model: Permission,
              as: 'permissions',
              attributes: [],
              required: true,
              where: {
                scopeId: [
                  SCOPES.READ_REPORTS,
                  SCOPES.READ_WRITE_REPORTS,
                  SCOPES.APPROVE_REPORTS,
                ],
              },
            }],
          },
        ],
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

  // We need to get all the collaborators after we have the group ids.
  const allGroupCollaborators = await GroupCollaborator.findAll({
    attributes: [
      'id',
      'groupId',
      'userId',
      'updatedAt',
    ],
    where: {
      groupId: returnGroups.map((g) => g.id),
    },
    include: [
      {
        model: CollaboratorType,
        as: 'collaboratorType',
        required: true,
        attributes: ['id', 'name'],
        where: {
          name: [
            GROUP_COLLABORATORS.CREATOR,
            GROUP_COLLABORATORS.EDITOR,
            GROUP_COLLABORATORS.CO_OWNER,
            GROUP_COLLABORATORS.SHARED_WITH,
          ],
        },
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name'],
      },
    ],
  });

  // Get the creator of the group.
  const finalGroups = returnGroups.map((g) => {
    const groupCollaborators = allGroupCollaborators.filter((gc) => gc.groupId === g.id);
    // Creator.
    const creator = groupCollaborators.find(
      (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.CREATOR,
    );

    // Editor.
    const mostRecentEditor = (groupCollaborators.filter(
      (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.EDITOR,
    ).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ) || [creator])[0];

    // Co-owners.
    const coOwners = groupCollaborators.filter(
      (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.CO_OWNER,
    );

    // Shared with.
    const individuals = groupCollaborators.filter(
      (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.SHARED_WITH,
    );

    return {
      ...g.dataValues,
      editor: mostRecentEditor ? {
        id: mostRecentEditor.user.id,
        name: mostRecentEditor.user.name,
      } : null,
      creator: creator ? { id: creator.user.id, name: creator.user.name } : null,
      coOwners: coOwners
        ? coOwners.map((coOwner) => ({ id: coOwner.user.id, name: coOwner.user.name }))
        : null,
      individuals: individuals
        ? individuals.map((individual) => ({ id: individual.user.id, name: individual.user.name }))
        : null,
    };
  });

  return finalGroups;
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
  const returnGroup = await Group.findOne({
    attributes: [
      'id',
      'name',
      'isPublic',
      'updatedAt',
      'sharedWith',
    ],
    where: {
      id: groupId,
    },
    include: [
      {
        model: GroupCollaborator,
        as: 'groupCollaborators',
        required: true,
        attributes: ['id', 'userId', 'groupId', 'updatedAt'],
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            required: true,
            attributes: ['id', 'name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
            required: true,
            include: [{
              model: Permission,
              as: 'permissions',
              attributes: [],
              required: true,
              // through: { attributes: [] },
            }],
          },
        ],
      },
      {
        model: Grant,
        as: 'grants',
        attributes: [
          'regionId',
          'recipientId',
          'number',
          'id',
          'granteeName',
          'recipientInfo',
          'recipientNameWithPrograms',
        ],
        include: [
          {
            model: Recipient,
            as: 'recipient',
            attributes: [
              'name',
              'id',
            ],
          },
          {
            model: Program,
            as: 'programs',
            attributes: ['id', 'programType', 'grantId'],
          },
        ],
      },
    ],
  });

  const allGroupCollaborators = await GroupCollaborator.findAll({
    attributes: [
      'id',
      'groupId',
      'userId',
      'updatedAt',
      'collaboratorTypeId',
    ],
    where: {
      groupId: returnGroup.id,
    },
  });

  // Get the creator of the group.
  const creator = returnGroup.groupCollaborators.find(
    (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.CREATOR,
  );

  // Get the editor.
  const mostRecentEditor = (returnGroup.groupCollaborators.filter(
    (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.EDITOR,
  ).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  ) || [creator])[0];

  const coOwners = (returnGroup.groupCollaborators.filter(
    (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.CO_OWNER,
  ).sort(
    (a, b) => a.user.name.localeCompare(b.user.name),
  ) || []);

  const individuals = (returnGroup.groupCollaborators.filter(
    (gc) => gc.collaboratorType.name === GROUP_COLLABORATORS.SHARED_WITH,
  ).sort(
    (a, b) => a.user.name.localeCompare(b.user.name),
  ) || []);

  // Return the group with the creator.
  return {
    ...returnGroup.dataValues,
    editor: mostRecentEditor ? {
      id: mostRecentEditor.user.id,
      name: mostRecentEditor.user.name,
    } : null,
    coOwners: coOwners.map((co) => ({ id: co.user.id, name: co.user.name })),
    individuals: individuals.map((sw) => ({ id: sw.user.id, name: sw.user.name })),
    creator: creator ? { id: creator.user.id, name: creator.user.name } : null,
  };
}

/**
 * Retrieves the region IDs of the current user (creator).
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of region IDs.
 * @throws {Error} If there is an error retrieving the region IDs.
 */
async function creatorRegionIds(userId: number): Promise<number[]> {
  // Return a distinct list of region IDs
  const regionResult: { regionId: number }[] = await Permission.findAll({
    attributes: ['regionId'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: [],
        required: true,
        where: { id: userId },
      },
    ],
    where: {
      scopeId: [
        SCOPES.READ_REPORTS,
        SCOPES.READ_WRITE_REPORTS,
        SCOPES.APPROVE_REPORTS,
      ],
    },
    raw: true,
  });

  return [...new Set(regionResult.map(({ regionId }) => regionId))];
}

/**
 * Retrieves the region IDs of all users who have the specified group as their creator.
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of region IDs.
 * @throws {Error} If there is an error retrieving the region IDs.
 */
async function groupCreatorRegionIds(groupId: number): Promise<number[]> {
  // Return a distinct list of region IDs
  const regionResult: { regionId: number }[] = await Permission.findAll({
    attributes: ['regionId'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: [],
        required: true,
        include: [
          {
            model: GroupCollaborator,
            as: 'groupCollaborators',
            attributes: [],
            required: true,
            where: { groupId },
            include: [
              {
                model: CollaboratorType,
                as: 'collaboratorType',
                attributes: [],
                required: true,
                where: { name: GROUP_COLLABORATORS.CREATOR },
              },
            ],
          },
        ],
      },
    ],
    where: {
      scopeId: [
        SCOPES.READ_REPORTS,
        SCOPES.READ_WRITE_REPORTS,
        SCOPES.APPROVE_REPORTS,
      ],
    },
    raw: true,
  });

  return [...new Set(regionResult.map(({ regionId }) => regionId))];
}

/**
 * Retrieves users who have the permission to access reports in the specified group and all the
 * regions they have access to.
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of users who have the permission to access reports
 * in all the regions they have access to.
 * @throws {Error} If there is an error retrieving the users.
 */
export async function potentialGroupUsers(
  groupId: number,
  userId: number,
): Promise<{ userId: number, name: string }[]> {
  if (groupId === null && userId === null) return [];

  // Retrieve the regionIds of group creator or if we haven't saved yet the user id.
  const creatorsRegionIds = groupId === null
    ? await creatorRegionIds(userId)
    : await groupCreatorRegionIds(groupId);

  // Retrieve users who have the permission to access reports in all the regionIds obtained above
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let whereClause:WhereOptions = {
    // Add the top-level where clause for null groupCollaborators.id
    '$groupCollaborators.id$': null,
  };

  if (groupId === null) {
    // If the group is not saved yet, we need to filter out the current user.
    whereClause = {
      ...whereClause,
      id: {
        [Op.not]: userId,
      },
    };
  }

  const users = await User.findAll({
    attributes: [
      ['id', 'userId'],
      [sequelize.col('"User"."name"'), 'name'],
      [Sequelize.literal('ARRAY_AGG(DISTINCT "roles"."name")'), 'roles'],
    ],
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: [],
        required: true,
        where: {
          scopeId: [
            SCOPES.READ_REPORTS,
            SCOPES.READ_WRITE_REPORTS,
            SCOPES.APPROVE_REPORTS,
            SCOPES.SITE_ACCESS,
          ],
          // We only set site access permission on the user for region 14.
          regionId: [...creatorsRegionIds, 14],
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
        include: [{
          model: CollaboratorType.unscoped(),
          as: 'collaboratorType',
          attributes: [],
          required: true,
          where: {
            name: [
              GROUP_COLLABORATORS.CREATOR,
              GROUP_COLLABORATORS.CO_OWNER,
            ],
          },
        }],
      },
    ],
    where: whereClause,
    group: [
      ['userId', 'ASC'],
      [sequelize.col('"User"."name"'), 'ASC'],
    ],
    having: {
      [Op.and]: [
        Sequelize.literal(`COUNT(DISTINCT "permissions"."regionId")
        FILTER
        (
          WHERE
            "permissions"."scopeId" = ${SCOPES.READ_REPORTS}
            OR "permissions"."scopeId" = ${SCOPES.READ_WRITE_REPORTS}
            OR "permissions"."scopeId" = ${SCOPES.APPROVE_REPORTS}
          ) = ${creatorsRegionIds.length}`),
        // The below ensures that the user has site access in at least one region permission.
        Sequelize.literal(`COUNT(DISTINCT "permissions"."id") FILTER (WHERE "permissions"."scopeId" = ${SCOPES.SITE_ACCESS}) >= 1`),
      ],
    },
    raw: true,
  });
  return users;
}

/**
 * Retrieves users who have the permission to access reports in the specified group and all the
 * regions they have access to.
 *
 * @param groupId - The ID of the group.
 * @returns A promise that resolves to an array of users who have the permission to access reports
 * in all the regions they have access to.
 * @throws {Error} If there is an error retrieving the users.
 */
export async function potentialSharedWith(
  groupId: number,
): Promise<{ userId: number, name: string }[]> {
  // Retrieve the regionIds of group creator from permissions to access reports specified by group
  const creatorsRegionIds = await groupCreatorRegionIds(groupId);

  // Retrieve users who have the permission to access reports in any the regionIds obtained above
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
          scopeId: [
            SCOPES.READ_REPORTS,
            SCOPES.READ_WRITE_REPORTS,
            SCOPES.APPROVE_REPORTS,
          ],
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
        Sequelize.literal(`COUNT(DISTINCT "permissions"."regionId") FILTER (WHERE "permissions"."scopeId" = ${SCOPES.READ_REPORTS}) > 0`),
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
export async function potentialRecipientGrants(
  data: { groupId?: number, userId?: number },
): Promise<{
    grantId: number,
    grantNumber: string,
    name: string,
    regionId: number,
    uei: string,
    programType: string,
  }[]> {
  const {
    groupId,
    userId,
  } = data;
  if (groupId === null && userId === null) return [];

  // Retrieve the regionIds of group creator from permissions to read reports specified by group
  let creatorsRegionIds = !groupId
    ? await Permission.findAll({
      attributes: ['regionId'],
      where: {
        userId,
        scopeId: [
          SCOPES.READ_REPORTS,
          SCOPES.READ_WRITE_REPORTS,
          SCOPES.APPROVE_REPORTS,
        ],
      },
      group: [['regionId', 'ASC']],
    })
    : await groupCreatorRegionIds(groupId);

  if (!groupId) {
    creatorsRegionIds = creatorsRegionIds.map(({ regionId }) => regionId);
  }

  // Retrieve grants with specific attributes and conditions
  const grants = await Grant.findAll({
    attributes: [
      // Alias the 'id' column as 'grantId'
      ['id', 'grantId'],
      // Alias the 'number' column as 'grantNumber'
      ['number', 'grantNumber'],
      [sequelize.col('"recipient"."id"'), 'recipientId'],
      // Alias the 'recipient.name' as 'name'
      [sequelize.col('"recipient"."name"'), 'name'],
      // Include the 'regionId' column
      'regionId',
      // Alias the 'recipient.uei' column as 'uei'
      [sequelize.col('"recipient"."uei"'), 'uei'],
      // Alias the 'program.programType' column as 'programType'\
      // Array aggregate the 'program.programType' column as 'programType'
      [Sequelize.literal('ARRAY_AGG(DISTINCT "programs"."programType")'), 'programTypes'],
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
        // attributes: ['id', 'name', 'uei'],
        // Require a matching record in the 'Recipient' model
        required: true,
      },
      // Include the 'Program' model with alias 'program'
      {
        model: Program,
        as: 'programs',
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
        where: {
          groupId: groupId || null,
        },
      },
    ],
    // Group by recipient id and grant id (programs creates dupes).
    group: [
      sequelize.col('"recipient"."id"'),
      sequelize.col('"recipient"."name"'),
      sequelize.col('"recipient"."uei"'),
      sequelize.col('"Grant"."id"'),
      sequelize.col('"Grant"."number"'),
      sequelize.col('"Grant"."regionId"'),
    ],
    // Order by recipient name.
    order: [
      [sequelize.col('"recipient"."name"'), 'ASC'],
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
  const {
    grants,
    coOwners = [],
    individuals = [],
    sharedWith,
  } = data;

  // Get all existing group grants, current group co-owners, current group shareWiths,
  // and collaborator types
  const [
    existingGroupGrants,
    currentGroupCoOwners,
    currentGroupIndividuals,
    collaboratorTypeMapping,
  ] = await Promise.all([
    // Find all group grants with matching groupId and grantId
    GroupGrant.findAll({
      where: {
        groupId,
        // grantId: data.grants, // Do we want all the grants for this group?
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
    // Find all group collaborators with matching groupId and collaboratorType 'shareWith'
    GroupCollaborator.findAll({
      where: {
        groupId,
      },
      include: [{
        model: CollaboratorType,
        as: 'collaboratorType',
        required: true,
        where: {
          name: GROUP_COLLABORATORS.SHARED_WITH,
        },
        attributes: [],
      }],
    }),
    // Find all collaborator types that are valid for 'Groups'
    getCollaboratorTypeMapping('Groups'),
  ]);

  // Determine the grants, co-owners, and shareWiths to add and remove
  const [
    addGrants,
    removeGrants,
    addCoOwners,
    removeCoOwners,
    addShareWiths,
    removeShareWiths,
  ] = [
    // Find grants that are not already existing group grants
    grants
      .filter((grantId) => !existingGroupGrants
        .find((egg: { dataValues: { grantId: number } }) => egg.dataValues.grantId === grantId)),
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
      .filter((id) => !currentGroupCoOwners
        .find((cgco: { dataValues: { userId: number } }) => cgco.dataValues.userId === id)),
    // Find current group co-owners that are not in the co-owners list
    currentGroupCoOwners
      .filter(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => !coOwners.find((id) => id === userId))
      .map(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => userId),
    // Find shareWiths that are not already current group shareWiths
    individuals
      .filter((id: number) => !currentGroupIndividuals
        .find((cgc: { dataValues: { userId: number } }) => cgc.dataValues.userId === id)),
    // Find current group shareWiths that are not in the shareWiths list
    currentGroupIndividuals
      .filter(({
        dataValues: { userId },
      }: {
        dataValues: { userId: number },
      }) => !individuals.find((id) => id === userId))
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
    // Add new group shareWiths
    addShareWiths && addShareWiths.length > 0
      ? GroupCollaborator.bulkCreate(
        addShareWiths.map((userId) => ({
          groupId,
          userId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.SHARED_WITH],
        })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // Remove existing group shareWiths
    removeShareWiths && removeShareWiths.length > 0
      ? GroupCollaborator.destroy(
        {
          where: {
            groupId,
            userId: removeShareWiths,
            collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.SHARED_WITH],
          },
        },
        { individualHooks: true },
      )
      : Promise.resolve(),
    // Update group name and isPublic
    Group.update({
      name: data.name.trim(),
      isPublic: data.isPublic,
      sharedWith,
    }, {
      where: {
        id: groupId,
      },
      individualHooks: true,
      returning: true,
    }),
  ]);

  const allGroupCollaborators = await GroupCollaborator.findAll({
    attributes: [
      'id',
      'groupId',
      'userId',
      'updatedAt',
      'collaboratorTypeId',
    ],
    where: {
      groupId,
    },
  });

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
    individuals,
    sharedWith,
  } = data;

  const [
    newGroup,
    collaboratorTypeMapping,
  ] = await Promise.all([
    // Create a new group with the given name and isPublic flag
    Group.create({
      name: name.trim(),
      sharedWith,
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
        coOwners.map((coOwnerUserId) => ({
          groupId: newGroup.id,
          userId: coOwnerUserId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.CO_OWNER],
        })),
        { validate: true, individualHooks: true },
      )
      : Promise.resolve(),
    // If there are shareWiths, create group collaborators with shareWith role
    individuals && individuals.length > 0
      ? GroupCollaborator.bulkCreate(
        individuals.map((sharedWithUserId) => ({
          groupId: newGroup.id,
          userId: sharedWithUserId,
          collaboratorTypeId: collaboratorTypeMapping[GROUP_COLLABORATORS.SHARED_WITH],
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
