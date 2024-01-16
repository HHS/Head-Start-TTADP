/* eslint-disable max-len */
/* eslint-disable global-require */
/* eslint-disable import/prefer-default-export */
const { Op } = require('sequelize');
const { TRAINING_REPORT_STATUSES } = require('@ttahub/common');
const { auditLogger } = require('../../logger');

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
    auditLogger.error(JSON.stringify({ err }));
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
    auditLogger.error(JSON.stringify({ err }));
  }
};

const notifyPocEventComplete = async (_sequelize, instance) => {
  try {
    // first we need to see if the session is newly complete
    if (instance.changed().includes('data')) {
      const previous = instance.previous('data');
      const current = JSON.parse(instance.data.val);

      if (
        current.status === TRAINING_REPORT_STATUSES.COMPLETE
        && previous.status !== TRAINING_REPORT_STATUSES.COMPLETE) {
        // imported inside function to prevent circular ref
        const { trPocEventComplete } = require('../../lib/mailer');
        await trPocEventComplete(instance.dataValues);
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ err }));
  }
};

const notifyVisionAndGoalComplete = async (_sequelize, instance) => {
  try {
    // first we need to see if the session is newly complete
    if (instance.changed().includes('data')) {
      const previous = instance.previous('data');
      const current = JSON.parse(instance.data.val);

      if (
        current.pocComplete && !previous.pocComplete) {
        // imported inside function to prevent circular ref
        const { trVisionAndGoalComplete } = require('../../lib/mailer');
        await trVisionAndGoalComplete(instance.dataValues);
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ err }));
  }
};

/**
 * This hook updates `Goal.name` for all goals that are associated with this training report.
 */
const updateGoalText = async (sequelize, instance, options) => {
  const { transaction } = options;
  const changed = instance.changed();

  if (!changed || !changed.includes('name')) {
    return;
  }

  const { name } = instance;

  await sequelize.models.Goal.update(
    { name },
    {
      where: {
        [Op.and]: [
          { name: { [Op.ne]: name } },
          {
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT "goalId"
                FROM "EventReportPilotGoals"
                WHERE "eventId" = ${instance.id}
                AND "sessionId" NOT IN (
                  SELECT "id"
                  FROM "SessionReportPilots"
                  WHERE "data"->>'status' = '${TRAINING_REPORT_STATUSES.COMPLETE}'
                )
              )`),
            },
          },
        ],
      },
    },
  );
};

const afterUpdate = async (sequelize, instance, options) => {
  await notifyNewCollaborators(sequelize, instance, options);
  await notifyPocEventComplete(sequelize, instance, options);
  await notifyVisionAndGoalComplete(sequelize, instance, options);
  await notifyNewPoc(sequelize, instance, options);
  await updateGoalText(sequelize, instance, options);
};

export {
  afterUpdate,
};
