const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // add new flag
      return queryInterface.sequelize.query(
        `
        DO $$ BEGIN
          ALTER TYPE "enum_Users_flags" ADD VALUE 'merge_goals';
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `,
        { transaction }
      )
    }),

  down: async () => {},
}
