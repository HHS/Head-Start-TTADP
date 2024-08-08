/* eslint-disable global-require */
/* eslint-disable import/prefer-default-export */
const { Op } = require('sequelize');
const { TRAINING_REPORT_STATUSES } = require('@ttahub/common');
const { auditLogger } = require('../../logger');
const { createGoalsForSessionRecipientsIfNecessary } = require('./sessionReportPilot');
const safeParse = require('../helpers/safeParse');
const { purifyDataFields } = require('../helpers/purifyFields');

const fieldsToEscape = ['eventName'];

const notifyNewCollaborators = async (_sequelize, instance) => {
  try {
    const changed = instance.changed();

    if (changed.includes('collaboratorIds')) {
      const { collaboratorIds } = instance;
      const oldCollaboratorIds = instance.previous('collaboratorIds');

      // get all collaborators that are not in oldCollaboratorIds
      // and not the owner ID
      const newCollaboratorIds = collaboratorIds.filter((id) => (
        !oldCollaboratorIds.includes(id) && id !== instance.ownerId));

      if (newCollaboratorIds.length === 0) {
        return;
      }

      // imported inside function to prevent circular ref
      const { trCollaboratorAdded } = require('../../lib/mailer');

      // process notifications for new collaborators
      await Promise.all(
        newCollaboratorIds.map((id) => trCollaboratorAdded(instance, id)),
      );
    }
  } catch (err) {
    auditLogger.error(`Error in notifyNewCollaborators: ${err}`);
  }
};

const notifyNewPoc = async (_sequelize, instance) => {
  try {
    const changed = instance.changed();
    if (changed.includes('pocIds')) {
      const { pocIds } = instance;
      const oldPocIds = instance.previous('pocIds');

      const newPocIds = pocIds.filter((id) => (
        !oldPocIds.includes(id)));

      if (newPocIds.length === 0) {
        return;
      }

      // imported inside function to prevent circular ref
      const { trPocAdded } = require('../../lib/mailer');

      await Promise.all(
        newPocIds.map((id) => trPocAdded(instance, id)),
      );
    }
  } catch (err) {
    auditLogger.error(`Error in notifyNewPoc: ${err}`);
  }
};

const notifyPocEventComplete = async (_sequelize, instance) => {
  try {
    // first we need to see if the session is newly complete
    if (instance.changed().includes('data')) {
      const previous = instance.previous('data');
      const current = safeParse(instance);

      if (
        current.status === TRAINING_REPORT_STATUSES.COMPLETE
        && previous.status !== TRAINING_REPORT_STATUSES.COMPLETE) {
        // imported inside function to prevent circular ref
        const { trPocEventComplete } = require('../../lib/mailer');
        await trPocEventComplete(instance.dataValues);
      }
    }
  } catch (err) {
    auditLogger.error(`Error in notifyPocEventComplete: ${err}`);
  }
};

const notifyVisionComplete = async (_sequelize, instance) => {
  try {
    // first we need to see if the session is newly complete
    if (instance.changed().includes('data')) {
      const previous = instance.previous('data');
      const current = safeParse(instance);

      if (
        current.pocComplete && !previous.pocComplete) {
        // imported inside function to prevent circular ref
        const { trVisionComplete } = require('../../lib/mailer');
        await trVisionComplete(instance.dataValues);
      }
    }
  } catch (err) {
    auditLogger.error(`Error in notifyVisionComplete: ${err}`);
  }
};

const createOrUpdateNationalCenterUserCacheTable = async (sequelize, instance, options) => {
  try {
    const { ownerId, collaboratorIds } = instance;
    const userIds = [ownerId, ...collaboratorIds].filter((f) => f);
    const users = await sequelize.models.User.findAll({
      where: {
        id: userIds,
      },
      include: [
        {
          model: sequelize.models.NationalCenter,
          as: 'nationalCenters', // despite the relation being singular in the UI, the name is plural
        },
      ],
      transaction: options.transaction,
    });

    const records = [];
    users.forEach((user) => {
      user.nationalCenters.forEach((nc) => {
        records.push({
          userId: user.id,
          userName: user.name,
          eventReportPilotId: instance.id,
          nationalCenterId: nc.id,
          nationalCenterName: nc.name,
        });
      });
    });

    const promises = [];

    // create or update records
    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];

      // eslint-disable-next-line no-await-in-loop
      const cachedData = await sequelize.models.EventReportPilotNationalCenterUser.findOne({
        where: {
          eventReportPilotId: instance.id,
          userId: record.userId,
          nationalCenterId: record.nationalCenterId,
        },
        transaction: options.transaction,
      });

      if (cachedData) {
        promises.push(
          cachedData.update(record, {
            transaction: options.transaction,
          }),
        );
      } else {
        promises.push(
          sequelize.models.EventReportPilotNationalCenterUser.create(record, {
            transaction: options.transaction,
          }),
        );
      }
    }

    const eventReportNationalCenterUsers = await Promise.all(promises);

    // delete records that are not present in the new list
    const ids = eventReportNationalCenterUsers.map((r) => r.id);
    await sequelize.models.EventReportPilotNationalCenterUser.destroy({
      where: {
        eventReportPilotId: instance.id,
        id: {
          [Op.notIn]: ids,
        },
      },
      transaction: options.transaction,
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ err }));
  }
};

const beforeUpdate = async (sequelize, instance, options) => {
  purifyDataFields(instance, fieldsToEscape);
};

const beforeCreate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

const afterUpdate = async (sequelize, instance, options) => {
  await notifyNewCollaborators(sequelize, instance, options);
  await notifyPocEventComplete(sequelize, instance, options);
  await notifyVisionComplete(sequelize, instance, options);
  await notifyNewPoc(sequelize, instance, options);
  await createOrUpdateNationalCenterUserCacheTable(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await createOrUpdateNationalCenterUserCacheTable(sequelize, instance, options);
};

export {
  afterUpdate,
  beforeUpdate,
  beforeCreate,
  afterCreate,
  createOrUpdateNationalCenterUserCacheTable,
};
