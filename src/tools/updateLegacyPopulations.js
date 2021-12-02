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
    attributes: ['id', 'targetPopulations', 'imported'],
    where: {
      [Op.or]: [
        {
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
        {
          imported: {
            targetPopulations: {
              [Op.or]: [
                {
                  [Op.iLike]: '%Infant/Toddlers%',
                },
                {
                  [Op.iLike]: '%Preschool%',
                },
                {
                  [Op.iLike]: '%Affected by Homelessness%',
                },
              ],
            },
          },
        },
      ],
    },
  });

  auditLogger.info(`${reports.count ? reports.count : 0} reports with affected data found...
  
  `);

  return Promise.all(reports.map(async (report) => {
    let imported = null;

    if (report.imported) {
      imported = { ...report.imported };
    }

    if (imported) {
      const importedPopulations = imported.targetPopulations.split('\n');
      importedPopulations.forEach((population, index) => {
        const newPopulation = newPopulations[population];
        if (!newPopulation) {
          return;
        }

        importedPopulations.splice(index, 1, newPopulation);
      });

      imported.targetPopulations = importedPopulations.join('\n');
      auditLogger.info(`Updating report ${report.id}'s target populations from ${report.imported.targetPopulations} to ${imported.targetPopulations}
    
      `);
    }

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
      imported,
      targetPopulations: populations,
    });
  }));
}
