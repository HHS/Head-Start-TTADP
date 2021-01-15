import { Op } from 'sequelize';

import {
  User,
  Permission,
} from '../models';

export async function userById(userId) {
  return User.findOne({
    attributes: ['id', 'name', 'hsesUserId', 'email', 'phoneNumber', 'homeRegionId', 'role'],
    where: {
      id: {
        [Op.eq]: userId,
      },
    },
    include: [
      { model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] },
    ],
  });
}

export async function usersWithPermissions(regions, scopes) {
  return User.findAll({
    attributes: ['id', 'name'],
    raw: true,
    where: {
      [Op.and]: [
        { '$permissions.scopeId$': scopes },
        { '$permissions.regionId$': regions },
      ],
    },
    include: [
      { model: Permission, as: 'permissions', attributes: [] },
    ],
  });
}
