import { Op } from 'sequelize';
import { sequelize } from '../../models';

const cdiGrantsSql = (cdiStatus, withCdi) => {
  let status = null;
  if (cdiStatus === 'Active' || cdiStatus === 'Inactive') {
    status = cdiStatus;
  }

  const isOrIsNot = withCdi ? '=' : '!=';

  return `
SELECT
  "ActivityRecipients"."activityReportId"
  FROM "ActivityRecipients" "ActivityRecipients"
  INNER JOIN "Grants" "Grants"
  ON "ActivityRecipients"."grantId" = "Grants"."id"
    AND "Grants"."cdi" = ${!withCdi && cdiStatus === 'CDI' ? 'false' : 'true'}
    ${status ? `AND "Grants"."status" ${isOrIsNot} '${status}'` : ''}`;
};

export function withCdiGrants(cdiStatus) {
  return {
    id: {
      [Op.in]: sequelize.literal(`(
        ${cdiGrantsSql(cdiStatus[0], true)}
      )`),
    },
  };
}

export function withoutCdiGrants(cdiStatus) {
  return {
    id: {
      [Op.in]: sequelize.literal(`(
          ${cdiGrantsSql(cdiStatus[0], false)}
        )`),
    },
  };
}
