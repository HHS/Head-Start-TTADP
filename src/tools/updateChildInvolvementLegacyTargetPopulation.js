import { Op } from 'sequelize';
import {
  ActivityReport,
} from '../models';
import { auditLogger } from '../logger';

export default async function updateChildInvolvementLegacyTargetPopulation() {
  const legacyReports = await ActivityReport.findAll({
    attributes: [
      'id',
      'imported',
    ],
    where: {
      [Op.and]: [
        {
          imported: { [Op.not]: null },
        },
        {
          imported: {
            targetPopulations: {
              [Op.like]: '%Affected by Child Welfare involvement%',
            },
          },
        },
      ],
    },
  });

  auditLogger.info(`${legacyReports.length ? legacyReports.length : 0} reports with affected data found...`);
  return Promise.all(legacyReports.map(async (report) => {
    const newTgtPop = report.imported.targetPopulations.replace('Affected by Child Welfare involvement', 'Affected by Child Welfare Involvement');
    auditLogger.info(`Changing imported target population value from: ${report.imported.targetPopulations} to: ${newTgtPop}`);
    const updatedImported = { ...report.imported, targetPopulations: newTgtPop };
    return report.update({
      imported: updatedImported,
    });
  }));
}
