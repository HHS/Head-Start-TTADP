const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
      -- Update goal templates for fei.
        UPDATE "Goals"
            SET
            "goalTemplateId" = 19017
        WHERE "id" IN (52248, 52251, 52249, 52250, 55244, 55172, 55908, 55420, 55421, 56033, 50565, 50613, 50612, 50343, 50614);
          `,
        { transaction }
      )
    })
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
}
