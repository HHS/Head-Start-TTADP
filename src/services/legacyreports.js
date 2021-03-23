import { Op } from 'sequelize';
import { userByEmail } from './users';
import { ActivityReport, ActivityReportCollaborator } from '../models';
import { auditLogger, logger } from '../logger';
import newQueue from '../lib/queue';

/*
* Returns all legacy reports that either:
*  1. are missing an author
*  2. are missing an approving manager
*  3. have colloborators in the imported field
* These are the only reports that might need reconciliation
*/
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

/*
* Checks a report to see if the email address listed in the imported.manager field
* belongs to any user. If it does, it updates the report with that user.id in the
* approvingManager column
*/
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
/*
* Checks a report to see if the email address listed in the imported.createdBy field
* belongs to any user. If it does, it updates the report with that user.id in the
* userId column
*/
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

/*
* First checks if the number of collaborators is different than the number of
* entries in the imported.otherSpecialists field. If not, then no reconciliation is needed.
* If there is a difference, it tries to find users matching the email addresses in the
* otherSpecialists field. It then uses findorCreate to add collaborators that haven't yet
* been added.
*/
export const reconcileCollaborators = async (report) => {
  try {
    const collaborators = await ActivityReportCollaborator
      .findAll({ where: { activityReportId: report.id } });
    // In legacy reports, specialists are in a single column seperated by commas.
    // First, get a list of other specialists and split on commas eliminating any blanks.
    const splitOtherSpecialists = report.imported.otherSpecialists.split(',').filter((j) => j !== '');
    // Next we map the other specialists to lower case and trim whitespace to standardize them.
    const otherSpecialists = splitOtherSpecialists.map((i) => i.toLowerCase().trim());
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
      // findOrCreate returns an array with the second value being a boolean
      // which is true if a new object is created. This counts the number of objects where
      // c[1] is true
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
  logger.info('Starting legacy report reconciliation');
  // Get all reports that might need reconciliation
  const reports = await getLegacyReports();
  logger.info(`found ${reports.length} reports that may need reconciliation`);
  // Array to help promises from reports that are getting reconciled
  if (reports) {
    const updates = [];
    try {
      reports.forEach((report) => {
        // if there is no author, try to reconcile the author
        if (!report.userId) {
          updates.push(reconcileAuthors(report));
        }
        // if there is no approving manager, try to reconcile the approving manager
        if (!report.approvingManagerId) {
          updates.push(reconcileApprovingManagers(report));
        }
        // if the report has collaborators, check if collaborators need reconcilliation.
        if (report.imported.otherSpecialists !== '') {
          updates.push(reconcileCollaborators(report));
        }
      });
      // let all promises resolve
      await Promise.all(updates);
    } catch (err) {
      logger.error(err);
    }
  }
  return 'done';
}

export const reconciliationQueue = newQueue('reconcile');

// Checks if this job is already queued and adds it if it isn't
const populateReconciliationQueue = async () => {
  try {
    const depth = await reconciliationQueue.count();
    if (depth < 1) {
      // To test, uncomment the following line and comment out the one below.
      // that will make it run every minute instead of every day at 2 am.
      // await reconciliationQueue.add('legacyReports', {}, { repeat: { cron: '* * * * *' } });
      await reconciliationQueue.add('legacyReports', {}, { repeat: { cron: '0 2 * * *' } });
    }
  } catch (e) {
    auditLogger.error(e);
  }
};

populateReconciliationQueue();
