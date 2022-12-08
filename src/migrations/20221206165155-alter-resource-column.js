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
      await queryInterface.changeColumn('ObjectiveResources', 'userProvidedUrl', {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      }, { transaction });
      await queryInterface.changeColumn('ActivityReportObjectiveResources', 'userProvidedUrl', {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      }, { transaction });
      await queryInterface.changeColumn('ObjectiveTemplateResources', 'userProvidedUrl', {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      }, { transaction });
    },
  ),
  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await queryInterface.changeColumn('ObjectiveResources', 'userProvidedUrl', {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      }, { transaction });
      await queryInterface.changeColumn('ActivityReportObjectiveResources', 'userProvidedUrl', {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      }, { transaction });
      await queryInterface.changeColumn('ObjectiveTemplateResources', 'userProvidedUrl', {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      }, { transaction });
    },
  ),
};
