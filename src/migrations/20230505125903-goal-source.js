const { GOAL_SOURCES } = require('@ttahub/common')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
          set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
          set_config('audit.transactionId', NULL, TRUE) as "transactionId",
          set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
          set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      await queryInterface.addColumn('Goals', 'source', { type: Sequelize.DataTypes.ENUM(GOAL_SOURCES) }, { transaction })

      await queryInterface.addColumn('ActivityReportGoals', 'source', { type: Sequelize.DataTypes.ENUM(GOAL_SOURCES) }, { transaction })

      // add new flag
      return queryInterface.sequelize.query(
        `
      DO $$ BEGIN
        ALTER TYPE "enum_Users_flags" ADD VALUE 'goal_source';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `,
        { transaction }
      )
    }),
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Goals', 'source')
    await queryInterface.sequelize.query('DROP TYPE public."enum_Goals_source";')
    await queryInterface.removeColumn('ActivityReportGoals', 'source')
    await queryInterface.sequelize.query('DROP TYPE public."enum_ActivityReportGoals_source";')
  },
}
