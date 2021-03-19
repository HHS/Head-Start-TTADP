import { Op } from 'sequelize';
import { userByEmail } from './users';
import { ActivityReport, ActivityReportCollaborator } from '../models';
import { logger } from '../logger';

const getLegacyReports = async () => {
  const reports = await ActivityReport.findAll({
    where: {
      legacyId: {
        [Op.ne]: null,
      },
      imported: {
        [Op.ne]: null,
      },
      [Op.or]: [
        {
          userId: {
            [Op.eq]: null,
          },
        },
        {
          approvingManagerId: {
            [Op.eq]: null,
          },
        },
        {
          imported: {
            otherSpecialists: {
              [Op.ne]: '',
            },
          },
        },
      ],

    },
  });
  return reports;
};

export const reconcileApprovingManagers = async (report) => {
  try {
    const user = await userByEmail(report.imported.manager);
    if (user) {
      await ActivityReport.update({ approvingManagerId: user.id }, { where: { id: report.id } });
      logger.info(`Updated approvingManager for report ${report.displayId} to user Id ${user.id}`);
    }
  } catch (err) {
    logger.error(err);
  }
};

export const reconcileAuthors = async (report) => {
  try {
    const user = await userByEmail(report.imported.createdBy);
    if (user) {
      await ActivityReport.update({ userId: user.id }, { where: { id: report.id } });
      logger.info(`Updated author for report ${report.displayId} to user Id ${user.id}`);
    }
  } catch (err) {
    logger.error(err);
  }
};

export const reconcileCollaborators = async (report) => {
  try {
    const collaborators = await ActivityReportCollaborator
      .findAll({ where: { activityReportId: report.id } });
    const otherSpecialists = report.imported.otherSpecialists.split(',').filter((j) => j !== '').map((i) => i.toLowerCase().trim());
    if (otherSpecialists.length !== collaborators.length) {
      const users = [];
      otherSpecialists.forEach((specialist) => {
        users.push(userByEmail(specialist));
      });
      const userArray = await Promise.all(users);
      const pendingCollaborators = [];
      userArray.forEach((user) => {
        if (user) {
          pendingCollaborators.push(ActivityReportCollaborator
            .findOrCreate({ where: { activityReportId: report.id, userId: user.id } }));
        }
      });
      const newCollaborators = await Promise.all(pendingCollaborators);
      const numberOfNewCollaborators = newCollaborators.filter((c) => c[1]).length;
      if (numberOfNewCollaborators > 0) {
        logger.info(`Added ${numberOfNewCollaborators} collaborator for report ${report.displayId}`);
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

export default async function reconcileLegacyReports() {
  const reports = await getLegacyReports();
  const updates = [];
  try {
    reports.forEach((report) => {
      if (!report.userId) {
        updates.push(reconcileAuthors(report));
      }
      if (!report.approvingManagerId) {
        updates.push(reconcileApprovingManagers(report));
      }
      if (report.imported.otherSpecialists !== '') {
        updates.push(reconcileCollaborators(report));
      }
    });
    await Promise.all(updates);
  } catch (err) {
    logger.error(err);
  }
}
