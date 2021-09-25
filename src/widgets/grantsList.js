import { Op } from 'sequelize';
import { Grant, Grantee, sequelize } from '../models';
import { DECIMAL_BASE } from '../constants';

export default async function grants(scopes, query) {
  const granteeId = parseInt(query['grantee.in'], DECIMAL_BASE);

  const grantsRes = await Grantee.findByPk(
    granteeId,
    {
      attributes: ['id'],
      include: [
        {
          attributes: ['id', 'number', 'status', 'regionId', 'startDate', 'endDate'],
          where: {
            [Op.and]: [
              scopes,
            ],
          },
          model: Grant,
          as: 'grants',
        },
      ],
    },
  );

  // Get Grants.
  const grantsToUse = grantsRes ? grantsRes.grants : [];

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
      regionId: g.regionId,
      number: g.number,
      status: g.status,
      startDate: g.startDate,
      endDate: g.endDate,
      programTypes: [],
    };
    const matchingProgramTypes = programTypes[0].find((e) => g.id === e.grantId);
    if (matchingProgramTypes) {
      grantToAdd.programTypes = matchingProgramTypes.programTypes;
    }
    grantsToReturn.push(grantToAdd);
  });

  return grantsToReturn;
}
