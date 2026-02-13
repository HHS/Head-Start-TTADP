const { prepMigration, removeTables } = require('../lib/migration')
const { GOAL_COLLABORATORS } = require('../constants')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      //---------------------------------------------------------------------------------
      await queryInterface.createTable(
        'ValidFor',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          name: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          isReport: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          },
          mapsTo: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'ValidFor',
              },
              key: 'id',
            },
          },
        },
        { transaction }
      )

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "ValidFor"
          ADD CONSTRAINT "ValidFor_option_unique" UNIQUE ("name");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
        INSERT INTO "ValidFor"
        ("name", "isReport", "createdAt", "updatedAt")
        VALUES
        (
          'Goals',
          false,
          current_timestamp,
          current_timestamp
        );
      `,
        { transaction }
      )

      //---------------------------------------------------------------------------------
      await queryInterface.createTable(
        'CollaboratorTypes',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          validForId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'ValidFor',
              },
              key: 'id',
            },
          },
          propagateOnMerge: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          },
          mapsTo: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'CollaboratorTypes',
              },
              key: 'id',
            },
          },
        },
        {
          transaction,
        }
      )

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "CollaboratorTypes"
          ADD CONSTRAINT "CollaboratorTypes_name_validForId_unique" UNIQUE ("name", "validForId");
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        INSERT INTO "CollaboratorTypes"
        ("name", "validForId", "propagateOnMerge", "createdAt", "updatedAt")
        SELECT
          t.name,
          vf.id,
          t.name NOT LIKE 'Merge%',
          current_timestamp,
          current_timestamp
        FROM "ValidFor" vf
        CROSS JOIN UNNEST(ARRAY[
          ${Object.values(GOAL_COLLABORATORS)
            .map((type) => `'${type}'`)
            .join(',\n')}
        ]) t(name)
        WHERE vf.name = 'Goals'
       ;`,
        { transaction }
      )
      //---------------------------------------------------------------------------------
      await queryInterface.createTable(
        'GoalCollaborators',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          goalId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Goals',
              },
              key: 'id',
            },
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
          },
          collaboratorTypeId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'CollaboratorTypes',
              },
              key: 'id',
            },
          },
          linkBack: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
            defaultValue: null,
          },
        },
        {
          transaction,
        }
      )

      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_idx"
          ON "GoalCollaborators"
          ("goalId", "userId", "collaboratorTypeId");
      `,
        { transaction }
      )
      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "GoalCollaborators"
          ADD CONSTRAINT "GoalCollaborators_goalId_userId_collaboratorTypeId_unique"
          UNIQUE USING INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_idx";
      `,
        { transaction }
      )
      //---------------------------------------------------------------------------------
      const collectGoalCollaborators = (source, typeName) => /* sql */ `

      DROP TABLE IF EXISTS needed_collaborators;
      CREATE TEMP TABLE needed_collaborators
      AS
      WITH source_data AS (
        ${source}
      ),
      collaborator_type AS (
        SELECT
          ct.id "collaboratorTypeId"
        FROM "CollaboratorTypes" ct
        JOIN "ValidFor" vf
        ON ct."validForId" = vf.id
        WHERE ct.name = '${typeName}'
        AND vf.name = 'Goals'
      )
      SELECT
        sd."goalId",
        sd."userId",
        ct."collaboratorTypeId",
        sd."linkBack",
        sd."createdAt",
        sd."updatedAt"
      FROM source_data sd
      CROSS JOIN collaborator_type ct
      ;

      DROP TABLE IF EXISTS tmp_collaborators_to_create;
      CREATE TEMP TABLE tmp_collaborators_to_create
      AS
      SELECT
        nc."goalId",
        nc."userId",
        nc."collaboratorTypeId",
        nc."linkBack",
        nc."createdAt",
        nc."updatedAt"
      FROM needed_collaborators nc
      LEFT JOIN "GoalCollaborators" gc
      ON gc."goalId" = nc."goalId"
      AND gc."userId" = nc."userId"
      AND gc."collaboratorTypeId" = nc."collaboratorTypeId"
      WHERE gc.id IS NULL
      ;

      DROP TABLE IF EXISTS tmp_collaborators_to_update;
      CREATE TEMP TABLE tmp_collaborators_to_update
      AS
      SELECT
        gc.id "id",
        LEAST(gc."createdAt", nc."createdAt") "createdAt",
        GREATEST(gc."updatedAt", nc."updatedAt") "updatedAt",
        (
          SELECT
            JSONB_OBJECT_AGG(key_values.key, key_values.values)
          FROM (
            SELECT
              je.key,
              JSONB_AGG(DISTINCT jae.value ORDER BY jae.value) "values"
            FROM (
              SELECT gc."linkBack"
              UNION
              SELECT nc."linkBack"
            ) "linkBacks"("linkBack")
            CROSS JOIN jsonb_each("linkBacks"."linkBack") je
            CROSS JOIN jsonb_array_elements(je.value) jae(value)
            GROUP BY 1
          ) key_values
        ) "linkBack"
      FROM "GoalCollaborators" gc
      JOIN needed_collaborators nc
        ON gc."goalId" = nc."goalId"
        AND gc."userId" = nc."userId"
        AND gc."collaboratorTypeId" = nc."collaboratorTypeId"
      ;

      INSERT INTO "GoalCollaborators"
      (
        "goalId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt"
      )
      SELECT 
        ctc."goalId",
        ctc."userId",
        ctc."collaboratorTypeId",
        ctc."linkBack",
        ctc."createdAt",
        ctc."updatedAt"
      FROM tmp_collaborators_to_create ctc;

      UPDATE "GoalCollaborators" gc
      SET
        "createdAt" = ctu."createdAt",
        "updatedAt" = ctu."updatedAt",
        "linkBack" = ctu."linkBack"
      FROM tmp_collaborators_to_update ctu
      WHERE gc.id = ctu.id;
      `

      const collectGoalCollaboratorsViaAuditLogAsCreator = () =>
        collectGoalCollaborators(
          /* sql */ `
        SELECT
          data_id "goalId",
          dml_as "userId",
          MIN(g."createdAt") "createdAt",
          MIN(g."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALGoals" zg
        JOIN "Goals" g
        ON zg.data_id = g.id
        LEFT JOIN "Goals" g2
        ON g.id = g2."mapsToParentGoalId"
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'INSERT'
        AND new_row_data -> 'name' IS NOT NULL
        AND g2.id IS NULL
        GROUP BY 1,2
        `,
          GOAL_COLLABORATORS.CREATOR
        )

      const collectGoalCollaboratorsViaAuditLogAsEditor = () =>
        collectGoalCollaborators(
          /* sql */ `
        SELECT
          data_id "goalId",
          dml_as "userId",
          MIN(g."createdAt") "createdAt",
          MIN(g."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALGoals" zg
        JOIN "Goals" g
        ON zg.data_id = g.id
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'UPDATE'
        AND new_row_data -> 'name' IS NOT NULL
        GROUP BY 1,2
        `,
          GOAL_COLLABORATORS.EDITOR
        )

      const collectGoalCollaboratorsViaActivityReport = () =>
        collectGoalCollaborators(
          /* sql */ `
        SELECT
          g.id "goalId",
          (ARRAY_AGG(ar."userId" ORDER BY ar.id ASC))[1] "userId",
          MIN(ar."createdAt") "createdAt",
          MIN(ar."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "Goals" g
        LEFT JOIN "ZALGoals" zg
        ON g.id = zg.data_id
        LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
        LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        WHERE (zg.id IS NULL
        OR (zg.dml_as IN (-1, 0)
          AND zg.dml_type = 'INSERT'))
        AND g."createdVia" IN ('activityReport')
        GROUP BY 1
        HAVING (ARRAY_AGG(ar."userId" ORDER BY ar.id ASC))[1] IS NOT NULL
        AND MIN(ar."createdAt") IS NOT NULL
        ORDER BY 1
        `,
          GOAL_COLLABORATORS.CREATOR
        )

      const collectGoalCollaboratorsAsLinkers = () =>
        collectGoalCollaborators(
          /* sql */ `
       SELECT
        "goalId",
        "userId",
        MIN("createdAt") "createdAt",
        MAX("updatedAt") "updatedAt",
        jsonb_build_object('activityReportIds', ARRAY_AGG(DISTINCT ar."activityReportId")) "linkBack"
      FROM (
        SELECT
        arg."goalId" "goalId",
        zarg.dml_as "userId",
        MIN(arg."createdAt") "createdAt",
        MAX(arg."createdAt") "updatedAt",
          ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
        FROM "ZALActivityReportGoals" zarg
        LEFT JOIN "ZALActivityReportGoals" zargd
        ON zarg.data_id = zargd.data_id
        AND zarg.id < zargd.id
        AND zarg.dml_type = 'INSERT'
        AND zargd.dml_type = 'DELETE'
        JOIN "ActivityReportGoals" arg
        ON zarg.data_id = arg.id
        WHERE zargd.id IS NULL
        AND zarg.dml_type = 'INSERT'
        AND zarg.dml_as NOT IN (-1, 0)
        GROUP BY 1,2
        UNION
        SELECT
        arg."goalId",
        ar."userId",
        MIN(arg."createdAt") "createdAt",
        MAX(arg."createdAt") "updatedAt",
          ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
        FROM "ActivityReportGoals" arg
        JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        LEFT JOIN "ZALActivityReportGoals" zarg
        ON arg.id = zarg.data_id
        AND zarg.dml_type = 'INSERT'
        AND zarg.dml_as NOT IN (-1, 0)
        WHERE zarg.id IS NULL
        GROUP BY 1,2
      ) x
      CROSS JOIN UNNEST("activityReportIds") ar("activityReportId")
      GROUP BY 1,2
        `,
          GOAL_COLLABORATORS.LINKER
        )

      const collectGoalCollaboratorsAsUtilizers = () =>
        collectGoalCollaborators(
          /* sql */ `
        SELECT
          "goalId",
          "userId",
          MIN("createdAt") "createdAt",
          MAX("updatedAt") "updatedAt",
            jsonb_build_object('activityReportIds', ARRAY_AGG(DISTINCT ar."activityReportId")) "linkBack"
        FROM (
          SELECT
          arg."goalId",
          arc."userId",
          MIN(ar."approvedAt") "createdAt",
          MAX(ar."approvedAt") "updatedAt",
              ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
          FROM "ActivityReports" ar
          JOIN "ActivityReportGoals" arg
          ON arg."activityReportId" = ar.id
          JOIN "ActivityReportCollaborators" arc
          ON arc."activityReportId" = ar.id
          WHERE ar."approvedAt" IS NOT NULL
          GROUP BY 1,2
          UNION
          SELECT
          arg."goalId",
          ar."userId",
          MIN(ar."approvedAt") "createdAt",
          MAX(ar."approvedAt") "updatedAt",
              ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
          FROM "ActivityReports" ar
          JOIN "ActivityReportGoals" arg
          ON arg."activityReportId" = ar.id
          LEFT JOIN "ActivityReportCollaborators" arc
          ON arc."activityReportId" = ar.id
          AND ar."userId" = arc."userId"
          WHERE ar."approvedAt" IS NOT NULL
          AND arc.id IS NULL
          GROUP BY 1,2
        ) x
        CROSS JOIN UNNEST("activityReportIds") ar("activityReportId")
        GROUP BY 1,2
        `,
          GOAL_COLLABORATORS.UTILIZER
        )

      const collectGoalCollaboratorsAsMergeDeprecators = () =>
        collectGoalCollaborators(
          /* sql */ `
        select
          data_id "goalId",
          dml_as "userId",
          MIN(g."createdAt") "createdAt",
          MIN(g."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALGoals" zg
        JOIN "Goals" g
        ON zg.data_id = g.id
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'UPDATE'
        AND new_row_data -> 'name' IS NOT NULL
        and new_row_data ->> 'mapsToParentGoalId' IS NOT null
        GROUP BY 1,2
        `,
          'Merge-Deprecator'
        )

      const collectGoalCollaboratorsAsMergeCreator = () =>
        collectGoalCollaborators(
          /* sql */ `
        SELECT
          data_id "goalId",
          dml_as "userId",
          MIN(g."createdAt") "createdAt",
          MIN(g."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALGoals" zg
        JOIN "Goals" g
        ON zg.data_id = g.id
        JOIN "Goals" g2
        ON g.id = g2."mapsToParentGoalId"
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'INSERT'
        AND new_row_data -> 'name' IS NOT NULL
        GROUP BY 1,2
        `,
          'Merge-Creator'
        )

      const collectGoalCollaboratorsForMerged = () => /* sql */ `
        WITH
          clusters as (
            select
              g."mapsToParentGoalId" "goalId",
              gc."userId",
              gc."collaboratorTypeId",
              gc."linkBack",
              gc."createdAt",
              gc."updatedAt",
              gc."goalId" "originalGoalId",
              (g.name = pg.name) "isChosen"
            FROM "GoalCollaborators" gc
            JOIN "CollaboratorTypes" ct
            ON gc."collaboratorTypeId" = ct.id
            JOIN "Goals" g
            ON gc."goalId" = g.id
            JOIN "Goals" pg
            ON g."mapsToParentGoalId" = pg.id
            WHERE g."mapsToParentGoalId" IS NOT NULL
            AND ct.name NOT IN ('Merge-Creator', 'Merge-Deprecator')
          ),
          unrolled as (
            SELECT
              c."goalId",
              c."userId",
              c."collaboratorTypeId",
              je.key,
              JSONB_AGG(DISTINCT v.value ORDER BY v.value) "values",
              MIN(c."createdAt") "createdAt",
              MAX(c."updatedAt") "updatedAt"
            FROM clusters c
            CROSS JOIN jsonb_each(c."linkBack") je
            CROSS JOIN jsonb_array_elements(je.value) v(value)
            where c."linkBack" is not null
            group by 1,2,3,4
          ),
          rerolled as (
            SELECT
              u."goalId",
              u."userId",
              u."collaboratorTypeId",
              JSONB_OBJECT_AGG(u.key,u.values) "linkBack",
              MIN(u."createdAt") "createdAt",
              MAX(u."updatedAt") "updatedAt"
            FROM unrolled u
            group by 1,2,3
          ),
          rolled as (
            SELECT
              c."goalId",
              c."userId",
              ct2.id "collaboratorTypeId",
              null::JSONB "linkBack",
              MIN(c."createdAt") "createdAt",
              MAX(c."updatedAt") "updatedAt"
            FROM clusters c
            JOIN "CollaboratorTypes" ct
            ON c."collaboratorTypeId" = ct.id
            JOIN "CollaboratorTypes" ct2
            ON ct."validForId" = ct2."validForId"
            AND ((c."isChosen" IS NOT TRUE
              AND ct."name" = '${GOAL_COLLABORATORS.CREATOR}'
              AND ct2."name" = '${GOAL_COLLABORATORS.EDITOR}')
              OR ct.id = ct2.id)
            WHERE c."linkBack" IS null
            GROUP BY 1,2,3
          ),
          mapped_collaborators AS (
            SELECT
              *
            FROM rerolled
            UNION
            SELECT
              *
            FROM rolled
          )
          INSERT INTO "GoalCollaborators"
          (
            "goalId",
            "userId",
            "collaboratorTypeId",
            "linkBack",
            "createdAt",
            "updatedAt"
          )
          SELECT
            "goalId",
            "userId",
            "collaboratorTypeId",
            "linkBack",
            "createdAt",
            "updatedAt"
          FROM mapped_collaborators;`

      await queryInterface.sequelize.query(collectGoalCollaboratorsViaAuditLogAsCreator(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectGoalCollaboratorsViaActivityReport(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectGoalCollaboratorsViaAuditLogAsEditor(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectGoalCollaboratorsAsLinkers(), { transaction })

      await queryInterface.sequelize.query(collectGoalCollaboratorsAsUtilizers(), { transaction })

      await queryInterface.sequelize.query(collectGoalCollaboratorsAsMergeCreator(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectGoalCollaboratorsAsMergeDeprecators(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectGoalCollaboratorsForMerged(), { transaction })
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await removeTables(queryInterface, transaction, ['GoalCollaborators', 'CollaboratorTypes', 'ValidFor'])
    })
  },
}
