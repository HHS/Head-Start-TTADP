import { Op } from 'sequelize';
import { ActivityReport, sequelize } from '../models';
import { auditLogger } from '../logger';
import { CREATOR_ROLES_REPORTS_TO_UPDATE } from './creatorRolesToUpdate';

const rolesToUpdate = [
  { role: 'Early Childhood Specialist', ids: [], legacyIds: [] },
  { role: 'Family Engagement', ids: [], legacyIds: [] },
  { role: 'Grantee Specialist', ids: [], legacyIds: [] },
  { role: 'Health Specialist', ids: [], legacyIds: [] },
  { role: 'System Specialist', ids: [], legacyIds: [] },
];

export default async function updateCreatorRoles(
  updateFileValues = CREATOR_ROLES_REPORTS_TO_UPDATE,
) {
  let updateCount = 0;
  // Loop and Bucket Report Ids by Role.
  updateFileValues.forEach((r) => {
    const index = rolesToUpdate.findIndex((item) => item.role === r.role);
    if (index !== -1) {
      if (r.id.includes('-AR-')) {
        // Add to Legacy Ids.
        rolesToUpdate[index].legacyIds.push(r.id);
        updateCount += 1;
      } else {
        // Add to regular Ids.
        const numId = parseInt(r.id, 10);
        rolesToUpdate[index].ids.push(numId);
        updateCount += 1;
      }
    }
  });

  const idsToUpdate = rolesToUpdate.filter((r) => r.ids.length > 0);
  const legacyIdsToUpdate = rolesToUpdate.filter((r) => r.legacyIds.length > 0);

  auditLogger.info(`Attempting to update creator role for ${updateCount} report(s)...`);

  // Loop and Update Reports by Role.
  const res = await sequelize.transaction(async (transaction) => {
    // Update Regular Reports.
    const reportsRes = await Promise.all(idsToUpdate.map(async (r) => {
      const arUpdate = await ActivityReport.update(
        {
          creatorRole: r.role,
        },
        {
          where: {
            id: r.ids,
            creatorRole: { [Op.is]: null },
          },
          transaction,
          returning: true,
        },
      );
      return arUpdate[0];
    }));

    // Update Legacy Reports.
    const legacyReportsRes = await Promise.all(legacyIdsToUpdate.map(async (r) => {
      const arUpdate = await ActivityReport.update(
        {
          creatorRole: r.role,
        },
        {
          where: {
            legacyId: r.legacyIds,
            creatorRole: { [Op.is]: null },
          },
          transaction,
          returning: true,
        },
      );
      return arUpdate[0];
    }));
    return { reports: reportsRes, legacy: legacyReportsRes };
  });
  const totalReports = res.reports.reduce((runningTotal, next) => runningTotal + next, 0);
  const totalLegacyReports = res.legacy.reduce((runningTotal, next) => runningTotal + next, 0);

  auditLogger.info(`...Updated ${totalReports} Report(s) with new creator role`);
  auditLogger.info(`...Updated ${totalLegacyReports} Legacy Report(s) with new creator role`);
}
