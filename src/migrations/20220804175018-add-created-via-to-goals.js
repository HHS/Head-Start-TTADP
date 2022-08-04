/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    const createdViaSources = ['imported', 'activityReport', 'rtr'];

    await queryInterface.addColumn(
      'Goals',
      'createdVia',
      { type: Sequelize.DataTypes.ENUM(createdViaSources), allowNull: true },
      { transaction },
    );

    // we can do this as the RTR is brand new
    await queryInterface.sequelize.query(`
      UPDATE "Goals" SET "createdVia" = 'imported' WHERE "isFromSmartsheetTtaPlan" IS true;
      UPDATE "Goals" SET "createdVia" = 'activityReport' WHERE "isFromSmartsheetTtaPlan" IS NULL OR "isFromSmartsheetTtaPlan" = false;
    `, { transaction });
  }),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => queryInterface.removeColumn(
    'Goals',
    'createdVia',
    { transaction },
  )),
};
