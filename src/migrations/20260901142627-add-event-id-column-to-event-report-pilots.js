const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // 1. Add the new column, initially nullable so existing rows can be backfilled.
      await queryInterface.addColumn(
        'EventReportPilots',
        'eventId',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      // 2. Backfill the new column from the existing JSON data->>'eventId' value.
      await queryInterface.sequelize.query(
        `
        UPDATE "EventReportPilots"
        SET "eventId" = COALESCE(NULLIF(data->>'eventId',''), NULLIF(imported->>'Event ID',''), NULLIF(imported->>'eventId',''))
        WHERE "eventId" IS NULL;
      `,
        { transaction }
      );

      // 3. Enforce NOT NULL now that every row has a value.
      await queryInterface.changeColumn(
        'EventReportPilots',
        'eventId',
        {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        { transaction }
      );

      // 4. Enforce uniqueness at the database level. This intentionally fails the
      // migration if pre-existing duplicate eventIds exist so they can be resolved.
      await queryInterface.addConstraint('EventReportPilots', {
        fields: ['eventId'],
        type: 'unique',
        name: 'EventReportPilots_eventId_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeConstraint(
        'EventReportPilots',
        'EventReportPilots_eventId_unique',
        { transaction }
      );

      await queryInterface.removeColumn('EventReportPilots', 'eventId', { transaction });
    });
  },
};
