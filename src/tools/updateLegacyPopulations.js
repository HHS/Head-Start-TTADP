import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { auditLogger } from '../logger';

const newPopulations = {
  'Infant/Toddlers': 'Infants and Toddlers (ages birth to 3)',
  Preschool: 'Preschool (ages 3-5)',
  'Affected by Homelessness': 'Children Experiencing Homelessness',
};

export default async function updateLegacyPopulations() {
  auditLogger.info(`Updating legacy target population data...
  
  `);

  const reports = await ActivityReport.findAll({
    where: {
      targetPopulations: {
        [Op.or]: [
          {
            [Op.contains]: ['Infant/Toddlers'],
          },
          {
            [Op.contains]: ['Preschool'],
          },
          {
            [Op.contains]: ['Affected by Homelessness'],
          },
        ],
      },
    },
  });

  if (!reports.count) {
    auditLogger.info(`No reports to update
    
    `);
    return [];
  }

  auditLogger.info(`${reports.count} reports with affected data found...
  
  `);

  return Promise.all(reports.map(async (report) => {
    const populations = [...report.targetPopulations];
    populations.forEach((population, index) => {
      const newPopulation = newPopulations[population];
      if (!newPopulation) {
        return;
      }

      populations.splice(index, 1, newPopulation);
    });

    auditLogger.info(`Updating report ${report.id}'s target populations from ${report.targetPopulations} to ${populations}
    
    `);

    return report.update({
      targetPopulations: populations,
    });
  }));
}
