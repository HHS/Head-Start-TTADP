const { prepMigration } = require('../lib/migration')
/* eslint-disable max-len */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Add a column to topics called 'deprecated' (boolean)
      await queryInterface.addColumn(
        'Topics',
        'deprecated',
        {
          type: 'BOOLEAN',
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      )

      // Set deprecated to true for the old topic 'Environmental Health and Safety / EPRR'
      await queryInterface.sequelize.query('UPDATE "Topics" SET "deprecated" = true WHERE "name" = \'Environmental Health and Safety / EPRR\';', {
        transaction,
      })

      // Add new topic,
      await queryInterface.sequelize.query(
        `
            INSERT INTO "Topics"
            ("name", "createdAt", "updatedAt")
            VALUES
            ('Environmental Health and Safety', current_timestamp, current_timestamp),
            ('Emergency Preparedness, Response, and Recovery (EPRR)', current_timestamp, current_timestamp);
          `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      // Delete new topics.
      await queryInterface.sequelize.query(
        'DELETE FROM "Topics" WHERE "name" IN (\'Environmental Health and Safety\', \'Emergency Preparedness, Response, and Recovery (EPRR)\');',
        { transaction }
      )

      // Remove deprecated column.
      await queryInterface.removeColumn('Topics', 'deprecated', { transaction })
    })
  },
}
