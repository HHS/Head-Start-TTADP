const { APPROVER_STATUSES, REPORT_STATUSES } = require('@ttahub/common');
const { purifyFields } = require('../helpers/purifyFields');

const FIELDS_TO_ESCAPE = ['note'];

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approvals
 * @param {*} approvals - array, status fields of all approvals for current model instance
 */
const calculateReportStatusFromApprovals = (approvals) => {
  const approved = (status) => status === APPROVER_STATUSES.APPROVED;
  if (approvals.length && approvals.every(approved)) {
    return REPORT_STATUSES.APPROVED;
  }

  const needsAction = (status) => status === APPROVER_STATUSES.NEEDS_ACTION;
  if (approvals.length && approvals.some(needsAction)) {
    return REPORT_STATUSES.NEEDS_ACTION;
  }

  return REPORT_STATUSES.SUBMITTED;
};

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approverStatus and approvals
 * @param {*} approverStatus - string, status field of current model instance
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 * activity report
 */
const calculateReportStatus = (approverStatus, approvals) => {
  if (approverStatus === APPROVER_STATUSES.NEEDS_ACTION) {
    return REPORT_STATUSES.NEEDS_ACTION;
  }
  return calculateReportStatusFromApprovals(approvals);
};

const updateReportStatus = async (sequelize, instance) => {
  const report = await sequelize.models.CollabReport.findOne({
    attributes: ['calculatedStatus', 'submissionStatus'],
    where: {
      id: instance.collabReportId,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
    },
  }) as {
    calculatedStatus: string,
    submissionStatus: string
  } | null;

  // we only update any of the report status fields if the report is submitted
  if (!report) {
    return;
  }

  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.

  const foundApproverStatuses = await sequelize.models.CollabReportApprover.findAll({
    attributes: ['status'],
    where: { collabReportId: instance.collabReportId },
  }) as { status: string }[];

  const approverStatuses = foundApproverStatuses.map((a) => a.status);

  const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);

  if (newCalculatedStatus === REPORT_STATUSES.APPROVED
      && report.calculatedStatus !== REPORT_STATUSES.APPROVED) {
    // if the report is being approved, we need to clear the notes on the approvers
    await sequelize.models.CollabReportApprover.update({
      note: '',
    }, {
      where: { collabReportId: instance.collabReportId },
    });
  }

  await sequelize.models.CollabReport.update({
    calculatedStatus: newCalculatedStatus,
  }, {
    where: { id: instance.collabReportId },
    individualHooks: true,
  });
};

const afterCreate = async (sequelize, instance) => {
  await updateReportStatus(sequelize, instance);
};

const afterDestroy = async (sequelize, instance) => {
  // Code unique to this hook
  const report = await sequelize.models.CollabReport.findByPk(instance.collabReportId, {
    attributes: ['submissionStatus'],
  });
  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.
  if (report && report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    const foundApproverStatuses = await sequelize.models.CollabReportApprover.findAll({
      attributes: ['status'],
      where: { collabReportId: instance.collabReportId },
    });
    const approverStatuses = foundApproverStatuses.map((a) => a.status);

    // Calculate status only with approvals, not this recently deleted instance
    const newCalculatedStatus = calculateReportStatusFromApprovals(approverStatuses);
    await sequelize.models.CollabReport.update({
      calculatedStatus: newCalculatedStatus,
    }, {
      where: { id: instance.collabReportId },
      individualHooks: true,
    });
  }
};

const afterRestore = async (sequelize, instance) => {
  await updateReportStatus(sequelize, instance);
};

const afterUpdate = async (sequelize, instance) => {
  await updateReportStatus(sequelize, instance);
};

const beforeUpdate = async (_sequelize, instance) => {
  purifyFields(instance, FIELDS_TO_ESCAPE);
};

const beforeCreate = async (_sequelize, instance) => {
  purifyFields(instance, FIELDS_TO_ESCAPE);
};

export {
  calculateReportStatusFromApprovals,
  calculateReportStatus,
  beforeCreate,
  beforeUpdate,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
};
