import { Op } from 'sequelize';
import {
  ActivityReport,
} from '../models';
import { auditLogger } from '../logger';

const participantsToUpdate = [
  { old: 'Coach / Trainer', new: 'Coach' },
  { old: 'Direct Service / Front line / Home Visitors', new: 'Home Visitor' },
  { old: 'Program Director (HS/EHS)', new: 'Program Director (HS / EHS)' },
  { old: 'State Agency staff', new: 'State Head Start Association' },
];

export default async function updateParticipantsList() {
  const participantReports = await ActivityReport.findAll({
    attributes: [
      'id',
      'participants',
    ],
    where: {
      [Op.or]: participantsToUpdate.map((p) => ({
        participants: {
          [Op.contains]: [p.old],
        },
      })),
    },
  });

  auditLogger.info(`${participantReports.length ? participantReports.length : 0} reports with affected data found...`);

  return Promise.all(participantReports.map(async (report) => {
    const participants = [...report.participants];

    participantsToUpdate.forEach((p) => {
      if (participants.includes(p.old)) {
        const indexOfUpdate = participants.indexOf(p.old);
        participants.splice(indexOfUpdate, 1, p.new);
      }
    });
    auditLogger.info(`Updating report ${report.id}'s participant from [${report.participants}] to [${participants}].`);
    return report.update({ participants });
  }));
}
