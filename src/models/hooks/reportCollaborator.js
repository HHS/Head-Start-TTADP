import {
  processForResources,
  cleanupResources,
} from '../helpers/reportResources';

const collectRoles = async (sequelize, instance, options) => {
  const roleIds = await sequelize.models.UserRoles.findAll({
    attributes: [
      'roleId',
    ],
    where: { userId: instance.userId },
    raw: true,
  });
  return sequelize.models.ReportCollaborativeRole.bulkCreate(
    roleIds.map(({ roleId }) => ({
      reportCollaboratorId: instance.id,
      roleId,
    })),
  ); // TODO - allow hooks and on collision update.
};

const beforeValidate = async (sequelize, instance, options) => {
};

const beforeUpdate = async (sequelize, instance, options) => {
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForResources(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await processForResources(sequelize, instance, options);
  await collectRoles(sequelize, instance, options);
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
