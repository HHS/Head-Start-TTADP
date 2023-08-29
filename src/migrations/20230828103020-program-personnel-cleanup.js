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
         /* 1. Remove records we don't want */
         WITH initial_entries AS (
         SELECT
           "firstName",
           "lastName",
           "role",
           "grantId",
           "programId",
           active,
           MIN(id) AS first_insert
         FROM "ProgramPersonnel"
         GROUP BY 1,2,3,4,5,6
         )
         DELETE FROM "ProgramPersonnel"
         USING "ProgramPersonnel" pp
         LEFT JOIN initial_entries
           ON first_insert = pp.id
         WHERE "ProgramPersonnel".id = pp.id
           AND first_insert IS NULL;
         
         /* 2. Make a copy of the audit log before cleaning it up */
         CREATE TABLE "ZZarchiveZALProgramPersonnel20230828103020" AS SELECT * FROM "ZALProgramPersonnel";`,
        { transaction },
      );

      // Disable audit log
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
         /* 3. Clean out the huge number of records related to deleted dupes */
         DELETE FROM "ZALProgramPersonnel" WHERE data_id NOT IN (SELECT id FROM "ProgramPersonnel");
          `, { transaction });
    });
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
};
