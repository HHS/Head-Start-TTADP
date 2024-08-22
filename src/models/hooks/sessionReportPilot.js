/* eslint-disable max-len */
/* eslint-disable global-require */
const { Op } = require('sequelize');
const httpContext = require('express-http-context');
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
    auditLogger.error(`Error in preventChangesIfEventCompletem: ${err}`);
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
    auditLogger.error(`Error in notifyPocIfSessionComplete: ${err}`);
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
      await trSessionCreated(event.dataValues);
    }
  } catch (err) {
    auditLogger.error(`Error in notifySessionCreated: ${err}`);
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
    auditLogger.error(`Error in participantsAndNextStepsComplete: ${err}`);
  }
};

const updateCreatorCollaborator = async (sequelize, eventRecord, existingCollaborators, creatorTypeId, options) => {
  const creatorCollaborator = existingCollaborators.find((c) => c.collaboratorTypeId === creatorTypeId.id);

  const pocUsers = await sequelize.models.User.findAll({
    where: { id: eventRecord.pocIds || [] },
    transaction: options.transaction,
  });

  const firstPoc = pocUsers
    .map((u) => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  // Update the creator collaborator if the first POC is different from the current one.
  if (firstPoc && creatorCollaborator && creatorCollaborator.userId !== firstPoc.id) {
    await creatorCollaborator.update({ userId: firstPoc.id }, { transaction: options.transaction });
  } else if (!firstPoc) {
    // If there is no POC (event report pocIds was empty), use the current user as the new creator.
    const contextUser = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');
    await creatorCollaborator.update({ userId: contextUser }, { transaction: options.transaction });
  }
};

const createCreatorCollaborator = async (sequelize, eventRecord, goalId, sessionReport, creatorTypeId, options) => {
  const pocUsers = await sequelize.models.User.findAll({
    where: { id: eventRecord.pocIds },
    transaction: options.transaction,
  });

  const firstPoc = pocUsers
    .map((u) => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  if (firstPoc) {
    await sequelize.models.GoalCollaborator.create({
      goalId,
      userId: firstPoc.id,
      collaboratorTypeId: creatorTypeId.id,
      linkBack: { sessionReportIds: [sessionReport.id] },
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { transaction: options.transaction });
  }
};

export const syncGoalCollaborators = async (sequelize, eventRecord, goalId, sessionReport, options) => {
  const currentUserId = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');

  const [creatorType, linkerType] = await Promise.all([
    sequelize.models.CollaboratorType.findOne({ where: { name: 'Creator' }, transaction: options.transaction }),
    sequelize.models.CollaboratorType.findOne({ where: { name: 'Linker' }, transaction: options.transaction }),
  ]);

  const existingCollaborators = await sequelize.models.GoalCollaborator.findAll({
    where: {
      goalId,
      collaboratorTypeId: { [Op.in]: [creatorType.id, linkerType.id] },
    },
    transaction: options.transaction,
  });

  const hasCreator = existingCollaborators.some((c) => c.collaboratorTypeId === creatorType.id);

  if (!hasCreator) {
    await createCreatorCollaborator(sequelize, eventRecord, goalId, sessionReport, creatorType, options);
  } else {
    await updateCreatorCollaborator(sequelize, eventRecord, existingCollaborators, creatorType, options);
  }

  if (!existingCollaborators.some((c) => c.collaboratorTypeId === linkerType.id) && currentUserId) {
    await sequelize.models.GoalCollaborator.create({
      goalId,
      userId: currentUserId,
      collaboratorTypeId: linkerType.id,
      linkBack: { sessionReportIds: [sessionReport.id] },
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { transaction: options.transaction });
  }
};

export const checkIfBothIstAndPocAreComplete = async (sequelize, instance, options) => {
  try {
    if (instance.changed() && instance.changed().includes('data')) {
      const { data } = instance;
      const deStringifyData = JSON.parse(data.val);
      if (deStringifyData.ownerComplete && deStringifyData.pocComplete) {
        instance.set('data', sequelize.literal(`CAST('${JSON.stringify({ ...deStringifyData, status: TRAINING_REPORT_STATUSES.COMPLETE })}' AS jsonb)`));
      } else {
        instance.set('data', sequelize.literal(`CAST('${JSON.stringify({ ...deStringifyData, status: TRAINING_REPORT_STATUSES.IN_PROGRESS })}' AS jsonb)`));
      }
    }
  } catch (err) {
    auditLogger.error(`Error in checkIfBothIstAndPocAreComplete: ${err}`);
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
  await notifySessionCreated(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await setAssociatedEventToInProgress(sequelize, instance, options);
  await notifyPocIfSessionComplete(sequelize, instance, options);
  await participantsAndNextStepsComplete(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
  await checkIfBothIstAndPocAreComplete(sequelize, instance, options);
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
