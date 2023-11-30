const {
  prepMigration,
  removeTables,
} = require('../lib/migration');
const { GOAL_COLLABORATORS } = require('../constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ValidFor', {
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
      }, { transaction });

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(`
          ALTER TABLE "ValidFor"
          ADD CONSTRAINT "ValidFor_option_unique" UNIQUE ("name");
      `, { transaction });

      await queryInterface.sequelize.query(/* sql */`
        INSERT INTO "ValidFor"
        ("name", "isReport", "createdAt", "updatedAt")
        VALUES
        (
          'Goals',
          false,
          current_timestamp,
          current_timestamp
        );
      `, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('CollaboratorTypes', {
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
      }, {
        transaction,
      });

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(`
          ALTER TABLE "CollaboratorTypes"
          ADD CONSTRAINT "CollaboratorTypes_name_validForId_unique" UNIQUE ("name", "validForId");
      `, { transaction });

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
          ${Object.values(GOAL_COLLABORATORS).map((type) => `'${type}'`).join(',\n')}
        ]) t(name)
        WHERE vf.name = 'Goals'
       ;`, { transaction });
      //---------------------------------------------------------------------------------
      await queryInterface.createTable('GoalCollaborators', {
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
      }, {
        transaction,
      });

      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(`
          ALTER TABLE "GoalCollaborators"
          ADD CONSTRAINT "GoalCollaborators_goalId_userId_collaboratorTypeId_unique" UNIQUE ("goalId", "userId", "collaboratorTypeId");
      `, { transaction });
      //---------------------------------------------------------------------------------
      const collectGoalCollaborators = (source, typeName) => /* sql */`
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
        sd."goalId",
        sd."userId",
        ct."collaboratorTypeId",
        sd."linkBack",
        sd."createdAt",
        sd."updatedAt"
      FROM source_data sd
      CROSS JOIN collaborator_type ct
      ON CONFLICT
      (
        "goalId",
        "userId",
        "collaboratorTypeId"
      )
      DO UPDATE SET
        "updatedAt" = EXCLUDED."updatedAt",
        "linkBack" = "GoalCollaborators"."linkBack" || EXCLUDED."linkBack"
      RETURNING
        "id" "goalCollaboratorId",
        "goalId",
        "userId",
        "collaboratorTypeId",
        "linkBack",
        "createdAt",
        "updatedAt";
      `;

      const collectGoalCollaboratorsViaAuditLog = (dmlType, typeName) => collectGoalCollaborators(
        /* sql */`
        SELECT
            data_id "goalId",
            dml_as "userId",
            MIN(g."createdAt") "createdAt",
            MIN(g."createdAt") "updatedAt",
            null::JSONB "linkBack"
          FROM "ZALGoals" zg
          LEFT JOIN "Users" u
          ON zg.dml_as = u.id
          JOIN "Goals" g
          ON zg.data_id = g.id
          WHERE dml_as NOT IN (-1, 0) -- default and migration files
          AND dml_type = '${dmlType}'
          AND new_row_data -> 'name' IS NOT NULL
          GROUP BY 1,2
        `,
        typeName,
      );

      const collectGoalCollaboratorsViaActivityReport = () => collectGoalCollaborators(
        /* sql */`
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
        GOAL_COLLABORATORS.CREATOR,
      );

      const collectGoalCollaboratorsAsLinkers = () => collectGoalCollaborators(
        /* sql */`
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
        WHERE zarg.id IS NULL
        GROUP BY 1,2
      ) x
      CROSS JOIN UNNEST("activityReportIds") ar("activityReportId")
      GROUP BY 1,2
        `,
        GOAL_COLLABORATORS.LINKER,
      );

      const collectGoalCollaboratorsAsUtilizers = () => collectGoalCollaborators(
        /* sql */`
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
        GOAL_COLLABORATORS.UTILIZER,
      );

      await queryInterface.sequelize.query(
        collectGoalCollaboratorsViaAuditLog(
          'INSERT',
          GOAL_COLLABORATORS.CREATOR,
        ),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectGoalCollaboratorsViaActivityReport(),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectGoalCollaboratorsViaAuditLog(
          'UPDATE',
          GOAL_COLLABORATORS.EDITOR,
        ),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectGoalCollaboratorsAsLinkers(),
        { transaction },
      );

      await queryInterface.sequelize.query(
        collectGoalCollaboratorsAsUtilizers(),
        { transaction },
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await removeTables(queryInterface, transaction, [
        'GoalCollaborators',
        'CollaboratorTypes',
        'ValidFor',
      ]);
    });
  },
};
