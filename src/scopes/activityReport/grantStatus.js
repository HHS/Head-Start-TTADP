import { Op } from 'sequelize';
import { sequelize } from '../../models';

const grantStatusSql = (grantStatus, notWithin) => {
  let where = null;
  if (grantStatus === 'active') {
    where = `"Grants"."status" = '${notWithin ? 'Inactive' : 'Active'}' AND "Grants"."cdi" = false`;
  } else if (grantStatus === 'inactive') {
    where = `"Grants"."status" = '${notWithin ? 'Active' : 'Inactive'}' AND "Grants"."cdi" = false`;
  } else {
    where = `"Grants"."cdi" = ${notWithin ? 'false' : 'true  AND "Grants"."status" = \'Active\''}`;
  }
  return `
  SELECT
  DISTINCT "ActivityRecipients"."activityReportId"
  FROM "ActivityRecipients" "ActivityRecipients"
  INNER JOIN "Grants" "Grants"
  ON "ActivityRecipients"."grantId" = "Grants"."id"
  WHERE ${where}`;
};

export function withGrantStatus(status) {
  return {
    id: {
      [Op.in]: sequelize.literal(`(
        ${grantStatusSql(status[0], false)}
      )`),
    },
  };
}

export function withoutGrantStatus(status) {
  return {
    id: {
      [Op.in]: sequelize.literal(`(
          ${grantStatusSql(status[0], true)}
        )`),
    },
  };
}
