const { Op } = require('sequelize');
const {
  ENTITY_STATUSES,
  ENTITY_TYPES,
  COLLABORATOR_TYPES,
  RATIFIER_STATUSES,
} = require('../../constants');

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approvals
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 */
const calculateStatusFromApprovals = (statuses) => {
  const ratified = (status) => status === RATIFIER_STATUSES.RATIFIED;
  if (statuses.every(ratified)) {
    return ENTITY_STATUSES.APPROVED;
  }

  const needsAction = (status) => status === RATIFIER_STATUSES.NEEDS_ACTION;
  if (statuses.some(needsAction)) {
    return ENTITY_STATUSES.NEEDS_ACTION;
  }

  return ENTITY_STATUSES.SUBMITTED;
};

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approverStatus and approvals
 * @param {*} approverStatus - string, status field of current model instance
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 * activity report
 */
const calculateStatus = (ratifierStatus, statuses) => {
  if (ratifierStatus === RATIFIER_STATUSES.NEEDS_ACTION) {
    return ENTITY_STATUSES.NEEDS_ACTION;
  }
  return calculateStatusFromApprovals(statuses);
};

const getEntityByPk = async (sequelize, entityType, entityId) => {
  switch (entityType) {
    case ENTITY_TYPES.ACTIVITYREPORT:
      return sequelize.models.ActivityReport.findByPk(entityId, {
        attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt'],
      });
    case ENTITY_TYPES.GOAL:
      return sequelize.models.Goal.findByPk(entityId, {
        attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt'],
      });
    case ENTITY_TYPES.GOALTEMPLATE:
      return sequelize.models.GoalTemplate.findByPk(entityId, {
        attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt'],
      });
    case ENTITY_TYPES.OBJECTIVE:
      return sequelize.models.Objective.findByPk(entityId, {
        attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt'],
      });
    case ENTITY_TYPES.OBJECTIVETEMPLATE:
      return sequelize.models.ObjectiveTemplate.findByPk(entityId, {
        attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt'],
      });
    default:
      return null;
  }
};

const updateEntityCalculatedStatus = async (sequelize, entityType, entityId, updatedFields) => {
  switch (entityType) {
    case ENTITY_TYPES.ACTIVITYREPORT:
      return sequelize.models.ActivityReport.update(updatedFields, {
        where: { id: entityId },
        individualHooks: true,
      });
    case ENTITY_TYPES.GOAL:
      return sequelize.models.Goal.update(updatedFields, {
        where: { id: entityId },
        individualHooks: true,
      });
    case ENTITY_TYPES.GOALTEMPLATE:
      return sequelize.models.GoalTemplate.update(updatedFields, {
        where: { id: entityId },
        individualHooks: true,
      });
    case ENTITY_TYPES.OBJECTIVE:
      return sequelize.models.Objective.update(updatedFields, {
        where: { id: entityId },
        individualHooks: true,
      });
    case ENTITY_TYPES.OBJECTIVETEMPLATE:
      return sequelize.models.ObjectiveTemplate.update(updatedFields, {
        where: { id: entityId },
        individualHooks: true,
      });
    default:
      return null;
  }
};

const propagateCalculatedStatus = async (sequelize, instance) => {
  const entity = await getEntityByPk(sequelize, instance.entityType, instance.entityId);
  // We allow users to create approvers before submitting the entity.
  // Calculated status should only exist for submitted entities.
  if (entity.submissionStatus === ENTITY_STATUSES.SUBMITTED) {
    const foundRatifierStatuses = await sequelize.models.Collaborator.findAll({
      attributes: ['status'],
      raw: true,
      where: {
        entityType: instance.entityType,
        entityId: instance.entityId,
        collaboratorTypes: { [Op.contains]: [`${COLLABORATOR_TYPES.RATIFIER}`] },
      },
    });
    const ratifierStatuses = foundRatifierStatuses.map((a) => a.status);
    const newCalculatedStatus = calculateStatus(instance.status, ratifierStatuses);

    let approvedAt = null;
    if (entity.calculatedStatus !== newCalculatedStatus) {
      if (newCalculatedStatus === ENTITY_STATUSES.APPROVED) {
        approvedAt = entity.approvedAt === null
          ? new Date()
          : entity.approvedAt;
      }
    }

    await updateEntityCalculatedStatus(
      sequelize,
      instance.entityType,
      instance.entityId,
      {
        calculatedStatus: newCalculatedStatus,
        approvedAt,
      },
    );
  }
};

const afterCreate = async (sequelize, instance) => {
  await propagateCalculatedStatus(sequelize, instance);
};

const afterDestroy = async (sequelize, instance) => {
  await propagateCalculatedStatus(sequelize, instance);
};

const afterRestore = async (sequelize, instance) => {
  await propagateCalculatedStatus(sequelize, instance);
};

const afterUpdate = async (sequelize, instance) => {
  await propagateCalculatedStatus(sequelize, instance);
};

const afterUpsert = async (sequelize, created) => {
  // Created is an array. First item in created array is
  // a model instance, second item is boolean indicating
  // if record was newly created (false = updated existing object.)
  const instance = created[0];

  // If record can not be created or updated (upsert fails) this hook is still fired.
  // In this case we don't need to calculateStatus.
  if (!instance) {
    return;
  }

  await propagateCalculatedStatus(sequelize, instance);
};

export {
  calculateStatusFromApprovals,
  calculateStatus,
  getEntityByPk,
  updateEntityCalculatedStatus,
  propagateCalculatedStatus,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
};
