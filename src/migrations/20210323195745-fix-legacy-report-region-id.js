module.exports = {
  up: (queryInterface, Sequelize) => (
    queryInterface.sequelize.query('UPDATE "ActivityReports" SET "legacyId" = regexp_replace("legacyId", \'R(\d)-\', \'R0\1-\') WHERE "legacyId" ~ \'R\d-\'')
  ),
  down: async () => {
    /**
     * Non-reversible
     */
  },
};
