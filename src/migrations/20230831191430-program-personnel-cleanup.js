const { prepMigration, setAuditLoggingState } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `

        /* 1. Create a temp table of dedupe. */
         DROP TABLE IF EXISTS "ProgramPersonnelToKeep";
         CREATE TEMP TABLE "ProgramPersonnelToKeep" AS (
            SELECT
                min(id) id,
                "programId",
                "grantId",
                "firstName",
                "lastName",
                "role",
                "email",
                (ARRAY_AGG(prefix order by id desc))[1] prefix,
                (ARRAY_AGG("suffix" order by id desc))[1] "suffix",
                (ARRAY_AGG("title" order by id desc))[1] "title",
                MIN("createdAt") "createdAt",
                MAX("updatedAt") "updatedAt"
                 FROM "ProgramPersonnel"
                 GROUP BY
                 "firstName",
                 "lastName",
                 "role",
                 "grantId",
                 "programId",
                 "email" -- We want entries on email change.
         );`,
        { transaction }
      )

      /* 2. Disable audit trail. */
      await setAuditLoggingState(queryInterface, transaction, false)

      await queryInterface.sequelize.query(
        `
         /* 3. Truncate botht the ZALProgramPersonnel and ProgramPersonnel tables. */
         TRUNCATE TABLE "ZALProgramPersonnel";
         TRUNCATE TABLE "ProgramPersonnel";
       `,
        { transaction }
      )

      /* 4. Enable audit trail. */
      await setAuditLoggingState(queryInterface, transaction, true)

      /* 5. Add column 'mapsTo' to ProgramPersonnel as a FK to ProgramPersonnel.id. */
      await queryInterface.addColumn(
        'ProgramPersonnel',
        'mapsTo',
        {
          type: 'INTEGER',
          allowNull: true,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ProgramPersonnel',
            },
            key: 'id',
          },
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
      /* 5a. Drop old column */
      ALTER TABLE "ProgramPersonnel"
      DROP COLUMN "originalPersonnelId";

      /* 6. Insert the deduped records in order of id. */
      INSERT INTO "ProgramPersonnel" (
         "firstName",
         "lastName",
         "email",
         "role",
         "grantId",
         "programId",
         "prefix",
         "suffix",
         "title",
         "createdAt",
         "updatedAt",
         "active"
      )
      SELECT
        "firstName",
        "lastName",
        "email",
        "role",
        "grantId",
        "programId",
        "prefix",
        "suffix",
        "title",
        "createdAt",
        "updatedAt",
        false
        FROM "ProgramPersonnelToKeep"
        ORDER BY id ASC;

      /* 7. Set active and mapsTo values. */
      WITH
        distinct_pp AS (
            SELECT
                min("id") AS "id",
                "firstName",
                "lastName",
                "email",
                "role",
                "grantId",
                "programId"
            FROM "ProgramPersonnel"
            GROUP BY 2,3,4,5,6,7
        ),
        active_pp AS (
            SELECT
                "role",
                "grantId",
                "programId",
                max(id) "activeId"
            FROM distinct_pp
            GROUP BY 1,2,3
        ),
        set_active_pp AS (
        UPDATE "ProgramPersonnel" pp
        SET "active" = true,
            "mapsTo" = null
        FROM active_pp app
        WHERE app."activeId" = pp.id
        RETURNING
            pp.id,
            'latest' "type"
        ),
        set_inactive_pp AS (
        UPDATE "ProgramPersonnel" pp
        SET "active" = false,
            "mapsTo" = app."activeId"
        FROM active_pp app
        WHERE app."activeId" != pp.id
        AND app."role" = pp."role"
        AND app."grantId" = pp."grantId"
        AND app."programId" = pp."programId"
        RETURNING
            pp.id,
            'not latest' "type"
        ),
        results AS (
            SELECT *
            FROM set_active_pp
            UNION
            SELECT *
            FROM set_inactive_pp
        )
        SELECT *
        FROM results;`,
        { transaction }
      )
    })
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
}
