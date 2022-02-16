import { Op } from 'sequelize';
import {
  ActivityReport, User, ActivityReportCollaborator, sequelize,
} from '../models';
import { logger } from '../logger';

/**
 * otherSpecialists can contain anything. all this script can really handle are emails
 * this is a regex to get some emails out of a string
 *
 * we're exporting it to test it a little on its own
 *
 * @param {String} rawCollaborators
 * @returns {String[]}
 */
export function extractCollaboratorEmails(rawCollaborators) {
  if (rawCollaborators && rawCollaborators.match) {
    return rawCollaborators.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
  }

  // return null in all other cases since that's what a non-finding match returns
  return null;
}

/**
 * takes our found report and checks to see if it needs its collaborators or creator updated,
 * and then attempts to do so, returning an array of all the promises that need to be resolved
 *
 * @param {Object} report
 * @returns {Promise[]}
 */
async function updateLegacyCreatorAndCollaboratorsData(report) {
  const {
    id, userId, imported: { otherSpecialists, createdBy },
  } = report;

  // create some empty arrays
  let updatedCollaborators = [];
  let updatedCreator = [];

  if (otherSpecialists) {
    logger.info(`Report ${id} should have these collaborators: ${otherSpecialists}`);
    const parsedCollabs = extractCollaboratorEmails(otherSpecialists);
    if (parsedCollabs && parsedCollabs.length) {
      updatedCollaborators = await User.findAll({
        attributes: ['id', 'email'],
        where: {
          email: parsedCollabs,
          id: {
            // exclude that which has already been made a collaborator
            [Op.notIn]: sequelize.literal(`(SELECT "userId" FROM "ActivityReportCollaborators" WHERE "activityReportId" = ${id})`),
          },
        },
      });

      if (updatedCollaborators.length) {
        logger.info(`Matching users for AR: ${id} found: ${updatedCollaborators.map((u) => u.id).join(',')}`);
      } else {
        logger.info('No matching collaborators found');
      }
    }
  }

  if (!userId && createdBy) {
    updatedCreator = await User.findAll({
      attributes: ['id', 'email'],
      where: {
        email: createdBy,
      },
    });

    if (updatedCreator.length) {
      logger.info(`Matching users found: ${updatedCreator.map((u) => u.id).join(',')}`);
    } else {
      logger.info('No matching creator found');
    }
  }

  return sequelize.transaction(async (transaction) => {
    await Promise.all([
      ...updatedCollaborators.map((c) => ActivityReportCollaborator.create({
        activityReportId: id,
        userId: c.id,
      }, { transaction })),
      ...updatedCreator.map((u) => report.update({ userId: u.id }, { transaction })),
    ]);
  });
}

export default async function updateLegacyCreatorsAndCollaborators() {
  /**
   * this is a big find all but I couldn't think of a way to do this without
   * getting all legacy reports. We're looking for all reports that have imported data but
   * dont have collaborators or don't have userIds
   */
  const rawReportData = await ActivityReport.findAll({
    attributes: [
      'id',
      'userId',
      'imported',
    ],
    where: {
      imported: {
        [Op.not]: null,
      },
    },
    include: [
      {
        model: User,
        attributes: ['id', 'name', 'role', 'fullName'],
        as: 'collaborators',
        through: {
          attributes: [],
        },
        required: false,
      },
    ],
  });

  // so here is where the filtering happens
  const reports = rawReportData.filter((r) => {
    const { imported: { otherSpecialists } } = r;

    return otherSpecialists || r.userId === null;
  });

  // eslint-disable-next-line max-len
  // * it doesn't look too long to me *
  return Promise.all(reports.map((report) => updateLegacyCreatorAndCollaboratorsData(report)));
}
