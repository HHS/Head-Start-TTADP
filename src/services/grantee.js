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
    order: [
      [{ model: Grant, as: 'grants' }, 'endDate', 'DESC'], [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
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

  // Grants to Return.
  const grantsToReturn = [];
  // Combine Grants and Program Types.
  if (grantsToUse.length > 0) {
    /*
    granteeRes.grants.forEach((g) => {
      const matchingProgramTypes = programTypes[0].find((e) => g.id === e.grantId);
      if (matchingProgramTypes) {
        // eslint-disable-next-line no-param-reassign
        g.programTypes = matchingProgramTypes.programTypes;
      }
    });
    */
    granteeRes.grants.forEach((g) => {
      const grantToAdd = {
        id: g.id,
        number: g.number,
        regionId: g.regionId,
        status: g.status,
        startDate: g.startDate,
        endDate: g.endDate,
        programSpecialistName: g.programSpecialistName,
        granteeId: g.granteeId,
        programTypes: [],
      };

      const matchingProgramTypes = programTypes[0].find((e) => g.id === e.grantId);
      if (matchingProgramTypes) {
        // eslint-disable-next-line no-param-reassign
        grantToAdd.programTypes = matchingProgramTypes.programTypes;
      }

      grantsToReturn.push(grantToAdd);
    });
  }

  // eslint-disable-next-line max-len
  // return { name: !granteeRes ? '' : granteeRes.name, grantsToReturn: grantsToUse.length > 0 ? granteeRes.grants : [] };
  return { name: !granteeRes ? '' : granteeRes.name, grantsToReturn: grantsToReturn.length > 0 ? grantsToReturn : [] };
}
