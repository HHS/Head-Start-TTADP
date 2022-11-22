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
      'ActivityReports',
      'activelyEditedGoals',
      { type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.INTEGER), allowNull: true },
      { transaction },
    );
  }),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.removeColumn(
      'ActivityReports',
      'activelyEditedGoals',
      { transaction },
    );
  }),
};
