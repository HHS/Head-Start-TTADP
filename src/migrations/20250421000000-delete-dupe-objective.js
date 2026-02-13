const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- A user created a new objective as a correction of this one
        -- It wasn't used but they don't have a way to delete it
        UPDATE "Objectives" SET "deletedAt" = NOW() WHERE "id" = 256625 AND title LIKE 'TTA Specialists will%';
    `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Objectives" SET "deletedAt" = null WHERE "id" = 256625 AND title LIKE 'TTA Specialists will%';
    `,
        { transaction }
      )
    })
  },
}
