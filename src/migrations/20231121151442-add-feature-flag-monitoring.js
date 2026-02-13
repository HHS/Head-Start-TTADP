const { FEATURE_FLAGS } = require('../constants')
const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return Promise.all(
        Object.values(FEATURE_FLAGS).map((action) =>
          queryInterface.sequelize.query(`
         ALTER TYPE "enum_Users_flags" ADD VALUE IF NOT EXISTS '${action}';
      `)
        )
      )
    })
  },

  async down() {
    // no rollbacks
  },
}
