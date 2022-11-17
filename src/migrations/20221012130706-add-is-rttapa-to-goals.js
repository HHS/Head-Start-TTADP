/* eslint-disable max-len */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
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
      'isRttapa',
      { type: Sequelize.DataTypes.ENUM(['Yes', 'No']), allowNull: true },
      { transaction },
    );

    await queryInterface.sequelize.query(`
      UPDATE "Goals" SET "isRttapa" = 'Yes' WHERE "isFromSmartsheetTtaPlan" IS true;      
    `, { transaction });

    await queryInterface.addColumn(
      'ActivityReportGoals',
      'isRttapa',
      { type: Sequelize.DataTypes.ENUM(['Yes', 'No']), allowNull: true },
      { transaction },
    );

    await queryInterface.sequelize.query(`
      UPDATE "ActivityReportGoals" SET "isRttapa" = 'Yes' WHERE "goalId" IN (SELECT "id" FROM "Goals" WHERE "Goals"."isFromSmartsheetTtaPlan" IS true);      
    `, { transaction });
  }),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.removeColumn(
      'Goals',
      'isRttapa',
      { transaction },
    );

    await queryInterface.removeColumn(
      'ActivityReportGoals',
      'isRttapa',
      { transaction },
    );
  }),
};
