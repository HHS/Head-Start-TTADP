import { realignReportOrdinals } from '../helpers/commonHooks';

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
};

const afterCreate = async (sequelize, instance, options) => {
  await updateOrdinals(sequelize, instance, options);
};

export {
  updateOrdinals,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
};
