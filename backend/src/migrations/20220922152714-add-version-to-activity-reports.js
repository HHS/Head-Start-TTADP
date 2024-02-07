module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
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
      await queryInterface.addColumn('ActivityReports', 'version', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 }, { transaction });

      await queryInterface.sequelize.query(`UPDATE "ActivityReports" SET "version" = 0 WHERE "legacyId" IS NOT null; 
      UPDATE "ActivityReports" SET "version" = 1 WHERE "legacyId" IS null;`, { transaction });
    },
  ),
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction((transaction) => (queryInterface.removeColumn('ActivityReports', 'version', { transaction })));
  },
};
