import { Op } from 'sequelize';
import db from '../models';

const {
  Group,
  Grant,
  GroupGrant,
  Recipient,
  User,
} = db;

interface GroupData {
  userId: number;
  name: string;
  id?: number;
  grants: number[];
  isPublic: boolean;
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

interface GroupResponse {
  id: number;
  name: string;
  grants: GrantsResponse[];
  userId: number;
  isPublic: boolean;
}

export async function groupsByRegion(region: number): Promise<GroupResponse[]> {
  return Group.findAll({
    where: {
      '$grants.regionId$': { [Op.eq]: region },
    },
    include: [
      {
        model: Grant,
        as: 'grants',
        include: [
          {
            model: Recipient,
            as: 'recipient',
          },
        ],
      },
    ],
  });
}

export async function groups(userId: number, regions: number[] = []): Promise<GroupResponse[]> {
  return Group.findAll({
    where: {
      [Op.or]: [
        { userId },
        {
          '$grants.regionId$': { [Op.in]: regions },
          isPublic: true,
        },
      ],
    },
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['id', 'regionId'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name'],
      },
    ],
  });
}

export async function group(groupId: number): Promise<GroupResponse> {
  return Group.findOne({
    where: {
      id: groupId,
    },
    include: [
      {
        model: Grant,
        as: 'grants',
      },
    ],
  });
}

export async function editGroup(groupId: number, data: GroupData): Promise<GroupResponse> {
  // this requires a little bit of gymnastics not to use findOrCreate
  // first we need to get all existing group grants
  const existingGroupGrants = await GroupGrant.findAll({
    where: {
      groupId,
      grantId: data.grants,
    },
  });

  const newGroupGrants = [];

  await Promise.all(data.grants.map(async (grantId) => {
    // then, for each grantId, we check if it exists in the existing group grants
    // if it doesn't, we create a new group grant
    if (!existingGroupGrants.find((groupGrant: GroupGrantData) => groupGrant.grantId === grantId)) {
      const newGroupGrant = await GroupGrant.create({
        groupId,
        grantId,
      });

      return Promise.resolve(newGroupGrants.push(newGroupGrant));
    }

    return Promise.resolve();
  }));

  await GroupGrant.destroy({
    where: {
      grantId: {
        [Op.notIn]: [
          ...newGroupGrants,
          ...existingGroupGrants].map(
          (groupGrant: GroupGrantData) => groupGrant.grantId,
        ),
      },
      groupId,
    },
  });

  // then, we simply need to update the group name
  await Group.update({
    name: data.name.trim(),
    isPublic: data.isPublic,
  }, {
    where: {
      id: groupId,
    },
    returning: true,
  });

  return group(groupId);
}

export async function createNewGroup(data: GroupData): Promise<GroupResponse> {
  const newGroup = await Group.create({
    userId: data.userId,
    name: data.name.trim(),
    isPublic: data.isPublic,
  });

  await Promise.all(data.grants.map(async (grantId) => {
    await GroupGrant.create({
      groupId: newGroup.id,
      grantId,
    });
  }));

  return group(newGroup.id);
}

export async function destroyGroup(groupId: number): Promise<number> {
  // first we have to destroy all group grants
  await GroupGrant.destroy({
    where: {
      groupId,
    },
  });

  // then we can destroy the group
  return Group.destroy({
    where: {
      id: groupId,
    },
  });
}
