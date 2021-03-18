/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

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
      userId: {
        [Op.eq]: null,
      },
    },
  });
  return reports;
};

const reconcileApprovingManagers = async (report) => {
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

export const reconcileCollaborators = async (reportId, otherSpecialists) => {
  for (const specialist of otherSpecialists) {
    try {
      const user = await userByEmail(specialist);
      if (user) {
        const [, created] = await ActivityReportCollaborator
          .findOrCreate({ where: { activityReportId: reportId, userId: user.id } });
        if (created) {
          logger.info(`Added ${specialist} as a collaborator on Report ${reportId}`);
        }
      }
    } catch (err) {
      logger.error(err);
    }
  }
};

export default async function reconcileLegacyReports() {
  const reports = await getLegacyReports();
  for (const report of reports) {
    if (!report.userId) {
      reconcileAuthors(report);
    }
    if (!report.approvingManagerId) {
      reconcileApprovingManagers(report);
    }
    if (report.imported.otherSpecialists !== '') {
      const collaborators = await ActivityReportCollaborator
        .findAll({ where: { activityReportId: report.id } });
      const otherSpecialists = report.imported.otherSpecialists.split(',').filter((j) => j !== '').map((i) => i.toLowerCase().trim());
      if (otherSpecialists.length !== collaborators.length) {
        await reconcileCollaborators(report.id, otherSpecialists);
      }
    }
  }
}
