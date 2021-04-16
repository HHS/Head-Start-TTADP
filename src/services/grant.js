import { Op } from 'sequelize';
import { Grant, Grantee } from '../models';

// eslint-disable-next-line import/prefer-default-export
export async function cdiGrants(unassigned) {
  const where = [{ cdi: true }];

  if (unassigned === 'true') {
    where.push({ regionId: 13 });
  }

  return Grant.findAll({
    attributes: ['id', 'cdi', 'number', 'status', 'startDate', 'endDate', 'regionId', 'granteeId'],
    where: { [Op.and]: where },
    include: [
      {
        model: Grantee,
        as: 'grantee',
      },
    ],
  });
}

export async function grantById(grantId) {
  return Grant.findOne({
    attributes: ['id', 'cdi', 'number', 'status', 'startDate', 'endDate', 'regionId', 'granteeId'],
    include: [{
      model: Grantee,
      as: 'grantee',
    }],
    where: {
      id: grantId,
    },
  });
}

export async function assignCDIGrant(grant, regionId, granteeId) {
  const updatedGrant = await grant.update({
    regionId,
    granteeId,
  }, {
    fields: ['regionId', 'granteeId'],
    returning: true,
  });
  return updatedGrant;
}
