const { GOAL_CREATED_VIA } = require('../constants')
const { prepMigration, addValuesToEnumIfTheyDontExist } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return addValuesToEnumIfTheyDontExist(queryInterface, transaction, 'enum_Goals_createdVia', Object.values(GOAL_CREATED_VIA))
    })
  },

  async down() {
    // no rollbacks
  },
}
