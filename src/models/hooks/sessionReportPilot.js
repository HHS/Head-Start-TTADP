const { Op } = require('sequelize');
const { TRAINING_REPORT_STATUSES } = require('@ttahub/common');
const { auditLogger } = require('../../logger');

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
    auditLogger.error(JSON.stringify({ err }));
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
};

export {
  afterCreate,
  afterUpdate,
};
