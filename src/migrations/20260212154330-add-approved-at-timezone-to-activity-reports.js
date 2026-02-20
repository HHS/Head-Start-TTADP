const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn(
        'ActivityReports',
        'approvedAtTimezone',
        {
          comment: 'IANA timezone used to interpret approvedAt for deadline calculations',
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(`
        UPDATE "ActivityReports"
        SET "approvedAtTimezone" = CASE
          WHEN "regionId" BETWEEN 1 AND 4 THEN 'America/New_York'
          WHEN "regionId" IN (5, 7) THEN 'America/Chicago'
          WHEN "regionId" IN (6, 8) THEN 'America/Denver'
          WHEN "regionId" IN (10, 11) THEN 'America/Anchorage'
          WHEN "regionId" = 9 THEN 'Pacific/Samoa'
          WHEN "regionId" = 12 THEN 'America/Los_Angeles'
          ELSE 'America/New_York'
        END
        WHERE "approvedAt" IS NOT NULL
        AND "approvedAtTimezone" IS NULL;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('ActivityReports', 'approvedAtTimezone', { transaction });
    });
  },
};
