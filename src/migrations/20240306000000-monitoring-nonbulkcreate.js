const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      // eslint-disable-next-line @typescript-eslint/quotes
      await queryInterface.sequelize.query(
        /* sql */ `SELECT setval('"ImportFiles_id_seq"', COALESCE((SELECT MAX(id)+1 FROM "ImportFiles"), 1), false);`,
        { transaction }
      )
      // eslint-disable-next-line @typescript-eslint/quotes
      await queryInterface.sequelize.query(
        /* sql */ `SELECT setval('"ImportDataFiles_id_seq"', COALESCE((SELECT MAX(id)+1 FROM "ImportDataFiles"), 1), false);`,
        { transaction }
      )
    })
  },
  async down() {},
}
