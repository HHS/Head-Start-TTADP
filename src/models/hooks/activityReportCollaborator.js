const { Op } = require('sequelize');
const {
  ENTITY_STATUSES,
  COLLABORATOR_TYPES,
  RATIFIER_STATUSES,
  APPROVAL_RATIO,
  REPORT_STATUSES,
} = require('../../constants');
const { auditLogger } = require('../../logger');

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approvals
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 */
const calculateStatusFromApprovals = (statuses, ratioRequired) => {
  const num = statuses.length.toFixed(2);
  const numApproved = statuses
    .filter((status) => status === RATIFIER_STATUSES.APPROVED).length.toFixed(2);
  const numNeedsAction = statuses
    .filter((status) => status === RATIFIER_STATUSES.NEEDS_ACTION).length.toFixed(2);

  if (numNeedsAction > 0.00) return ENTITY_STATUSES.NEEDS_ACTION;
  if (num > 0) {
    switch (ratioRequired) {
      case APPROVAL_RATIO.ALL:
        if (num === numApproved) return ENTITY_STATUSES.APPROVED;
        break;
      case APPROVAL_RATIO.TWOTHIRDS:
        if (numApproved / num >= 0.66) return ENTITY_STATUSES.APPROVED;
        break;
      case APPROVAL_RATIO.MAJORITY:
        if (numApproved / num >= 0.50) return ENTITY_STATUSES.APPROVED;
        break;
      case APPROVAL_RATIO.ANY:
        if (numApproved >= 0.00) return ENTITY_STATUSES.APPROVED;
        break;
      default:
    }
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

const getApproval = async (
  sequelize,
  activityReportId,
  options,
) => sequelize.models.ActivityReportApproval.findOne({
  attributes: ['submissionStatus', 'calculatedStatus', 'approvedAt', 'ratioRequired'],
  where: {
    activityReportId,
  },
  transaction: options.transaction,
});

const getApproverStatuses = async (
  sequelize,
  activityReportId,
  options,
) => sequelize.models.ActivityReportCollaborator.findAll({
  attributes: ['status'],
  raw: true,
  where: {
    activityReportId,
    collaboratorTypes: { [Op.contains]: [`${COLLABORATOR_TYPES.APPROVER}`] },
  },
  transaction: options.transaction,
});

const updateApprovalCalculatedStatus = async (
  sequelize,
  activityReportId,
  updatedFields,
  options,
) => sequelize.models.ActivityReportApproval.update(updatedFields, {
  where: {
    activityReportId,
  },
  individualHooks: true,
  transaction: options.transaction,
});

const propagateCalculatedStatus = async (sequelize, instance, options) => {
  auditLogger.debug(JSON.stringify({ name: 'propagateCalculatedStatus', instance }));
  if (instance.collaboratorTypes.includes(COLLABORATOR_TYPES.APPROVER)) {
    const approval = await getApproval(
      sequelize,
      instance.activityReportId,
      options,
    );
    auditLogger.debug(JSON.stringify({ name: 'getApproval', approval }));
    // We allow users to create approvers before submitting the entity.
    // Calculated status should only exist for submitted entities.
    if (approval.submissionStatus === ENTITY_STATUSES.SUBMITTED) {
      const foundApproverStatuses = await getApproverStatuses(
        sequelize,
        instance.activityReportId,
        options,
      );
      auditLogger.debug(JSON.stringify({ name: 'getApproverStatuses', foundApproverStatuses }));
      const approverStatuses = foundApproverStatuses.map((a) => a.status);
      const newCalculatedStatus = calculateStatus(
        instance.status,
        approverStatuses,
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
        instance.activityReportId,
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
  const collaborators = await sequelize.models.ActivityReportCollaborator.findAll({
    where: {
      activityReportId: instance.activityReportId,
      collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.APPROVER] },
    },
    transaction: options.transaction,
  });

  if (collaborators.length === 0) {
    return sequelize.models.ActivityReportApproval.destroy({
      where: {
        activityReportId: instance.activityReportId,
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
    await sequelize.models.ActivityReportCollaborator.destroy({
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
    ...userRoles.map(async (userRole) => sequelize.models.ActivityReportCollaboratorRole.upsert({
      activityReportCollaboratorId: instance.id,
      roleId: userRole.roleId,
    }, {
      transaction: options.transaction,
    })),
    await sequelize.models.ActivityReportCollaboratorRole.destroy({
      where: {
        activityReportCollaboratorId: instance.id,
        roleId: { [Op.notIn]: userRoles.map((userRole) => userRole.roleId) },
      },
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
    && instance.collaboratorTypes.includes(COLLABORATOR_TYPES.APPROVER)) {
    await sequelize.models.ActivityReportApproval.findOrCreate(
      {
        where: {
          activityReportId: instance.activityReportId,
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
) => sequelize.models.ActivityReportCollaboratorRole.destroy({
  where: { activityReportCollaboratorId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const beforeValidate = async (sequelize, instance, options) => {
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
  getApproval,
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
