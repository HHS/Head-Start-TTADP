const {
  prepMigration,
  removeTables,
} = require('../lib/migration');
const { OBJECTIVE_COLLABORATORS } = require('../constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      //---------------------------------------------------------------------------------
      await queryInterface.sequelize.query(/* sql */`
        INSERT INTO "ValidFor"
        ("name", "isReport", "createdAt", "updatedAt")
        VALUES
        (
          'Objectives',
          false,
          current_timestamp,
          current_timestamp
        );
      `, { transaction });

      //---------------------------------------------------------------------------------

      await queryInterface.sequelize.query(`
        INSERT INTO "CollaboratorTypes"
        ("name", "validForId", "createdAt", "updatedAt")
        SELECT
          t.name,
          vf.id,
          current_timestamp,
          current_timestamp
        FROM "ValidFor" vf
        CROSS JOIN UNNEST(ARRAY[
          ${Object.values(OBJECTIVE_COLLABORATORS).map((type) => `'${type}'`).join(',\n')}
        ]) t(name)
        WHERE vf.name = 'Objectives'
       ;`, { transaction });
      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ObjectiveCollaborators', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
      }, {
        transaction,
      });

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(`
          ALTER TABLE "ObjectiveCollaborators"
          ADD CONSTRAINT "ObjectiveCollaborators_objectiveId_userId_unique" UNIQUE ("objectiveId", "userId");
      `, { transaction });
      //---------------------------------------------------------------------------------
      const collectObjectiveCollaborators = (source, typeName) => /* sql */`
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
        "userId"
      )
      DO UPDATE SET
        "updatedAt" = EXCLUDED."updatedAt",
        "linkBack" = "ObjectiveCollaborators"."linkBack" || EXCLUDED."linkBack"
      RETURNING
        "id" "objectiveCollaboratorId",
        "objectiveId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt";
      `;

      const collectObjectiveCollaboratorsViaAuditLog = (
        dmlType,
        typeName,
      ) => collectObjectiveCollaborators(
        /* sql */`
        SELECT
          data_id "objectiveId",
          dml_as "userId",
          MIN(g."createdAt") "createdAt",
          MIN(g."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "ZALObjectives" zg
        LEFT JOIN "Users" u
        ON zg.dml_as = u.id
        JOIN "Objectives" g
        ON zg.data_id = g.id
        WHERE dml_as NOT IN (-1, 0) -- default and migration files
        AND dml_type = '${dmlType}'
        AND new_row_data -> 'name' IS NOT NULL
        GROUP BY 1,2
        ORDER BY 1,2
        `,
        typeName,
      );

      const collectObjectiveCollaboratorsViaActivityReport = () => collectObjectiveCollaborators(
        /* sql */`
        SELECT
          g.id "objectiveId",
          (ARRAY_AGG(ar."userId" ORDER BY ar.id ASC))[1] "userId",
          MIN(ar."createdAt") "createdAt",
          MIN(ar."createdAt") "updatedAt",
          null::JSONB "linkBack"
        FROM "Objectives" g
        LEFT JOIN "ZALObjectives" zg
        ON g.id = zg.data_id
        LEFT JOIN "ActivityReportObjectives" arg
        ON g.id = arg."objectiveId"
        LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        WHERE (zg.id IS NULL
        OR (zg.dml_as IN (-1, 0)
          AND zg.dml_type = 'INSERT'))
        AND g."createdVia" IN ('activityReport')
        GROUP BY 1
        HAVING (ARRAY_AGG(ar."userId" ORDER BY ar.id ASC))[1] IS NOT NULL
        AND MIN(ar."createdAt") IS NOT NULL
        ORDER BY 1,2
        `,
        OBJECTIVE_COLLABORATORS.CREATOR,
      );

      const collectObjectiveCollaboratorsAsLinkers = () => collectObjectiveCollaborators(
        /* sql */`
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
        OBJECTIVE_COLLABORATORS.LINKER,
      );

      const collectObjectiveCollaboratorsAsUtilizers = () => collectObjectiveCollaborators(
        /* sql */`
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
        OBJECTIVE_COLLABORATORS.UTILIZER,
      );

      await queryInterface.sequelize.query(
        collectObjectiveCollaboratorsViaAuditLog(
          'INSERT',
          OBJECTIVE_COLLABORATORS.CREATOR,
        ),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectObjectiveCollaboratorsViaActivityReport(),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectObjectiveCollaboratorsViaAuditLog(
          'UPDATE',
          OBJECTIVE_COLLABORATORS.EDITOR,
        ),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectObjectiveCollaboratorsAsLinkers(),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectObjectiveCollaboratorsAsUtilizers(),
        { transaction },
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await removeTables(queryInterface, transaction, [
        'ObjectiveCollaborators',
      ]);
    });
  },
};
