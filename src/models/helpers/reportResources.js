const processForResources = async (
  sequelize,
  instance,
  options,
) => {
  // eslint-disable-next-line global-require
  const { checkForSyncableReportResources } = require('../../services/reports/reportResource');
  checkForSyncableReportResources(
    {
      id: (!instance.reportId && options.model.tableName === 'Reports')
        ? instance.id
        : instance.reportId,
    },
    options.model,
    instance.id,
    (instance.changed() || [])
      .reduce((acc, field) => {
        acc[field] = instance.get(field);
        return acc;
      }, {}),
  );
};

const cleanupResources = async (
  sequelize,
  instance,
  options,
) => sequelize.models.ReportResource.destroy({
  where: {
    reportId: (!instance.reportId && options.model.tableName === 'Reports')
      ? instance.id
      : instance.reportId,
    tableName: options.model.tableName,
    tableId: instance.id,
  },
  individualHooks: true,
});

export {
  processForResources,
  cleanupResources,
};
