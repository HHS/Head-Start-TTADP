const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
         /* 1. Backup all current program personnel records in a table */
         SELECT * INTO "ProgramPersonnel_backup_20230828" FROM "ProgramPersonnel"


         /* 2. Create a table of everything we want to keep */
         DROP TABLE IF EXISTS "ProgramPersonnelToKeep";
         CREATE TEMP TABLE "ProgramPersonnelToKeep" AS (
            SELECT
                 "firstName",
                 "lastName",
                 "role",
                 "grantId",
                 "programId",
                 "active",
                 count(id),
                 min("id") AS "idToKeep"
                 FROM "ProgramPersonnel"
                 GROUP BY
                 "firstName",
                 "lastName",
                 "role",
                 "grantId",
                 "programId",
                 "active"
                 order by "active" asc
         )

         /* 3. Delete everything we don't want to keep */
         DELETE FROM "ProgramPersonnel" WHERE id NOT IN (SELECT "idToKeep" FROM "ProgramPersonnelToKeep");
          `, { transaction });
    });
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
};
