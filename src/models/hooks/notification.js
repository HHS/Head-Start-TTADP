const { ValidationError, ValidationErrorItem } = require('sequelize');
const { ACTIVITY_REPORT_NOTIFICATION_TYPES } = require('../../constants');

const beforeValidate = async (instance, options = {}) => {
  if (instance.entityId == null) return;
  if (!ACTIVITY_REPORT_NOTIFICATION_TYPES.includes(instance.type)) return;

  const { ActivityReport } = instance.sequelize.models;
  const activityReport = await ActivityReport.findByPk(instance.entityId, {
    transaction: options.transaction,
    attributes: ['id'],
  });

  if (!activityReport) {
    throw new ValidationError('Notification validation failed', [
      new ValidationErrorItem(
        `Notification.entityId ${instance.entityId} does not reference a valid ActivityReport`,
        'Validation error',
        'entityId',
        instance.entityId
      ),
    ]);
  }
};

module.exports = { beforeValidate };
