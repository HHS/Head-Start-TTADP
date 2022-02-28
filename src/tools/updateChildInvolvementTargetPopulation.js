import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { auditLogger } from '../logger';

export default async function updateChildInvolvementTargetPopulation() {
  auditLogger.info('Updating target populations...');

  const badTargetPopulation = 'Affected by Child Welfare involvement';
  const goodTargetPopulation = 'Affected by Child Welfare Involvement';

  const reports = await ActivityReport.findAll({
    attributes: ['id', 'targetPopulations'],
    where: {
      targetPopulations: { [Op.contains]: [badTargetPopulation] },
    },
  });

  auditLogger.info(`${reports.length ? reports.length : 0} reports with affected data found...`);

  return Promise.all(reports.map(async (report) => {
    const indexOf = report.targetPopulations.indexOf(badTargetPopulation);
    const newTgtPop = [...report.targetPopulations];
    newTgtPop[indexOf] = goodTargetPopulation;
    auditLogger.info(`changing target population value from: ${report.targetPopulations} to: ${newTgtPop}`);
    return report.update({
      targetPopulations: newTgtPop,
    });
  }));
}
