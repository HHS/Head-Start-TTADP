/* eslint-disable global-require */
/* eslint-disable import/prefer-default-export */
const { Op } = require('sequelize');
const { auditLogger } = require('../../logger');
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

const notifyNewOwner = async (_sequelize, instance) => {
  try {
    // imported inside function to prevent circular ref
    const { trOwnerAdded } = require('../../lib/mailer');

    await trOwnerAdded(instance, instance.ownerId);
  } catch (err) {
    auditLogger.error(`Error in notifyNewOwner: ${err}`);
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
          trainingReportId: instance.id,
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
      const cachedData = await sequelize.models.TrainingReportNationalCenterUser.findOne({
        where: {
          trainingReportId: instance.id,
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
          sequelize.models.TrainingReportNationalCenterUser.create(record, {
            transaction: options.transaction,
          }),
        );
      }
    }

    const eventReportNationalCenterUsers = await Promise.all(promises);

    // delete records that are not present in the new list
    const ids = eventReportNationalCenterUsers.map((r) => r.id);
    await sequelize.models.TrainingReportNationalCenterUser.destroy({
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

const beforeUpdate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

const beforeCreate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

const afterUpdate = async (sequelize, instance, options) => {
  await notifyNewCollaborators(sequelize, instance, options);
  await createOrUpdateNationalCenterUserCacheTable(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await createOrUpdateNationalCenterUserCacheTable(sequelize, instance, options);
  await notifyNewOwner(sequelize, instance);
};

export {
  afterUpdate,
  beforeUpdate,
  beforeCreate,
  afterCreate,
  createOrUpdateNationalCenterUserCacheTable,
};
