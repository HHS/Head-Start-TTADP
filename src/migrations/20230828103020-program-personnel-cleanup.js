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
         /* 1. Backup all current program personnel records in a table. */
         DROP TABLE IF EXISTS "ProgramPersonnel_backup_20230828";
         SELECT * INTO "ProgramPersonnel_backup_20230828" FROM "ProgramPersonnel";

         /* 2. Create a table of everything we want to keep. */
         DROP TABLE IF EXISTS "ProgramPersonnelToKeep";
         CREATE TEMP TABLE "ProgramPersonnelToKeep" AS (
            SELECT
                 "firstName",
                 "lastName",
                 "role",
                 "grantId",
                 "programId",
                 count(id),
                 min("id") AS "idToKeep"
                 FROM "ProgramPersonnel"
                 GROUP BY
                 "firstName",
                 "lastName",
                 "role",
                 "grantId",
                 "programId"
         );

         /* 3. Disable triggers for speed and cut down on noise in audit logs. */
         ALTER TABLE "ProgramPersonnel" DISABLE TRIGGER ALL;

         /* 4. Delete everything we don't want to keep. */
         DELETE FROM "ProgramPersonnel" WHERE id NOT IN (SELECT "idToKeep" FROM "ProgramPersonnelToKeep");

         /* 5. Fix active column by createdAt. */
         UPDATE "ProgramPersonnel" p1
            SET
                "active" = CASE WHEN p2."id" IS NULL THEN true ELSE false END -- True if We are on the most recent record or there is only one record.
            FROM "ProgramPersonnel" p2
            WHERE p1."grantId" = p2."grantId" AND p1."programId" = p2."programId" AND p1."createdAt" < p2."createdAt";

        /* 6. Enable triggers for speed and cut down on noise in audit logs. */
         ALTER TABLE "ProgramPersonnel" ENABLE TRIGGER ALL;
          `, { transaction });
    });
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
};
