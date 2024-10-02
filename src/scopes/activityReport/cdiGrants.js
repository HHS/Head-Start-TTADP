import { Op } from 'sequelize';
import { sequelize } from '../../models';

const cdiGrantsSql = (cdiStatus, withCdi) => {
  let status = null;
  if (cdiStatus === 'active' || cdiStatus === 'inactive') {
    status = cdiStatus.charAt(0).toUpperCase() + cdiStatus.slice(1);
  }

  const isOrIsNot = withCdi ? '=' : '!=';

  return `
SELECT
  DISTINCT "ActivityRecipients"."activityReportId"
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
  // If its NOT cdi grants we use not in clause.
  return cdiStatus[0] !== 'active' && cdiStatus[0] !== 'inactive'
    ? {
      id: {
        [Op.notIn]: sequelize.literal(`(
          ${cdiGrantsSql(cdiStatus[0], false)}
        )`),
      },
    }
    : {
      id: {
        [Op.in]: sequelize.literal(`(
          ${cdiGrantsSql(cdiStatus[0], false)}
        )`),
      },
    };
}
