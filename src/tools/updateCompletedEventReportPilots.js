import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db from '../models';

const { sequelize } = db;

export default async function updateCompletedEventReportPilots() {
  return sequelize.transaction(async () => {
    const completedTrainingReports = await db.EventReportPilot.findAll({
      attributes: [
        'id',
        'ownerId',
        'collaboratorIds',
        'data',
      ],
      where: {
        data: {
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        },
      },
    });

    const eventReportNationalCenterUsers = await db.EventReportPilotNationalCenterUser.findAll({
      where: {
        eventReportPilotId: completedTrainingReports.map((report) => report.id),
      },
    });

    const userIds = completedTrainingReports.reduce((acc, report) => {
      acc.add(report.ownerId);
      report.collaboratorIds.forEach((id) => acc.add(id));
      return acc;
    }, new Set());

    const usersWithNationalCenters = await db.User.findAll({
      where: {
        id: Array.from(userIds),
      },
      include: [{
        model: db.NationalCenter,
        as: 'nationalCenters',
        required: true,
      }],
    });

    const bulkCreate = [];
    completedTrainingReports.forEach(
      (report) => {
        const owner = usersWithNationalCenters.find((user) => user.id === report.ownerId);
        if (owner) {
          const exists = eventReportNationalCenterUsers.find(
            (ru) => ru.eventReportPilotId === report.id
              && ru.userId === owner.id && ru.nationalCenterId === owner.nationalCenters[0].id,
          );

          if (!exists) {
            bulkCreate.push({
              userId: owner.id,
              userName: owner.name,
              eventReportPilotId: report.id,
              nationalCenterId: owner.nationalCenters[0].id,
              nationalCenterName: owner.nationalCenters[0].name,
            });
          }
        }
        const collaborators = usersWithNationalCenters
          .filter((user) => report.collaboratorIds.includes(user.id));

        collaborators.forEach((collaborator) => {
          const exists = eventReportNationalCenterUsers.find(
            (ru) => ru.eventReportPilotId === report.id
              && ru.userId === owner.id && ru.nationalCenterId === owner.nationalCenters[0].id,
          );

          if (!exists) {
            bulkCreate.push({
              userId: collaborator.id,
              userName: collaborator.name,
              eventReportPilotId: report.id,
              nationalCenterId: collaborator.nationalCenters[0].id,
              nationalCenterName: collaborator.nationalCenters[0].name,
            });
          }
        });
      },
    );

    return db.EventReportPilotNationalCenterUser.bulkCreate(bulkCreate, {
      updateOnDuplicate: ['updatedAt', 'userName', 'nationalCenterName'],
    });
  });
}
