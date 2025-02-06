import { Op } from 'sequelize';
import { sequelize } from '../../models';

const constructLiteral = (regions) => {
  const sql = `
    (SELECT DISTINCT "communicationLogId"
     FROM "CommunicationLogRecipients" clr
     JOIN "Recipients" r ON clr."recipientId" = r."id"
     JOIN "Grants" gr ON r.id = gr."recipientId"
     WHERE r."deleted" = false
     AND gr."regionId" IN (${regions.map((regionId) => sequelize.escape(regionId)).join(',')}))
  `;

  return sequelize.literal(sql);
};

export function withRegion(regions) {
  return {
    id: {
      [Op.in]: constructLiteral(regions),
    },
  };
}

export function withoutRegion(regions) {
  return {
    id: {
      [Op.notIn]: constructLiteral(regions),
    },
  };
}
