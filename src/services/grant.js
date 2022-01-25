import { Op } from 'sequelize';
import { sequelize, Grant, Recipient } from '../models';

export async function cdiGrants(unassigned, active) {
  const where = [{ cdi: true }];

  if (unassigned === 'true') {
    where.push({ regionId: 13 });
  }

  if (active === 'true') {
    where.push({ status: 'Active' });
  }

  return Grant.findAll({
    attributes: ['id', 'cdi', 'number', 'status', 'startDate', 'endDate', 'regionId', 'recipientId'],
    where: { [Op.and]: where },
    include: [
      {
        model: Recipient,
        as: 'recipient',
      },
    ],
    order: [
      ['id', 'ASC'],
    ],
  });
}

export async function statesByGrantRegion(regions) {
  const grants = await Grant.findAll({
    attributes: [
      [sequelize.fn('DISTINCT', sequelize.col('stateCode')), 'stateCode'],
    ],
    where: {
      stateCode: {
        [Op.not]: null,
      },
      regionId: regions,
    },
    raw: true,
    order: ['stateCode'],
  });

  return grants.map((grant) => grant.stateCode);
}

export async function grantById(grantId) {
  return Grant.findOne({
    attributes: ['id', 'cdi', 'number', 'status', 'startDate', 'endDate', 'regionId', 'recipientId'],
    include: [{
      model: Recipient,
      as: 'recipient',
    }],
    where: {
      id: grantId,
    },
  });
}

export async function assignCDIGrant(grant, regionId, recipientId) {
  const updatedGrant = await grant.update({
    regionId,
    recipientId,
  }, {
    fields: ['regionId', 'recipientId'],
    returning: true,
  });
  return updatedGrant;
}
