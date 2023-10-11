import {
  processForResources,
  cleanupResources,
} from '../helpers/reportResources';

const syncRoles = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const { syncReportCollaboratorRoles } = require('../../services/reports/reportCollaboratorRole');
  return syncReportCollaboratorRoles(
    { id: instance.reportId },
    {
      reportCollaborator: [{
        reportCollaboratorId: instance.id,
        userId: instance.userId,
      }],
    },
  );
};

const beforeValidate = async (sequelize, instance, options) => {
};

const beforeUpdate = async (sequelize, instance, options) => {
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForResources(sequelize, instance, options);
  await syncRoles(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await processForResources(sequelize, instance, options);
  await syncRoles(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await cleanupResources(sequelize, instance, options);
};

export {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
};
