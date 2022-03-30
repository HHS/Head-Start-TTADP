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
      'imported',
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
    let importedGranteeParticipants = report.imported.granteeParticipants;

    let updatedImported = false;
    participantsToUpdate.forEach((p) => {
      // Check Participants Column.
      if (participants.includes(p.old)) {
        const indexOfUpdate = participants.indexOf(p.old);
        participants.splice(indexOfUpdate, 1, p.new);
      }

      if (importedGranteeParticipants && importedGranteeParticipants.includes(p.old)) {
        // Check Imported Grantee Participants.
        importedGranteeParticipants = importedGranteeParticipants.replace(p.old, p.new);
        updatedImported = true;
      }
    });

    auditLogger.info(`Updating report ${report.id}'s participant from [${report.participants}] to [${participants}].`);

    if (updatedImported) {
      auditLogger.info(`Updating report ${report.id}'s imported participant from [${report.imported.granteeParticipants.replaceAll('\n', ' ')}] to [${importedGranteeParticipants.replaceAll('\n', ' ')}].`);
    }

    const imported = {
      ...report.imported,
      granteeParticipants: importedGranteeParticipants,
    };

    return report.update({ participants, imported });
  }));
}
