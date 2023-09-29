import { realignReportOrdinals } from '../helpers/commonHooks';
import { REPORT_TYPE } from '../../constants';
import {
  processForResources,
  cleanupResources,
} from '../helpers/reportResources';

const updateOrdinals = async (
  sequelize,
  instance,
  options,
) => {
  if (instance.reportType === REPORT_TYPE.REPORT_TRAINING_SESSION
    && instance.changed('startDate')) {
    const report = sequelize.models.ReportTrainingSession.findOne({
      attributes: ['reportTrainingEventId'],
      where: { reportId: instance.id },
      transaction: options.transaction,
    });
    if (report) {
      return realignReportOrdinals(
        sequelize,
        options,
        sequelize.models.ReportTrainingSession,
        'reportTrainingEventId',
        report.reportTrainingEventId,
      );
    }
  }
  return Promise.resolve();
};

const beforeValidate = async (sequelize, instance, options) => {
};

const beforeUpdate = async (sequelize, instance, options) => {
};

const afterUpdate = async (sequelize, instance, options) => {
  await updateOrdinals(sequelize, instance, options);
  await processForResources(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await updateOrdinals(sequelize, instance, options);
  await processForResources(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await cleanupResources(sequelize, instance, options);
};

export {
  updateOrdinals,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
};
