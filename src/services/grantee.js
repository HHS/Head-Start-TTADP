import { Op } from 'sequelize';
import { Grant, Grantee, sequelize } from '../models';

export async function allGrantees() {
  return Grantee.findAll({
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
      },
    ],
  });
}

export async function granteeByScopes(granteeId, grantScopes) {
  const granteeRes = await Grantee.findOne({
    attributes: ['id', 'name'],
    where: {
      id: granteeId,
    },
    include: [
      {
        attributes: ['id', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: [
            grantScopes,
          ],
        },
      },
    ],
  });

  // Get Grants.
  const grantsToUse = granteeRes ? granteeRes.grants : [];

  // Get List of Grant Ids.
  const grantIds = (grantsToUse && grantsToUse.length > 0 ? [...new Set(grantsToUse.map((grant) => grant.id))] : [0]).join(', ');

  // Get Program Types.
  const arQuery = `SELECT "ActivityRecipients"."grantId", "ActivityReports"."programTypes"
    FROM "ActivityRecipients"
    JOIN "ActivityReports" ON "ActivityRecipients"."activityReportId" = "ActivityReports"."id"
    WHERE "ActivityRecipients"."grantId" IN (${grantIds})`;
  const programTypes = await sequelize.query(arQuery);

  // Combine Grants and Program Types.
  if (grantsToUse.length > 0) {
    granteeRes.grants.forEach((g) => {
      const matchingProgramTypes = programTypes[0].find((e) => g.id === e.grantId);
      if (matchingProgramTypes) {
        // eslint-disable-next-line no-param-reassign
        g.programTypes = matchingProgramTypes.programTypes;
      }
    });
  }
  return { name: !granteeRes ? '' : granteeRes.name, grantsToReturn: grantsToUse.length > 0 ? granteeRes.grants : [] };
}
