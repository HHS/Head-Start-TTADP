const { Op } = require('sequelize');
const {
  ENTITY_STATUSES,
  COLLABORATOR_TYPES,
  RATIFIER_STATUSES,
  APPROVAL_RATIO,
  REPORT_STATUSES,
} = require('../../constants');
const { auditLogger } = require('../../logger');

const validateAndPopulateTier = (sequelize, instance) => {
  if (instance.tier === undefined
  || instance.tier === null) {
    instance.set('tier', 1);
  }
};

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approvals
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 */
const calculateStatusFromApprovals = (statuses, ratioRequired) => {
  const num = statuses.length.toFixed(2);
  const numRatified = statuses
    .filter((status) => status === RATIFIER_STATUSES.APPROVED).length.toFixed(2);
  const numNeedsAction = statuses
    .filter((status) => status === RATIFIER_STATUSES.NEEDS_ACTION).length.toFixed(2);

  if (numNeedsAction > 0.00) return ENTITY_STATUSES.NEEDS_ACTION;

  switch (ratioRequired) {
    case APPROVAL_RATIO.ALL:
      if (num === numRatified) return ENTITY_STATUSES.APPROVED;
      break;
    case APPROVAL_RATIO.TWOTHIRDS:
      if (numRatified / num >= 0.66) return ENTITY_STATUSES.APPROVED;
      break;
    case APPROVAL_RATIO.MAJORITY:
      if (numRatified / num >= 0.50) return ENTITY_STATUSES.APPROVED;
      break;
    case APPROVAL_RATIO.ANY:
      if (numRatified >= 0.00) return ENTITY_STATUSES.APPROVED;
      break;
    default:
  }

  return ENTITY_STATUSES.SUBMITTED;
};

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approverStatus and approvals
 * @param {*} ratifierStatus - string, status field of current model instance
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 * @param {*} ratioRequired - constant defining the ratio of approvals required to approve
 * activity report
 */
const calculateStatus = (ratifierStatus, statuses, ratioRequired) => {
  if (ratifierStatus === RATIFIER_STATUSES.NEEDS_ACTION) {
    return ENTITY_STATUSES.NEEDS_ACTION;
  }
  return calculateStatusFromApprovals(statuses, ratioRequired);
};

const getApprovalByEntityTier = async (
  sequelize,
  entityType,
  entityId,
  tier,
  options,
) => sequelize.models.Approval.findOne({
  attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt', 'ratioRequired'],
  where: {
    entityType,
    entityId,
    tier,
  },
  transaction: options.transaction,
});

const getRatifierStatusesForTier = async (
  sequelize,
  entityType,
  entityId,
  tier,
  options,
) => sequelize.models.Collaborator.findAll({
  attributes: ['status'],
  raw: true,
  where: {
    entityType,
    entityId,
    tier,
    collaboratorTypes: { [Op.contains]: [`${COLLABORATOR_TYPES.RATIFIER}`] },
  },
  transaction: options.transaction,
});

const updateApprovalCalculatedStatus = async (
  sequelize,
  entityType,
  entityId,
  tier,
  updatedFields,
  options,
) => sequelize.models.Approval.update(updatedFields, {
  where: {
    entityType,
    entityId,
    tier,
  },
  individualHooks: true,
  transaction: options.transaction,
});

const propagateCalculatedStatus = async (sequelize, instance, options) => {
  auditLogger.debug(JSON.stringify({ name: 'propagateCalculatedStatus', instance }));
  if (instance.collaboratorTypes.includes(COLLABORATOR_TYPES.RATIFIER)) {
    const approval = await getApprovalByEntityTier(
      sequelize,
      instance.entityType,
      instance.entityId,
      instance.tier,
      options,
    );
    auditLogger.debug(JSON.stringify({ name: 'getApprovalByEntityTier', approval }));
    // We allow users to create approvers before submitting the entity.
    // Calculated status should only exist for submitted entities.
    if (approval.submissionStatus === ENTITY_STATUSES.SUBMITTED) {
      const foundRatifierStatuses = await getRatifierStatusesForTier(
        sequelize,
        instance.entityType,
        instance.entityId,
        instance.tier,
        options,
      );
      auditLogger.debug(JSON.stringify({ name: 'getRatifierStatusesForTier', foundRatifierStatuses }));
      const ratifierStatuses = foundRatifierStatuses.map((a) => a.status);
      const newCalculatedStatus = calculateStatus(
        instance.status,
        ratifierStatuses,
        approval.ratioRequired,
      );
      auditLogger.debug(JSON.stringify({ name: 'calculateStatus', newCalculatedStatus }));

      let approvedAt = null;
      if (approval.calculatedStatus !== newCalculatedStatus) {
        if (newCalculatedStatus === ENTITY_STATUSES.APPROVED) {
          approvedAt = approval.approvedAt === null
            ? new Date()
            : approval.approvedAt;
        }
      }

      await updateApprovalCalculatedStatus(
        sequelize,
        instance.entityType,
        instance.entityId,
        instance.tier,
        {
          calculatedStatus: newCalculatedStatus,
          approvedAt,
        },
        options,
      );
    }
  }
};

const deleteUnusedApprovals = async (sequelize, instance, options) => {
  const collaborators = await sequelize.models.Collaborators.findAll({
    where: {
      entityType: instance.entityType,
      entityId: instance.entityId,
      tier: instance.tier,
      collaboratorTypes: { [Op.contains]: COLLABORATOR_TYPES.RATIFIER },
    },
    transaction: options.transaction,
  });

  if (collaborators.length === 0) {
    return sequelize.models.Approvals.destroy({
      where: {
        entityType: instance.entityType,
        entityId: instance.entityId,
        tier: instance.tier,
      },
      individualHooks: true,
      transaction: options.transaction,
    });
  }
  return Promise.resolve();
};

const deleteOnEmptyCollaboratorTypes = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('collaboratorTypes')
    && Array.isArray(instance.collaboratorTypes)
    && instance.collaboratorTypes.length === 0) {
    await sequelize.models.Collaborator.destroy({
      where: { id: instance.id },
      individualHooks: true,
      transaction: options.transaction,
    });
  }
};

const syncRolesForCollaborators = async (sequelize, instance, options) => {
  const userRoles = await sequelize.models.UserRole.findAll({
    where: { userId: instance.userId },
    transaction: options.transaction,
  });
  return Promise.all([
    ...userRoles.map(async (userRole) => sequelize.models.CollaboratorRole.upsert({
      collaboratorId: instance.id,
      roleId: userRole.roleId,
    }, {
      // logging: (msg) => auditLogger.error(JSON.stringify({ name: 'syncRolesForCollaborators - upsert', msg })),
      transaction: options.transaction,
    })),
    await sequelize.models.CollaboratorRole.destroy({
      where: {
        collaboratorId: instance.id,
        roleId: { [Op.notIn]: userRoles.map((userRole) => userRole.roleId) },
      },
      // logging: (msg) => auditLogger.error(JSON.stringify({ name: 'syncRolesForCollaborators - destroy', msg })),
      individualHooks: true,
      transaction: options.transaction,
    }),
  ]);
};

const createApproval = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('collaboratorTypes')
    && Array.isArray(instance.collaboratorTypes)
    && instance.collaboratorTypes.includes(COLLABORATOR_TYPES.RATIFIER)) {
    await sequelize.models.Approval.findOrCreate(
      {
        where: {
          entityType: instance.entityType,
          entityId: instance.entityId,
          tier: instance.tier,
        },
        defaults: {
          ratioRequired: APPROVAL_RATIO.ALL,
          submissionStatus: REPORT_STATUSES.DRAFT,
        },
        transaction: options.transaction,
      },
    );
  }
};

const cleanUpAllCollaboratorRoles = async (
  sequelize,
  instance,
  options,
) => sequelize.models.CollaboratorRole.destroy({
  where: { collaboratorId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const beforeValidate = async (sequelize, instance, options) => {
  await validateAndPopulateTier(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
  await createApproval(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await cleanUpAllCollaboratorRoles(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await createApproval(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateCalculatedStatus(sequelize, instance, options);
  await syncRolesForCollaborators(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateCalculatedStatus(sequelize, instance, options);
  await deleteUnusedApprovals(sequelize, instance, options);
};

const afterRestore = async (sequelize, instance, options) => {
  await propagateCalculatedStatus(sequelize, instance, options);
  await syncRolesForCollaborators(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  auditLogger.debug(JSON.stringify({ name: 'afterUpdate' }));
  await propagateCalculatedStatus(sequelize, instance, options);
  await deleteOnEmptyCollaboratorTypes(sequelize, instance, options);
  await syncRolesForCollaborators(sequelize, instance, options);
};

const afterUpsert = async (sequelize, created, options) => {
  // Created is an array. First item in created array is
  // a model instance, second item is boolean indicating
  // if record was newly created (false = updated existing object.)
  const instance = created[0];

  // If record can not be created or updated (upsert fails) this hook is still fired.
  // In this case we don't need to calculateStatus.
  if (!instance) {
    return;
  }

  await propagateCalculatedStatus(sequelize, instance, options);
  await deleteOnEmptyCollaboratorTypes(sequelize, instance, options);
  await syncRolesForCollaborators(sequelize, instance, options);
};

export {
  calculateStatusFromApprovals,
  calculateStatus,
  getApprovalByEntityTier,
  updateApprovalCalculatedStatus,
  propagateCalculatedStatus,
  cleanUpAllCollaboratorRoles,
  beforeValidate,
  beforeCreate,
  beforeDestroy,
  beforeUpdate,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
};
