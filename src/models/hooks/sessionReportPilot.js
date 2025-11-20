/* eslint-disable global-require */

/* eslint-disable max-len */
const { Op } = require('sequelize');
const { TRAINING_REPORT_STATUSES } = require('@ttahub/common');
const { auditLogger } = require('../../logger');
const safeParse = require('../helpers/safeParse');

const markSessionSubmitted = async (sequelize, instance) => {
  const data = safeParse(instance);

  const { approverId } = instance;
  const {
    pocComplete,
    ownerComplete,
  } = data;

  instance.set('data', {
    ...data,
    submitted: !!(pocComplete && approverId && ownerComplete),
  });
};

const preventChangesIfEventComplete = async (sequelize, instance, options) => {
  let event;
  try {
    const { EventReportPilot } = sequelize.models;
    event = await EventReportPilot.findOne({
      where: {
        id: instance.eventId,
        data: {
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        },
      },
      transaction: options.transaction,
    });
  } catch (err) {
    auditLogger.error(`Error in preventChangesIfEventCompletem: ${err}`);
  }

  if (event) {
    throw new Error('Cannot update session report on a completed event');
  }
};

const setAssociatedEventToInProgress = async (sequelize, instance, options) => {
  try {
    const { EventReportPilot } = sequelize.models;
    const event = await EventReportPilot.findOne({
      where: {
        id: instance.eventId,
        data: {
          [Op.or]: [
            { status: TRAINING_REPORT_STATUSES.NOT_STARTED },
            { status: { [Op.eq]: null } },
          ],
        },
      },
      transaction: options.transaction,
    });
    if (event) {
      const data = event.data || {};
      auditLogger.info('Setting event to in progress', { eventId: event.id });
      await event.update({
        data: {
          ...data,
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        },
      }, { transaction: options.transaction });
    }
  } catch (err) {
    auditLogger.error(`Error in setAssociatedEventToInProgress: ${err}`);
  }
};

const notifySessionCreated = async (sequelize, instance, options) => {
  try {
    const { EventReportPilot } = sequelize.models;
    const event = await EventReportPilot.findOne({
      where: {
        id: instance.eventId,
      },
      transaction: options.transaction,
    });

    if (event) {
      const { trSessionCreated } = require('../../lib/mailer');
      await trSessionCreated(event.dataValues, instance.id);
    }
  } catch (err) {
    auditLogger.error(`Error in notifySessionCreated: ${err}`);
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
  await notifySessionCreated(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
  await markSessionSubmitted(sequelize, instance);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
};

export {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
};
