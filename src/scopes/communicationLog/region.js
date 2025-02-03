import { Op } from 'sequelize';
import { sequelize } from '../../models';

export function withRegion(regions) {
  return sequelize.where(
    sequelize.literal(`(SELECT "communicationLogId" FROM "CommunicationLogRecipients" WHERE "recipientId" IN (SELECT "id" FROM "Recipients" WHERE "deleted" = false AND "id" IN (SELECT "recipientId" FROM "Grants" WHERE "regionId" IN (${regions.map((regionId) => sequelize.escape(regionId)).join(',')}))))`),
  );
}

export function withoutRegion(regions) {
  return sequelize.where(
    sequelize.literal(`(SELECT "communicationLogId" FROM "CommunicationLogRecipients" WHERE "recipientId" IN (SELECT "id" FROM "Recipients" WHERE "deleted" = false AND "id" IN (SELECT "recipientId" FROM "Grants" WHERE "regionId" NOT IN (${regions.map((regionId) => sequelize.escape(regionId)).join(',')}))))`),
  );
}
