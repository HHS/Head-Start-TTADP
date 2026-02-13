const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
      -- Update the title of all headstart.gov resources that are missing a title by mapping them to the eclkc resource.
        UPDATE "Resources" AS h
        SET "title" = e."title"
        FROM "Resources" AS e
        WHERE h."domain" = 'headstart.gov'
        AND h."title" IS NULL
        AND e."mapsTo" = h."id"
        AND e."domain" = 'eclkc.ohs.acf.hhs.gov'
        AND e."title" IS NOT NULL;
    `,
        { transaction }
      )
    })
  },

  async down() {
    // No roll back needed.
  },
}
