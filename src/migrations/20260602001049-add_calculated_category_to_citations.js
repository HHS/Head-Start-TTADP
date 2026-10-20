module.exports = {
  async up(queryInterface) {
    // IF NOT EXISTS guard: updateMonitoringFactTables may have already added this column
    // when called from an earlier migration before this one runs.
    // TODO(TTAHUB-5287): Remove guard once updateMonitoringFactTables runs after all migrations.
    await queryInterface.sequelize.query(`
      ALTER TABLE "Citations"
        ADD COLUMN IF NOT EXISTS calculated_category TEXT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Citations', 'calculated_category');
  },
};
