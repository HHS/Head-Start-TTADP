/* eslint-disable max-len */
/* eslint-disable global-require */
const { Op } = require('sequelize');
const { TRAINING_REPORT_STATUSES, GOAL_SOURCES } = require('@ttahub/common');
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

export const createGoalsForSessionRecipientsIfNecessary = async (sequelize, sessionReportOrInstance, options) => {
  const processSessionReport = async (sessionReport) => {
    let event;
    let recipients;

    if (sessionReport && sessionReport.data) {
      const data = (typeof sessionReport.data.val === 'string')
        ? JSON.parse(sessionReport.data.val)
        : sessionReport.data;

      event = data.event;
      recipients = data.recipients;
    }

    if (!event?.data?.goal || !event.id) return;

    const eventId = Number(event.id);
    const eventRecord = await sequelize.models.EventReportPilot.findByPk(eventId, { transaction: options.transaction });
    if (!eventRecord) throw new Error('Event not found');

    // eslint-disable-next-line no-restricted-syntax
    for await (const { value: grantValue } of recipients) {
      const grantId = Number(grantValue);

      // Check if a Goal already exists for the grantId.
      const existingGoal = await sequelize.models.Goal.findOne({
        where: { grantId, name: event.data.goal },
      });

      // If a Goal already exists, do not create a new one and continue with the next recipient.
      // eslint-disable-next-line no-continue
      if (existingGoal) continue;

      const grant = await sequelize.models.Grant.findByPk(grantId, { transaction: options.transaction });
      if (!grant) throw new Error('Grant not found');

      const sessionId = sessionReport.id;

      const hasCompleteSession = await sequelize.models.SessionReportPilot.findOne({
        where: { eventId, 'data.status': TRAINING_REPORT_STATUSES.COMPLETE },
        transaction: options.transaction,
      });

      const status = hasCompleteSession ? 'In Progress' : 'Draft';

      if (!existing) {
        const newGoal = await sequelize.models.Goal.create({
          name: event.data.goal,
          grantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          status,
          createdVia: 'tr',
          source: GOAL_SOURCES[4], // Training event
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
  };

  try {
    if (sequelize.Sequelize && sessionReportOrInstance instanceof sequelize.Sequelize.Model) {
      await processSessionReport(sessionReportOrInstance);
    } else {
      const instance = await sequelize.models.SessionReportPilot.findByPk(sessionReportOrInstance.id, { transaction: options.transaction });
      if (!instance) throw new Error('SessionReportPilot instance not found');
      await processSessionReport(instance);
    }
  } catch (error) {
    auditLogger.error(JSON.stringify({ error }));
  }
};

const makeGoalsInProgressIfThisIsTheFirstCompletedSession = async (sequelize, instance, options) => {
  const { transaction } = options;

  const previous = instance.previous('data') || null;
  const current = JSON.parse(instance.data.val);

  // If old status is complete, return.
  if (previous?.status === TRAINING_REPORT_STATUSES.COMPLETE) { return; }
  if (current?.status !== TRAINING_REPORT_STATUSES.COMPLETE) { return; }

  const otherSessions = await sequelize.models.SessionReportPilot.findAll({
    where: {
      eventId: instance.eventId,
      id: {
        [Op.ne]: instance.id,
      },
    },
    transaction,
  });

  // Are any of them complete?
  const anyComplete = otherSessions.some((s) => {
    // console.log('other session', s);
    const { status } = s.dataValues.data;
    if (!status) return false;
    return status === TRAINING_REPORT_STATUSES.COMPLETE;
  });

  if (anyComplete) { return; }

  const data = JSON.parse(instance.data.val) || null;
  if (!data) return;

  // No other sessions are complete, but this one is about
  // to become complete.
  // Find all the goals that were created from this EventReportPilot, and
  // update their status to In Progress. They are no longer considered Draft
  // when a session is marked as complete.
  const junctionGoals = await sequelize.models.EventReportPilotGoal.findAll({
    where: { eventId: instance.eventId },
    transaction,
  });

  // Now find actual Goals that are Draft.
  const goals = await sequelize.models.Goal.findAll({
    where: {
      id: {
        [Op.in]: junctionGoals.map((jg) => jg.goalId),
      },
      status: 'Draft',
    },
    transaction,
  });

  // Update them all to In Progress.
  await Promise.all(goals.map((goal) => goal.update({ status: 'In Progress', previousStatus: 'Draft' }, { transaction })));
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
  await makeGoalsInProgressIfThisIsTheFirstCompletedSession(sequelize, instance, options);
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
