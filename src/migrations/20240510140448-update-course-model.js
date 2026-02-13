const { prepMigration, removeTables } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // add persistsOnUpload to the Courses table
      await queryInterface.addColumn(
        'Courses',
        'persistsOnUpload',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      )

      // insert an "other" course
      await queryInterface.bulkInsert(
        'Courses',
        [
          {
            name: 'Other',
            persistsOnUpload: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.removeColumn('Courses', 'persistsOnUpload', { transaction })
    })
  },
}
