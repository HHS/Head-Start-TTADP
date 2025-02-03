import { Op } from 'sequelize';
import { sequelize } from '../../models';

const constructLiteral = (regions) => {
  const sql = `
    (SELECT DISTINCT "communicationLogId"
     FROM "CommunicationLogRecipients"
     WHERE "recipientId" IN (
       SELECT "id"
       FROM "Recipients"
       WHERE "deleted" = false
         AND "id" IN (
           SELECT "recipientId"
           FROM "Grants"
           WHERE "regionId" IN (${regions.map((regionId) => sequelize.escape(regionId)).join(',')})
         )
     )
    )
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
