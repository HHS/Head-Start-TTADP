const { Model } = require('sequelize');
const { APPROVER_STATUSES, REPORT_STATUSES } = require('../constants');

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approvals
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 * activity report
 */
function calculateReportStatusFromApprovals(approvals) {
  const approved = (status) => status === APPROVER_STATUSES.APPROVED;
  if (approvals.every(approved)) {
    return REPORT_STATUSES.APPROVED;
  }

  const needsAction = (status) => status === APPROVER_STATUSES.NEEDS_ACTION;
  if (approvals.some(needsAction)) {
    return REPORT_STATUSES.NEEDS_ACTION;
  }

  return REPORT_STATUSES.SUBMITTED;
}

/**
 * Helper function called by model hooks.
 * Returns calculatedStatus string based on approverStatus and approvals
 * @param {*} approverStatus - string, status field of current model instance
 * @param {*} approvals - array, status fields of all approvals for current model instance's
 * activity report
 */
function calculateReportStatus(approverStatus, approvals) {
  if (approverStatus === APPROVER_STATUSES.NEEDS_ACTION) {
    return REPORT_STATUSES.NEEDS_ACTION;
  }
  return calculateReportStatusFromApprovals(approvals);
}

module.exports = (sequelize, DataTypes) => {
  class ActivityReportApprover extends Model {
    static associate(models) {
      ActivityReportApprover.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportApprover.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  ActivityReportApprover.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    status: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(APPROVER_STATUSES).map((k) => APPROVER_STATUSES[k])),
    },
    note: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
  }, {
    hooks: {
      afterCreate: async (instance, options) => {
        // The following code should match other hooks.
        // This can not be abstracted into a function.
        // Begin
        const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
          attributes: ['submissionStatus'],
          transaction: options.transaction,
        });
        // We allow users to create approvers before submitting the report. Calculated
        // status should only exist for submitted reports.
        if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
          const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
            attributes: ['status'],
            raw: true,
            where: { activityReportId: instance.activityReportId },
            transaction: options.transaction,
          });
          const approverStatuses = foundApproverStatuses.map((a) => a.status);

          const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);
          await sequelize.models.ActivityReport.update({
            calculatedStatus: newCalculatedStatus,
          }, {
            where: { id: instance.activityReportId },
            transaction: options.transaction,
            hooks: false,
          });
        }
        // End
      },
      afterDestroy: async (instance, options) => {
        // Code unique to this hook
        const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
          attributes: ['submissionStatus'],
          transaction: options.transaction,
        });
        // We allow users to create approvers before submitting the report. Calculated
        // status should only exist for submitted reports.
        if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
          const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
            attributes: ['status'],
            raw: true,
            where: { activityReportId: instance.activityReportId },
            transaction: options.transaction,
          });
          const approverStatuses = foundApproverStatuses.map((a) => a.status);

          // Calculate status only with approvals, not this recently deleted instance
          const newCalculatedStatus = calculateReportStatusFromApprovals(approverStatuses);
          await sequelize.models.ActivityReport.update({
            calculatedStatus: newCalculatedStatus,
          }, {
            where: { id: instance.activityReportId },
            transaction: options.transaction,
            hooks: false,
          });
        }
      },
      afterRestore: async (instance, options) => {
        // The following code should match other hooks.
        // This can not be abstracted into a function.
        // Begin
        const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
          attributes: ['submissionStatus'],
          transaction: options.transaction,
        });
        // We allow users to create approvers before submitting the report. Calculated
        // status should only exist for submitted reports.
        if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
          const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
            attributes: ['status'],
            raw: true,
            where: { activityReportId: instance.activityReportId },
            transaction: options.transaction,
          });
          const approverStatuses = foundApproverStatuses.map((a) => a.status);

          const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);
          await sequelize.models.ActivityReport.update({
            calculatedStatus: newCalculatedStatus,
          }, {
            where: { id: instance.activityReportId },
            transaction: options.transaction,
            hooks: false,
          });
        }
        // End
      },
      afterUpdate: async (instance, options) => {
        // The following code should match other hooks.
        // This can not be abstracted into a function.
        // Begin
        const report = await sequelize.models.ActivityReport.findByPk(instance.activityReportId, {
          attributes: ['submissionStatus'],
          transaction: options.transaction,
        });
        // We allow users to create approvers before submitting the report. Calculated
        // status should only exist for submitted reports.
        if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
          const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
            attributes: ['status'],
            raw: true,
            where: { activityReportId: instance.activityReportId },
            transaction: options.transaction,
          });
          const approverStatuses = foundApproverStatuses.map((a) => a.status);

          const newCalculatedStatus = calculateReportStatus(instance.status, approverStatuses);
          await sequelize.models.ActivityReport.update({
            calculatedStatus: newCalculatedStatus,
          }, {
            where: { id: instance.activityReportId },
            transaction: options.transaction,
            hooks: false,
          });
        }
        // End
      },
      afterUpsert: async (created, options) => {
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
          transaction: options.transaction,
        });
        // We allow users to create approvers before submitting the report. Calculated
        // status should only exist for submitted reports.
        if (report.submissionStatus === REPORT_STATUSES.SUBMITTED) {
          const foundApproverStatuses = await sequelize.models.ActivityReportApprover.findAll({
            attributes: ['status'],
            raw: true,
            where: { activityReportId: instance.activityReportId },
            transaction: options.transaction,
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
            transaction: options.transaction,
            hooks: false,
          });
        }
        // End
      },
    },
    indexes: [{
      unique: true,
      fields: ['activityReportId', 'userId'],
    }],
    sequelize,
    paranoid: true,
    modelName: 'ActivityReportApprover',
  });
  return ActivityReportApprover;
};
