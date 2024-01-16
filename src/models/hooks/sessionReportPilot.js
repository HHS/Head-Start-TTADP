/* eslint-disable max-len */
/* eslint-disable global-require */
const { Op } = require('sequelize');
const { TRAINING_REPORT_STATUSES } = require('@ttahub/common');
const { auditLogger } = require('../../logger');

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
    auditLogger.error(JSON.stringify({ err }));
  }

  if (event) {
    throw new Error('Cannot update session report on a completed event');
  }
};

const notifyPocIfSessionComplete = async (sequelize, instance, options) => {
  try {
    // first we need to see if the session is newly complete
    if (instance.changed() && instance.changed().includes('data')) {
      const previous = instance.previous('data') || null;
      const current = JSON.parse(instance.data.val) || null;
      if (!current || !previous) return;

      if (
        current.status === TRAINING_REPORT_STATUSES.COMPLETE
        && previous.status !== TRAINING_REPORT_STATUSES.COMPLETE) {
        const { EventReportPilot } = sequelize.models;

        const event = await EventReportPilot.findOne({
          where: {
            id: instance.eventId,
          },
          transaction: options.transaction,
        });

        if (event) {
          const { trSessionCompleted } = require('../../lib/mailer');
          await trSessionCompleted(event.dataValues);
        }
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ err }));
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
    auditLogger.error(JSON.stringify({ err }));
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
      await trSessionCreated(event.dataValues);
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ err }));
  }
};

const participantsAndNextStepsComplete = async (sequelize, instance, options) => {
  try {
    // first we need to see if the session is newly complete
    if (instance.changed() && instance.changed().includes('data')) {
      const previous = instance.previous('data') || {};
      const current = JSON.parse(instance.data.val) || {};

      if (
        current.pocComplete && !previous.pocComplete) {
        const event = await sequelize.models.EventReportPilot.findOne({
          where: {
            id: instance.eventId,
          },
          transaction: options.transaction,
        });

        const { trPocSessionComplete } = require('../../lib/mailer');
        await trPocSessionComplete(event);
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ err }));
  }
};

const createGoalsForSessionRecipientsIfNecessary = async (sequelize, instance, options) => {
  try {
    const { event, recipients } = JSON.parse(instance.data.val);
    if (!event?.data?.goal || !event.id) return;

    const eventId = Number(event.id);
    const eventRecord = await sequelize.models.EventReportPilot.findByPk(eventId, { transaction: options.transaction });
    if (!eventRecord) throw new Error('Event not found');

    // eslint-disable-next-line no-restricted-syntax
    for await (const { value: grantValue } of recipients) {
      const grantId = Number(grantValue);
      const grant = await sequelize.models.Grant.findByPk(grantId, { transaction: options.transaction });
      if (!grant) throw new Error('Grant not found');

      const sessionId = instance.id;

      const existing = await sequelize.models.EventReportPilotGoal.findOne({
        where: {
          sessionId,
          eventId,
          grantId,
        },
        transaction: options.transaction,
      });

      if (!existing) {
        const newGoal = await sequelize.models.Goal.create({
          name: event.data.goal,
          grantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'Not Started',
          createdVia: 'tr',
        }, { transaction: options.transaction });

        await sequelize.models.EventReportPilotGoal.create({
          goalId: newGoal.id,
          eventId,
          sessionId,
          grantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { transaction: options.transaction });
      }
    }
  } catch (error) {
    auditLogger.error(JSON.stringify({ error }));
  }
};

const destroyAssociatedGoals = async (sequelize, instance, options) => {
  try {
    const { EventReportPilotGoal } = sequelize.models;
    const goals = await EventReportPilotGoal.findAll({
      where: {
        sessionId: instance.id,
        eventId: instance.eventId,
      },
      transaction: options.transaction,
    });

    // eslint-disable-next-line no-restricted-syntax
    for await (const goal of goals) {
      await sequelize.models.Goal.destroy({
        where: {
          id: goal.goalId,
        },
        transaction: options.transaction,
      });
    }
  } catch (error) {
    auditLogger.error(JSON.stringify({ error }));
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
  await notifySessionCreated(sequelize, instance, options);
  await createGoalsForSessionRecipientsIfNecessary(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
  await notifyPocIfSessionComplete(sequelize, instance, options);
  await participantsAndNextStepsComplete(sequelize, instance, options);
  await createGoalsForSessionRecipientsIfNecessary(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
  await destroyAssociatedGoals(sequelize, instance, options);
};

export {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
};
