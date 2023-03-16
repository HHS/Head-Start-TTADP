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
        await queryInterface.renameTable('ActivityReportCollaborators', 'LegacyActivityReportCollaborators');
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
                    "entityType",
                    "entityId",
                    "userId",
                    ARRAY_AGG(distinct "collaboratorType" order by "collaboratorType") "collaboratorTypes",
                    (ARRAY_AGG(distinct "status" order by "status" desc))[1] "status",
                    (ARRAY_AGG(distinct nullif("note",'') order by nullif("note",'') desc))[1] "note",
                    1 "tier",
                    MIN("createdAt") "createdAt",
                    MAX("updatedAt") "updatedAt",
                    MAX("deletedAt") "deletedAt"
                FROM "ActivityReport_Union"
                GROUP BY "entityType", "entityId", "userId"
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
              "tier",
              "createdAt",
              "updatedAt",
              "deletedAt"
            )
            SELECT
              cc."activityReportId",
              cc."userId",
              cc."collaboratorTypes"::"enum_Collaborators_collaboratorTypes"[],
              case
                WHEN  cc."status" = 'approved' THEN '${APPROVAL_STATUSES.APPROVED}'::"enum_Collaborators_status"
                WHEN  cc."status" = 'needs_action' THEN 'needs_action'::"enum_Collaborators_status"
                ELSE null
              END "status",
              cc."note",
              cc."tier",
              cc."createdAt",
              cc."updatedAt",
              cc."deletedAt"
            FROM "Collected_Collaborators" cc
            ORDER BY 8;
          END$$;`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
          WITH

          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        // Update for collaborators
        await queryInterface.sequelize.query(
          `UPDATE "CollaboratorRoles" cr
         SET "collaboratorId" = c.id
         FROM "Collaborators" c
         JOIN "ActivityReportCollaborators" arc
         ON c."entityType" = '${ENTITY_TYPES.REPORT}'
         AND  c."entityId" = arc."activityReportId"
         AND c."userId" = arc."userId"
         WHERE arc.id = cr."activityReportCollaboratorId";`,
          { transaction },
        );

        await queryInterface.changeColumn('CollaboratorRoles', 'collaboratorId', {
          type: Sequelize.INTEGER,
          allowNull: false,
        }, { transaction });
        await queryInterface.removeColumn('CollaboratorRoles', 'activityReportCollaboratorId', { transaction });

        await queryInterface.sequelize.query(
          `--- CONSTRAINTS
          ALTER TABLE "CollaboratorRoles"
          ADD CONSTRAINT "CollaboratorRoles_collaborator_role"
          UNIQUE ("collaboratorId", "roleId");`,
          { transaction },
        );

        // Update for owners
        await queryInterface.sequelize.query(
          `INSERT INTO "CollaboratorRoles" ("collaboratorId", "roleId", "createdAt", "updatedAt")
          SELECT
            c.id "collaboratorId",
            r.id "roleId",
            ar."createdAt",
            ar."updatedAt"
         FROM "Collaborators" c
         JOIN "ActivityReports" ar
         ON c."entityType" = '${ENTITY_TYPES.REPORT}'
         AND c."entityId" = ar.id
         AND c."userId" = ar."userId"
         AND '${COLLABORATOR_TYPES.OWNER}' = ALL("c"."collaboratorTypes")
         JOIN "Roles" r
         ON r."fullName" = ar."creatorRole"::text
         LEFT OUTER JOIN "CollaboratorRoles" cr
         ON c.id = cr."collaboratorId"
         WHERE cr.id is null;`,
          { transaction },
        );

        // Update for approvers
        await queryInterface.sequelize.query(
          `INSERT INTO "CollaboratorRoles" ("collaboratorId", "roleId", "createdAt", "updatedAt")
          SELECT
            c.id "collaboratorId",
            ur."roleId" "roleId",
            ur."createdAt",
            ur."updatedAt"
         FROM "Collaborators" c
         JOIN "UserRoles" ur
         ON c."userId" = ur."userId"
         LEFT OUTER JOIN "CollaboratorRoles" cr
         ON c.id = cr."collaboratorId"
         WHERE c."entityType" = '${ENTITY_TYPES.REPORT}'
         AND '${COLLABORATOR_TYPES.APPROVER}' = ALL("c"."collaboratorTypes")
         AND cr.id is null;`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `WITH
            "CollaboratorRoles_ReportGoal" as (
              SELECT
                c2.id "collaboratorId",
                cr."roleId",
                cr."createdAt",
                cr."updatedAt"
              FROM "CollaboratorRoles" cr
              JOIN "Collaborators" c
              ON cr."collaboratorId" = c.id
              JOIN "ActivityReportGoals" arg
              ON c."entityType" = '${ENTITY_TYPES.REPORT}'
              AND c."entityId" = arg."activityReportId"
              JOIN "Collaborators" c2
              ON c2."entityType" = '${ENTITY_TYPES.REPORTGOAL}'
              AND c2."entityId" = arg.id
            ),
            "CollaboratorRoles_ReportObjective" as (
              SELECT
                c2.id "collaboratorId",
                cr."roleId",
                cr."createdAt",
                cr."updatedAt"
              FROM "CollaboratorRoles" cr
              JOIN "Collaborators" c
              ON cr."collaboratorId" = c.id
              JOIN "ActivityReportObjectives" aro
              ON c."entityType" = '${ENTITY_TYPES.REPORT}'
              AND c."entityId" = aro."activityReportId"
              JOIN "Collaborators" c2
              ON c2."entityType" = '${ENTITY_TYPES.REPORTOBJECTIVE}'
              AND c2."entityId" = aro.id
            ),
            "CollaboratorRoles_Goal" as (
              SELECT DISTINCT
                c2.id "collaboratorId",
                cr."roleId",
                cr."createdAt",
                cr."updatedAt"
              FROM "CollaboratorRoles" cr
              JOIN "Collaborators" c
              ON cr."collaboratorId" = c.id
              JOIN "ActivityReportGoals" arg
              ON c."entityType" = '${ENTITY_TYPES.REPORT}'
              AND c."entityId" = arg."activityReportId"
              JOIN "Collaborators" c2
              ON c2."entityType" = '${ENTITY_TYPES.GOAL}'
              AND c2."entityId" = arg."goalId"
            ),
            "CollaboratorRoles_Objective" as (
              SELECT DISTINCT
                c2.id "collaboratorId",
                cr."roleId",
                cr."createdAt",
                cr."updatedAt"
              FROM "CollaboratorRoles" cr
              JOIN "Collaborators" c
              ON cr."collaboratorId" = c.id
              JOIN "ActivityReportObjectives" aro
              ON c."entityType" = '${ENTITY_TYPES.REPORT}'
              AND c."entityId" = aro."activityReportId"
              JOIN "Collaborators" c2
              ON c2."entityType" = '${ENTITY_TYPES.OBJECTIVE}'
              AND c2."entityId" = aro."objectiveId"
            ),
            "CollaboratorRoles_ALL" as (
              SELECT *
              FROM "CollaboratorRoles_ReportGoal"
              UNION
              SELECT *
              FROM "CollaboratorRoles_ReportObjective"
              UNION
              SELECT *
              FROM "CollaboratorRoles_Goal"
              UNION
              SELECT *
              FROM "CollaboratorRoles_Objective"
            )
          INSERT INTO "CollaboratorRoles"
          (
            "collaboratorId",
            "roleId",
            "createdAt",
            "updatedAt"
          )
         SELECT
          cra."collaboratorId",
          cra."roleId",
          min(cra."createdAt") "createdAt",
          max(cra."updatedAt") "updatedAt"
         FROM "CollaboratorRoles_ALL" cra
         GROUP BY 1, 2
         ORDER BY 3, 1, 2;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.removeColumn('ActivityReports', 'creatorRole', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'userId', { transaction });
        await Promise.all(['ActivityReportApprovers', 'ActivityReportCollaborators'].map(async (table) => {
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
  down: async () => {},
};
