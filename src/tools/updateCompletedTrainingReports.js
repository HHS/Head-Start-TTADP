import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db from '../models';

const { sequelize } = db;

export default async function updateCompletedTrainingReports() {
  return sequelize.transaction(async () => {
    const completedTrainingReports = await db.TrainingReport.findAll({
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
          bulkCreate.push({
            userId: owner.id,
            userName: owner.name,
            trainingReportId: report.id,
            nationalCenterId: owner.nationalCenters[0].id,
            nationalCenterName: owner.nationalCenters[0].name,
          });
        }
        const collaborators = usersWithNationalCenters
          .filter((user) => report.collaboratorIds.includes(user.id));

        collaborators.forEach((collaborator) => {
          bulkCreate.push({
            userId: collaborator.id,
            userName: collaborator.name,
            trainingReportId: report.id,
            nationalCenterId: collaborator.nationalCenters[0].id,
            nationalCenterName: collaborator.nationalCenters[0].name,
          });
        });
      },
    );

    return Promise.all(
      bulkCreate.map((item) => db.TrainingReportNationalCenterUser.findOrCreate({ where: item })),
    );
  });
}
