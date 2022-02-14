import { Op } from 'sequelize';
import { ActivityReport } from '../models';
import { auditLogger } from '../logger';

export default async function updateLegacyParticipants() {
  auditLogger.info(`Updating misspelled participants...
  
  `);

  const reports = await ActivityReport.findAll({
    attributes: ['id', 'participants'],
    where: {
      participants: {
        [Op.contains]: ['Family Chlid Care'],
      },
    },
  });

  return Promise.all(reports.map(async (report) => {
    const participants = [...report.participants];

    const badSpelling = participants.findIndex((p) => p === 'Family Chlid Care');
    if (badSpelling !== -1) {
      participants.splice(badSpelling, 1, 'Family Child Care');
    }

    auditLogger.info(`Updating report ${report.id}'s target populations from ${report.participants} to ${participants}
    
    `);

    return report.update({ participants });
  }));
}
