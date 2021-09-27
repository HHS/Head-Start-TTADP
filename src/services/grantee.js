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
    attributes: [
      'id',
    ],
    where: {
      id: granteeId,
    },
    include: [
      {
        //attributes: ['id', 'name', 'number', 'regionId', 'status', 'startDate', 'endDate', 'programSpecialistName', 'granteeId'],
        attributes: ['id', 'granteeId'],
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
  console.log('Grants Use:', grantsToUse);

  // Get List of Grant Ids.
  const grantIds = (grantsToUse && grantsToUse.length > 0 ? [...new Set(grantsToUse.map((grant) => grant.id))] : [0]).join(', ');

  // Get Program Types.
  const arQuery = `SELECT "ActivityRecipients"."grantId", "ActivityReports"."programTypes"
    FROM "ActivityRecipients"
    JOIN "ActivityReports" ON "ActivityRecipients"."activityReportId" = "ActivityReports"."id"
    WHERE "ActivityRecipients"."grantId" IN (${grantIds})`;
  const programTypes = await sequelize.query(arQuery);

  // Grants to Return.
  const grantsToReturn = [];

  // Combine Grants and Program Types.
  grantsToUse.forEach((g) => {
    const grantToAdd = {
      id: g.id,
      name: g.name,
      granteeId: g.granteeId,
      regionId: g.regionId,
      number: g.number,
      status: g.status,
      startDate: g.startDate,
      endDate: g.endDate,
      programSpecialistName: g.programSpecialistName,
      programTypes: [],
    };
    const matchingProgramTypes = programTypes[0].find((e) => g.id === e.grantId);
    if (matchingProgramTypes) {
      grantToAdd.programTypes = matchingProgramTypes.programTypes;
    }
    grantsToReturn.push(grantToAdd);
  });

  console.log('After Loop:', grantsToReturn);

  return { name: !granteeRes ? '' : grantsToReturn, grantsToReturn };
}
