const cleanUpAllUserRoles = async (
  sequelize,
  instance,
  options,
) => sequelize.models.UserRole.destroy({
  where: { roleId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const beforeDestroy = async (
  sequelize,
  instance,
  options,
) => Promise.all([cleanUpAllUserRoles(sequelize, instance, options)]);

export default beforeDestroy;
