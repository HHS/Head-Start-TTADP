/* eslint-disable max-len */
/* eslint-disable global-require */
const { Op } = require('sequelize');
const httpContext = require('express-http-context');
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
      const previous = instance.previous('data') || null;
      const current = JSON.parse(instance.data.val) || null;

      const currentOwnerComplete = current.ownerComplete || false;
      const currentPocComplete = current.pocComplete || false;

      if (currentOwnerComplete && currentPocComplete && current.status !== TRAINING_REPORT_STATUSES.COMPLETE) {
        sequelize.models.SessionReportPilot.update({
          data: {
            ...current,
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          },
        }, {
          where: {
            id: instance.id,
          },
          transaction: options.transaction,
        });
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
  await checkIfBothIstAndPocAreComplete(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await preventChangesIfEventComplete(sequelize, instance, options);
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
