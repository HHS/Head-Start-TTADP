const { GOAL_CREATED_VIA } = require('../constants')
const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return Promise.all(
        Object.values(GOAL_CREATED_VIA).map((action) =>
          queryInterface.sequelize.query(`
         ALTER TYPE "enum_Goals_createdVia" ADD VALUE IF NOT EXISTS '${action}';
      `)
        )
      )
    })
  },

  async down() {
    // no rollbacks
  },
}
