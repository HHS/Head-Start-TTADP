const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
      -- Some test FEI goals were created for region 6 grants that weren't supposed to have them

      -- PROCESS:
      -- Mark objectives deletedAt
      -- Mark goals deletedAt

      CREATE TEMP TABLE goals_for_deletion
      AS
      SELECT * FROM (
        VALUES -- sorted and deduped
        (51072),
        (51322),
        (51326),
        (51327),
        (51330),
        (51331)
      ) AS data(gid)
      ;

      UPDATE "Objectives"
      SET "deletedAt" = NOW()
      FROM goals_for_deletion
      WHERE "goalId" = gid
      ;

      UPDATE "Goals"
      SET "deletedAt" = NOW()
      FROM goals_for_deletion
      WHERE id = gid
      ;
      
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
        `
      -- REVERSE PROCESS:
      -- Unmark objectives deletedAt
      -- Unmark goals deletedAt

      CREATE TEMP TABLE goals_for_deletion
      AS
      SELECT * FROM (
        VALUES -- sorted and deduped
        (51072),
        (51322),
        (51326),
        (51327),
        (51330),
        (51331)
      ) AS data(gid)
      ;

      UPDATE "Objectives"
      SET "deletedAt" = NULL
      FROM goals_for_deletion
      WHERE "goalId" = gid
      ;

      UPDATE "Goals"
      SET "deletedAt" = NULL
      FROM goals_for_deletion
      WHERE id = gid
      ;
      
      `,
        { transaction }
      )
    })
  },
}
