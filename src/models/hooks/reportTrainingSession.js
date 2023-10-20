import { realignReportOrdinals } from '../helpers/commonHooks';
import {
  processForResources,
  cleanupResources,
} from '../helpers/reportResources';

const updateOrdinals = async (
  sequelize,
  instance,
  options,
) => realignReportOrdinals(
  sequelize,
  options,
  instance.constructor,
  'reportTrainingEventId',
  instance.reportTrainingEventId,
);

const beforeValidate = async (sequelize, instance, options) => {
};

const beforeUpdate = async (sequelize, instance, options) => {
};

const afterUpdate = async (sequelize, instance, options) => {
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
