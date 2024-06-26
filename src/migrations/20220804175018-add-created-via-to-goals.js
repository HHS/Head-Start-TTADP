/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    const createdViaSources = ['imported', 'activityReport', 'rtr'];

    const loggedUser = '0';
    const sessionSig = __filename;
    const auditDescriptor = 'RUN MIGRATIONS';
    await queryInterface.sequelize.query(
      `SELECT
          set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
          set_config('audit.transactionId', NULL, TRUE) as "transactionId",
          set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
          set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
      { transaction },
    );

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
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    const query = 'DROP TYPE public."enum_Goals_createdVia";';
    await queryInterface.removeColumn(
      'Goals',
      'createdVia',
      { transaction },
    );
    await queryInterface.sequelize.query(query, { transaction });
  }),
};
