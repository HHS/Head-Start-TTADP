const { APPROVER_STATUSES, REPORT_STATUSES } = require('@ttahub/common');

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approvals
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 * activity report
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

const afterCreate = async (sequelize, instance) => {
  // The following code should match other hooks.
  // This can not be abstracted into a function.
  // Begin
  const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
    attributes: ['submissionStatus'],
  });
  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.
  if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
      attributes: ['status'],
      raw: true,
      where: { activityReportId: instance.activityReportId },
    });
    const approverStatuses = foundApproverStatuses.map((a) => a.status);

    const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);
    await sequelize.models.ActivityReport.update({
      calculatedStatus: newCalculatedStatus,
    }, {
      where: { id: instance.activityReportId },
      individualHooks: true,
    });
  }
  // End
};

const afterDestroy = async (sequelize, instance) => {
  // Code unique to this hook
  const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
    attributes: ['submissionStatus'],
  });
  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.
  if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
      attributes: ['status'],
      raw: true,
      where: { activityReportId: instance.activityReportId },
    });
    const approverStatuses = foundApproverStatuses.map((a) => a.status);

    // Calculate status only with approvals, not this recently deleted instance
    const newCalculatedStatus = calculateReportStatusFromApprovals(approverStatuses);
    await sequelize.models.ActivityReport.update({
      calculatedStatus: newCalculatedStatus,
    }, {
      where: { id: instance.activityReportId },
      individualHooks: true,
    });
  }
};

const afterRestore = async (sequelize, instance) => {
  // The following code should match other hooks.
  // This can not be abstracted into a function.
  // Begin
  const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
    attributes: ['submissionStatus'],
  });
  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.
  if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
      attributes: ['status'],
      raw: true,
      where: { activityReportId: instance.activityReportId },
    });
    const approverStatuses = foundApproverStatuses.map((a) => a.status);

    const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);
    await sequelize.models.ActivityReport.update({
      calculatedStatus: newCalculatedStatus,
    }, {
      where: { id: instance.activityReportId },
      individualHooks: true,
    });
  }
  // End
};

const afterUpdate = async (sequelize, instance) => {
  // The following code should match other hooks.
  // This can not be abstracted into a function.
  // Begin
  const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
    attributes: ['submissionStatus'],
  });
  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.
  if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
      attributes: ['status'],
      raw: true,
      where: { activityReportId: instance.activityReportId },
    });
    const approverStatuses = foundApproverStatuses.map((a) => a.status);

    const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);
    await sequelize.models.ActivityReport.update({
      calculatedStatus: newCalculatedStatus,
    }, {
      where: { id: instance.activityReportId },
      individualHooks: true,
    });
  }
  // End
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

  // The following code should match other hooks.
  // This can not be abstracted into a function.
  // Begin
  const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
    attributes: ['submissionStatus'],
  });
  // We allow users to create approvers before submitting the report. Calculated
  // status should only exist for submitted reports.
  if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
      attributes: ['status'],
      raw: true,
      where: { activityReportId: instance.activityReportId },
    });
    const approverStatuses = foundApproverStatuses.map((a) => a.status);

    const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);

    /*
      * Here we check to see if the report will be approved and update the approvedAt
      * as appropriate
      */
    const approvedAt = newCalculatedStatus === REPORT_STATUSES.APPROVED ? new Date() : null;

    const updatedFields = approvedAt ? {
      calculatedStatus: newCalculatedStatus,
      approvedAt,
    } : {
      calculatedStatus: newCalculatedStatus,
    };

    await sequelize.models.ActivityReport.update(updatedFields, {
      where: { id: instance.activityReportId },
      individualHooks: true,
    });
  }
  // End
};

export {
  calculateReportStatusFromApprovals,
  calculateReportStatus,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
};
