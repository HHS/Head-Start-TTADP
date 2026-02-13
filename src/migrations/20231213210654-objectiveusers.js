const { prepMigration, removeTables } = require('../lib/migration')
const { OBJECTIVE_COLLABORATORS } = require('../constants')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      //---------------------------------------------------------------------------------
      await queryInterface.sequelize.query(
        /* sql */ `
        INSERT INTO "ValidFor"
        ("name", "isReport", "createdAt", "updatedAt")
        VALUES
        (
          'Objectives',
          false,
          current_timestamp,
          current_timestamp
        );
      `,
        { transaction }
      )

      //---------------------------------------------------------------------------------

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
          ${Object.values(OBJECTIVE_COLLABORATORS)
            .map((type) => `'${type}'`)
            .join(',\n')}
        ]) t(name)
        WHERE vf.name = 'Objectives'
       ;`,
        { transaction }
      )
      //---------------------------------------------------------------------------------
      await queryInterface.createTable(
        'ObjectiveCollaborators',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          objectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Objectives',
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

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "ObjectiveCollaborators"
          ADD CONSTRAINT "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_unique" UNIQUE ("objectiveId", "userId", "collaboratorTypeId");
      `,
        { transaction }
      )
      //---------------------------------------------------------------------------------
      const collectObjectiveCollaborators = (source, typeName) => /* sql */ `
      WITH
        source_data AS (
          ${source}
        ),
        collaborator_type AS (
          SELECT
            ct.id "collaboratorTypeId"
          FROM "CollaboratorTypes" ct
          JOIN "ValidFor" vf
          ON ct."validForId" = vf.id
          WHERE ct.name = '${typeName}'
          AND vf.name = 'Objectives'
        )
      INSERT INTO "ObjectiveCollaborators"
      (
        "objectiveId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt"
      )
      SELECT
        sd."objectiveId",
        sd."userId",
        ct."collaboratorTypeId",
        sd."linkBack",
        sd."createdAt",
        sd."updatedAt"
      FROM source_data sd
      CROSS JOIN collaborator_type ct
      ON CONFLICT
      (
        "objectiveId",
        "userId",
        "collaboratorTypeId"
      )
      DO UPDATE SET
        "updatedAt" = EXCLUDED."updatedAt",
        "linkBack" = (
          SELECT
            JSONB_OBJECT_AGG(key_values.key, key_values.values)
          FROM (
            SELECT
              je.key,
              JSONB_AGG(DISTINCT jae.value ORDER BY jae.value) "values"
            FROM (
              SELECT "ObjectiveCollaborators"."linkBack"
              UNION
              SELECT EXCLUDED."linkBack"
            ) "linkBacks"("linkBack")
            CROSS JOIN jsonb_each("linkBacks"."linkBack") je
            CROSS JOIN jsonb_array_elements(je.value) jae(value)
            GROUP BY 1
          ) key_values
        )
      RETURNING
        "id" "objectiveCollaboratorId",
        "objectiveId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt";
      `

      const collectObjectiveCollaboratorsViaAuditLogAsCreator = () =>
        collectObjectiveCollaborators(
          /* sql */ `
        SELECT
          data_id "objectiveId",
          dml_as "userId",
          MIN(o."createdAt") "createdAt",
          MIN(o."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALObjectives" zo
        LEFT JOIN "Users" u
        ON zo.dml_as = u.id
        JOIN "Objectives" o
        ON zo.data_id = o.id
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'INSERT'
        AND new_row_data -> 'title' IS NOT NULL
        GROUP BY 1,2
        ORDER BY 1,2
        `,
          OBJECTIVE_COLLABORATORS.CREATOR
        )

      const collectObjectiveCollaboratorsViaAuditLogAsEditor = () =>
        collectObjectiveCollaborators(
          /* sql */ `
        SELECT
          data_id "objectiveId",
          dml_as "userId",
          MIN(o."createdAt") "createdAt",
          MIN(o."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALObjectives" zo
        LEFT JOIN "Users" u
        ON zo.dml_as = u.id
        JOIN "Objectives" o
        ON zo.data_id = o.id
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'UPDATE'
        AND new_row_data -> 'title' IS NOT NULL
        GROUP BY 1,2
        ORDER BY 1,2
        `,
          OBJECTIVE_COLLABORATORS.EDITOR
        )

      const collectObjectiveCollaboratorsViaActivityReport = () =>
        collectObjectiveCollaborators(
          /* sql */ `
        SELECT
          o.id "objectiveId",
          (ARRAY_AGG(ar."userId" ORDER BY ar.id ASC))[1] "userId",
          MIN(ar."createdAt") "createdAt",
          MIN(ar."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "Objectives" o
        LEFT JOIN "ZALObjectives" zo
        ON o.id = zo.data_id
        LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        WHERE (zo.id IS NULL
        OR (zo.dml_as IN (-1, 0)
          AND zo.dml_type = 'INSERT'))
        AND o."createdVia" IN ('activityReport')
        GROUP BY 1
        HAVING (ARRAY_AGG(ar."userId" ORDER BY ar.id ASC))[1] IS NOT NULL
        AND MIN(ar."createdAt") IS NOT NULL
        ORDER BY 1,2
        `,
          OBJECTIVE_COLLABORATORS.CREATOR
        )

      const collectObjectiveCollaboratorsAsLinkers = () =>
        collectObjectiveCollaborators(
          /* sql */ `
       SELECT
        "objectiveId",
        "userId",
        MIN("createdAt") "createdAt",
        MAX("updatedAt") "updatedAt",
        jsonb_build_object('activityReportIds', ARRAY_AGG(DISTINCT ar."activityReportId")) "linkBack"
      FROM (
        SELECT
        arg."objectiveId" "objectiveId",
        zarg.dml_as "userId",
        MIN(arg."createdAt") "createdAt",
        MAX(arg."createdAt") "updatedAt",
          ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
        FROM "ZALActivityReportObjectives" zarg
        LEFT JOIN "ZALActivityReportObjectives" zargd
        ON zarg.data_id = zargd.data_id
        AND zarg.id < zargd.id
        AND zarg.dml_type = 'INSERT'
        AND zargd.dml_type = 'DELETE'
        JOIN "ActivityReportObjectives" arg
        ON zarg.data_id = arg.id
        WHERE zargd.id IS NULL
        AND zarg.dml_type = 'INSERT'
        AND zarg.dml_as NOT IN (-1, 0)
        GROUP BY 1,2
        UNION
        SELECT
        arg."objectiveId",
        ar."userId",
        MIN(arg."createdAt") "createdAt",
        MAX(arg."createdAt") "updatedAt",
          ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
        FROM "ActivityReportObjectives" arg
        JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        LEFT JOIN "ZALActivityReportObjectives" zarg
        ON arg.id = zarg.data_id
        AND zarg.dml_type = 'INSERT'
        WHERE zarg.id IS NULL
        GROUP BY 1,2
      ) x
      CROSS JOIN UNNEST("activityReportIds") ar("activityReportId")
      GROUP BY 1,2
        `,
          OBJECTIVE_COLLABORATORS.LINKER
        )

      const collectObjectiveCollaboratorsAsUtilizers = () =>
        collectObjectiveCollaborators(
          /* sql */ `
        SELECT
          "objectiveId",
          "userId",
          MIN("createdAt") "createdAt",
          MAX("updatedAt") "updatedAt",
            jsonb_build_object('activityReportIds', ARRAY_AGG(DISTINCT ar."activityReportId")) "linkBack"
        FROM (
          SELECT
          arg."objectiveId",
          arc."userId",
          MIN(ar."approvedAt") "createdAt",
          MAX(ar."approvedAt") "updatedAt",
              ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
          FROM "ActivityReports" ar
          JOIN "ActivityReportObjectives" arg
          ON arg."activityReportId" = ar.id
          JOIN "ActivityReportCollaborators" arc
          ON arc."activityReportId" = ar.id
          WHERE ar."approvedAt" IS NOT NULL
          GROUP BY 1,2
          UNION
          SELECT
          arg."objectiveId",
          ar."userId",
          MIN(ar."approvedAt") "createdAt",
          MAX(ar."approvedAt") "updatedAt",
              ARRAY_AGG(DISTINCT arg."activityReportId") "activityReportIds"
          FROM "ActivityReports" ar
          JOIN "ActivityReportObjectives" arg
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
          OBJECTIVE_COLLABORATORS.UTILIZER
        )

      const collectObjectiveCollaboratorsAsMergeDeprecators = () =>
        collectObjectiveCollaborators(
          /* sql */ `
        select
          data_id "objectiveId",
          dml_as "userId",
          MIN(o."createdAt") "createdAt",
          MIN(o."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALObjectives" zo
        JOIN "Objectives" o
        ON zo.data_id = o.id
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'UPDATE'
        AND new_row_data -> 'title' IS NOT NULL
        and new_row_data ->> 'mapsToParentObjectiveId' IS NOT null
        GROUP BY 1,2
        `,
          OBJECTIVE_COLLABORATORS.MERGE_DEPRECATOR
        )

      const collectObjectiveCollaboratorsAsMergeCreator = () =>
        collectObjectiveCollaborators(
          /* sql */ `
        SELECT
          data_id "objectiveId",
          dml_as "userId",
          MIN(o."createdAt") "createdAt",
          MIN(o."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALObjectives" zo
        JOIN "Objectives" o
        ON zo.data_id = o.id
        JOIN "Objectives" o2
        ON o.id = o2."mapsToParentObjectiveId"
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = 'INSERT'
        AND new_row_data -> 'title' IS NOT NULL
        GROUP BY 1,2
        `,
          OBJECTIVE_COLLABORATORS.MERGE_CREATOR
        )

      const collectObjectiveCollaboratorsForMerged = () => /* sql */ `
        WITH
          clusters as (
            select
              o."mapsToParentObjectiveId" "objectiveId",
              oc."userId",
              oc."collaboratorTypeId",
              oc."linkBack",
              oc."createdAt",
              oc."updatedAt",
              oc."objectiveId" "originalObjectiveId",
              (o.title = po.title) "isChosen"
            FROM "ObjectiveCollaborators" oc
            JOIN "CollaboratorTypes" ct
            ON oc."collaboratorTypeId" = ct.id
            JOIN "Objectives" o
            ON oc."objectiveId" = o.id
            JOIN "Objectives" po
            ON o."mapsToParentObjectiveId" = po.id
            WHERE o."mapsToParentObjectiveId" IS NOT NULL
            AND ct.name NOT IN ('${OBJECTIVE_COLLABORATORS.MERGE_CREATOR}', '${OBJECTIVE_COLLABORATORS.MERGE_DEPRECATOR}')
          ),
          unrolled as (
            SELECT
              c."objectiveId",
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
              u."objectiveId",
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
              c."objectiveId",
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
              AND ct."name" = '${OBJECTIVE_COLLABORATORS.CREATOR}'
              AND ct2."name" = '${OBJECTIVE_COLLABORATORS.EDITOR}')
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
          INSERT INTO "ObjectiveCollaborators"
          (
            "objectiveId",
            "userId",
            "collaboratorTypeId",
            "linkBack",
            "createdAt",
            "updatedAt"
          )
          SELECT
            "objectiveId",
            "userId",
            "collaboratorTypeId",
            "linkBack",
            "createdAt",
            "updatedAt"
          FROM mapped_collaborators
          ON CONFLICT
          (
          "objectiveId",
          "userId",
          "collaboratorTypeId"
          )
          DO UPDATE SET
          "updatedAt" = EXCLUDED."updatedAt",
          "linkBack" = (
            SELECT
            JSONB_OBJECT_AGG(key_values.key, key_values.values)
            FROM (
            SELECT
              je.key,
              JSONB_AGG(DISTINCT jae.value ORDER BY jae.value) "values"
            FROM (
              SELECT "ObjectiveCollaborators"."linkBack"
              UNION
              SELECT EXCLUDED."linkBack"
            ) "linkBacks"("linkBack")
            CROSS JOIN jsonb_each("linkBacks"."linkBack") je
            CROSS JOIN jsonb_array_elements(je.value) jae(value)
            GROUP BY 1
            ) key_values
          )
          RETURNING
          "id" "objectiveCollaboratorId",
          "objectiveId",
          "userId",
          "collaboratorTypeId",
          "linkBack",
          "createdAt",
          "updatedAt";`

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsViaAuditLogAsCreator(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsViaActivityReport(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsViaAuditLogAsEditor(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsAsLinkers(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsAsUtilizers(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsAsMergeDeprecators(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsAsMergeCreator(), {
        transaction,
      })

      await queryInterface.sequelize.query(collectObjectiveCollaboratorsForMerged(), {
        transaction,
      })
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await removeTables(queryInterface, transaction, ['ObjectiveCollaborators'])
    })
  },
}
