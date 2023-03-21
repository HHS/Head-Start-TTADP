module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const ENTITY_TYPES = {
        REPORT: 'report',
        REPORTGOAL: 'report_goal',
        REPORTOBJECTIVE: 'report_objective',
        GOAL: 'goal',
        GOALTEMPLATE: 'goal_template',
        OBJECTIVE: 'objective',
        OBJECTIVETEMPLATE: 'objectiveTemplate',
      };
      const COLLABORATOR_TYPES = {
        EDITOR: 'editor',
        OWNER: 'owner',
        INSTANTIATOR: 'instantiator',
        APPROVER: 'approver',
      };

      const APPROVAL_STATUSES = {
        APPROVAL_REQUESTED: 'approval_requested',
        NEEDS_ACTION: 'needs_action',
        APPROVED: 'approved',
      };
      try {
        const loggedUser = '0';
        // const transactionId = '';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Create tables to manage all user ownership in one place for each table type
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            PERFORM "ZAFSetTriggerState"(null, null, null, 'DISABLE');
            PERFORM "ZAFRemoveAuditingOnTable"('ActivityReportCollaborators');
            DROP TABLE "ZALActivityReportCollaborators";
            DROP TRIGGER IF EXISTS "ZALNoUpdateTActivityReportCollaborators"
              ON "ZALActivityReportCollaborators";
            DROP FUNCTION IF EXISTS "ZALNoUpdateFActivityReportCollaborators";
            DROP TRIGGER IF EXISTS "ZALNoDeleteTActivityReportCollaborators"
              ON "ZALActivityReportCollaborators";
            DROP FUNCTION IF EXISTS "ZALNoDeleteFActivityReportCollaborators";
            DROP TRIGGER IF EXISTS "ZALNoTruncateTActivityReportCollaborators"
              ON "ZALActivityReportCollaborators";
            DROP FUNCTION IF EXISTS "ZALNoTruncateFActivityReportCollaborators";
             ALTER TABLE "ActivityReportCollaborators"
              RENAME TO "LegacyActivityReportCollaborators";
            PERFORM "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          END$$;`,
          { transaction },
        );
        const tablesToCreate = [
          {
            parentTable: 'ActivityReports',
            prefix: 'ActivityReport',
            parentForeignKey: 'activityReportId',
            foreignKey: 'activityReportCollaboratorId',
          },
        ];
        await Promise.all(tablesToCreate.map(async ({
          parentTable,
          prefix,
          parentForeignKey: foreignKey,
        }) => queryInterface.createTable(`${prefix}Collaborators`, {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          [foreignKey]: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: parentTable,
              },
              key: 'id',
            },
          },
          collaboratorTypes: {
            allowNull: false,
            default: null,
            type: Sequelize.DataTypes.ARRAY(
              Sequelize.DataTypes.ENUM(Object.values(COLLABORATOR_TYPES)),
            ),
          },
          userId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
          },
          status: {
            allowNull: true,
            type: Sequelize.DataTypes.ENUM(Object.values(APPROVAL_STATUSES)),
          },
          note: {
            allowNull: true,
            type: Sequelize.DataTypes.TEXT,
          },
          createdAt: {
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
            type: Sequelize.DATE,
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        }, { transaction })));

        await Promise.all(tablesToCreate.map(async ({
          parentTable,
          prefix,
          foreignKey,
        }) => queryInterface.createTable(`${prefix}CollaboratorRoles`, {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          [foreignKey]: {
            type: Sequelize.INTEGER,
            allowNull: false,
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: `${prefix}Collaborators`,
              },
              key: 'id',
            },
          },
          roleId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            onDelete: 'CASCADE',
            references: {
              model: {
                tableName: 'Roles',
              },
              key: 'id',
            },
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        }, { transaction })));
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Seed each of the collaborator tables with currently available data
      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            WITH
            "ActivityReport_Approvers" AS (
                SELECT
                    "activityReportId" "activityReportId",
                    unnest(ARRAY ['${COLLABORATOR_TYPES.APPROVER}', '${COLLABORATOR_TYPES.EDITOR}']) "collaboratorType",
                    "userId",
                    "status",
                    "note",
                    "createdAt",
                    "updatedAt",
                    "deletedAt"
                FROM "ActivityReportApprovers"
                WHERE "userId" IS NOT null
            ),
            "ActivityReport_Collaborators" AS (
                SELECT
                    "activityReportId" "activityReportId",
                    unnest(ARRAY ['${COLLABORATOR_TYPES.EDITOR}']) "collaboratorType",
                    "userId",
                    null::"enum_ActivityReportApprovers_status" "status",
                    null "note",
                    "createdAt",
                    "updatedAt",
                    null::timestamptz "deletedAt"
                FROM "LegacyActivityReportCollaborators"
                WHERE "userId" IS NOT null
            ),
            "ActivityReport_OwnerCreator" AS (
                SELECT
                    "id" "activityReportId",
                    unnest(ARRAY ['${COLLABORATOR_TYPES.OWNER}','${COLLABORATOR_TYPES.EDITOR}','${COLLABORATOR_TYPES.INSTANTIATOR}']) "collaboratorType",
                    "userId",
                    null::"enum_ActivityReportApprovers_status" "status",
                    null "note",
                    "createdAt",
                    "updatedAt",
                    null::timestamptz "deletedAt"
                FROM "ActivityReports"
                WHERE "userId" IS NOT null
                GROUP BY "id", "userId", "createdAt", "updatedAt"
            ),
            "ActivityReport_Union" AS (
                SELECT *
                FROM "ActivityReport_Approvers"
                UNION
                SELECT *
                FROM "ActivityReport_Collaborators"
                UNION
                SELECT *
                FROM "ActivityReport_OwnerCreator"
            ),
            "ActivityReport_All" AS (
                SELECT
                    "activityReportId",
                    "userId",
                    ARRAY_AGG(distinct "collaboratorType" order by "collaboratorType") "collaboratorTypes",
                    (ARRAY_AGG(distinct "status" order by "status" desc))[1] "status",
                    (ARRAY_AGG(distinct nullif("note",'') order by nullif("note",'') desc))[1] "note",
                    MIN("createdAt") "createdAt",
                    MAX("updatedAt") "updatedAt",
                    MAX("deletedAt") "deletedAt"
                FROM "ActivityReport_Union"
                GROUP BY "activityReportId", "createdAt", "userId"
            ),
            "Collected_Collaborators" AS (
                SELECT *
                FROM "ActivityReport_All"
            )
            INSERT INTO "ActivityReportCollaborators"
            (
              "activityReportId",
              "userId",
              "collaboratorTypes",
              "status",
              "note",
              "createdAt",
              "updatedAt",
              "deletedAt"
            )
            SELECT
              cc."activityReportId",
              cc."userId",
              cc."collaboratorTypes"::"enum_ActivityReportCollaborators_collaboratorTypes"[],
              case
                WHEN  cc."status" = 'approved' THEN '${APPROVAL_STATUSES.APPROVED}'::"enum_ActivityReportCollaborators_status"
                WHEN  cc."status" = 'needs_action' THEN 'needs_action'::"enum_ActivityReportCollaborators_status"
                ELSE null
              END "status",
              cc."note",
              cc."createdAt",
              cc."updatedAt",
              cc."deletedAt"
            FROM "Collected_Collaborators" cc
            ORDER BY 8;
          END$$;`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `INSERT INTO "ActivityReportCollaboratorRoles" (
            "activityReportCollaboratorId",
            "roleId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            arc."id" "activityReportCollaboratorId",
            cr."roleId",
            cr."createdAt",
            cr."updatedAt"
          FROM "ActivityReportCollaborators" arc
          JOIN "LegacyActivityReportCollaborators" larc
          ON arc."activityReportId" = larc."activityReportId"
          AND arc."userId" = larc."userId"
          JOIN "CollaboratorRoles" cr
          ON larc."id" = cr."activityReportCollaboratorId";`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `INSERT INTO "ActivityReportCollaboratorRoles" (
            "activityReportCollaboratorId",
            "roleId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            arc."id" "activityReportCollaboratorId",
            ur."roleId",
            GREATEST(arc."createdAt", ur."createdAt") "createdAt",
            GREATEST(arc."updatedAt", ur."updatedAt") "updatedAt"
          FROM "ActivityReportCollaborators" arc
          JOIN "Users" u
          ON arc."userId" = u.id
          JOIN "UserRoles" ur
          ON u.id = ur."userId"
          LEFT JOIN "ActivityReportCollaboratorRoles" arcr
          ON arc."id" = arcr."activityReportCollaboratorId"
          WHERE arcr.id is null;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.removeColumn('ActivityReports', 'creatorRole', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'userId', { transaction });
        await Promise.all(['ActivityReportApprovers', 'CollaboratorRoles'].map(async (table) => {
          await queryInterface.sequelize.query(
            ` SELECT "ZAFRemoveAuditingOnTable"('${table}');`,
            { raw: true, transaction },
          );
          // Drop old audit log table
          await queryInterface.dropTable(`ZAL${table}`, { transaction });
          await queryInterface.dropTable(table, { transaction });
        }));
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  // down: async (
  //   queryInterface,
  //   Sequelize,
  // ) => queryInterface.sequelize.transaction(async (transaction) => {

  // }),
};
