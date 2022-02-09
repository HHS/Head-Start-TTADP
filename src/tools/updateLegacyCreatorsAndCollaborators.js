import { Op } from 'sequelize';
import {
  ActivityReport, User, ActivityReportCollaborator, sequelize,
} from '../models';
import { logger } from '../logger';

/**
 * takes a messy comma sep'd string of specialist emails, returns a neatened
 * array of the same emails, hopefully with no dead or empty stuff in there
 *
 * @param {String} rawCollaborators
 * @returns {String[]}
 */
function parseCollaboratorEmails(rawCollaborators) {
  // this addresses a comma seperated list of emails, w/ inconsistent spacing
  // and turns it into a neat array
  return rawCollaborators.replace(/ /g, '').split(',').filter((c) => c);
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
    id, collaborators, userId, imported: { otherSpecialists, createdBy },
  } = report;

  // create some empty arrays
  let updatedCollaborators = [];
  let updatedCreator = [];

  if (otherSpecialists && !collaborators.length) {
    logger.info(`Report ${id} should have these collaborators: ${otherSpecialists}`);
    const parsedCollabs = parseCollaboratorEmails(otherSpecialists);
    if (parsedCollabs.length) {
      updatedCollaborators = await User.findAll({
        attributes: ['id', 'email'],
        where: {
          email: parsedCollabs,
        },
      });

      if (updatedCollaborators.length) {
        logger.info(`Matching users found: ${updatedCollaborators.map((u) => u.id).join(',')}`);
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
  const reports = rawReportData.filter((r) => r.collaborators.length === 0 || r.userId === null);

  // eslint-disable-next-line max-len
  return Promise.all(reports.map((report) => updateLegacyCreatorAndCollaboratorsData(report)));
}
