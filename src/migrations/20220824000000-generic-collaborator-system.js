module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const ENTITY_TYPES = {
        REPORT: 'Report',
        REPORTGOAL: 'ReportGoal',
        REPORTOBJECTIVE: 'ReportObjective',
        GOAL: 'Goal',
        GOALTEMPLATE: 'GoalTemplate',
        OBJECTIVE: 'Objective',
        OBJECTIVETEMPLATE: 'ObjectiveTemplate',
      };
      const COLLABORATOR_TYPES = {
        EDITOR: 'Editor',
        OWNER: 'Owner',
        INSTANTIATOR: 'Instantiator',
        RATIFIER: 'Ratifier',
      };

      const RATIFIER_STATUSES = {
        NEEDS_ACTION: 'needs_action',
        RATIFIED: 'ratified',
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

      try {
        await queryInterface.createTable('Collaborators', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          entityType: {
            allowNull: false,
            default: null,
            type: Sequelize.DataTypes.ENUM(
              Object.keys(ENTITY_TYPES).map((k) => ENTITY_TYPES[k]),
            ),
          },
          entityId: {
            allowNull: false,
            type: Sequelize.INTEGER,
          },
          collaboratorTypes: {
            allowNull: false,
            default: null,
            type: Sequelize.DataTypes.ARRAY(
              Sequelize.DataTypes.ENUM(
                Object.keys(COLLABORATOR_TYPES).map((k) => COLLABORATOR_TYPES[k]),
              ),
            ),
          },
          userId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
          },
          status: {
            allowNull: true,
            type: Sequelize.DataTypes.ENUM(
              Object.keys(RATIFIER_STATUSES).map((k) => RATIFIER_STATUSES[k]),
            ),
          },
          note: {
            allowNull: true,
            type: Sequelize.DataTypes.TEXT,
          },
          tier: {
            allowNull: false,
            default: 1,
            type: Sequelize.INTEGER,
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
        }, { transaction });

        await queryInterface.sequelize.query(
          `--- CONSTRAINTS
          ALTER TABLE "Collaborators"
          ADD CONSTRAINT "Collaborators_entity_user"
          UNIQUE ("entityType", "entityId", "userId");`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `DO $$
          ------------------------------------------------------------------------------------
          BEGIN
            ------------------------------------------------------------------------------------
            -- Triggers to emulate the behavior of foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfCollaboratorsEntity"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (NEW."entityType" = '${ENTITY_TYPES.REPORT}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ActivityReports"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ActivityReports" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.GOAL}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "Goals"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "Goals" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.GOALTEMPLATE}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "GoalTemplates"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "GoalTemplates" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.REPORTGOAL}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ActivityReportGoals"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ReportGoals" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.OBJECTIVE}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "Objectives"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "Objectives" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.OBJECTIVETEMPLATE}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ObjectiveTemplates"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ObjectiveTemplates" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.REPORTOBJECTIVE}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ActivityReportObjectives"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ReportObjectives" with id = %', NEW.entityId;
                END IF;
              END IF;
              RETURN NEW;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctCollaboratorsEntity"
              AFTER INSERT OR UPDATE
              ON "Collaborators"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfCollaboratorsEntity"();
            ------------------------------------------------------------------------------------
          END$$;`,
          { transaction },
        );

        const entitySets = [
          { entityType: ENTITY_TYPES.REPORT, entityTable: 'ActivityReports', needsRatifier: true },
          { entityType: ENTITY_TYPES.REPORTGOAL, entityTable: 'ActivityReportGoals' },
          { entityType: ENTITY_TYPES.REPORTOBJECTIVE, entityTable: 'ActivityReportObjectives' },
          { entityType: ENTITY_TYPES.GOAL, entityTable: 'Goals' },
          { entityType: ENTITY_TYPES.GOALTEMPLATE, entityTable: 'GoalTemplates' },
          { entityType: ENTITY_TYPES.OBJECTIVE, entityTable: 'Objectives' },
          { entityType: ENTITY_TYPES.OBJECTIVETEMPLATE, entityTable: 'ObjectiveTemplates' },
        ];

        await Promise.all(entitySets.map(async (entitySet) => {
          const { entityType, entityTable, needsRatifier } = entitySet;
          const promises = [];
          promises.push(await queryInterface.sequelize.query(
            `--- ENTITY INDEX in lieu of unsupported multi-table-multi-column foreign key constraint
            CREATE INDEX IF NOT EXISTS "Collaborators_${entityTable}_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = '${entityType}';`,
            { transaction },
          ));
          if (needsRatifier) {
            promises.push(await queryInterface.sequelize.query(
              `--- RATIFIER INDEX for each of the sudo-linked foreign tables
              CREATE INDEX IF NOT EXISTS "Collaborators_${entityTable}_Ratifiers_Index"
              ON "Collaborators"
              ("entityId")
              WHERE "entityType" = '${entityType}'
              AND 'Ratifier' = ANY ( "collaboratorTypes" );`,
              { transaction },
            ));
          }
          promises.push(await queryInterface.sequelize.query(
            `DO $$
            ------------------------------------------------------------------------------------
            BEGIN
            ------------------------------------------------------------------------------------
            --- Triggers to emulate the behavior of foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcf${entityTable}Collaborators"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Collaborators"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = '${entityType}')) THEN
                RAISE EXCEPTION 'Can not delete from "${entityTable}" with id = %, still in use in "Collaborators"', NEW.entityId;
              END IF;
              RETURN NEW;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkct${entityTable}Collaborators"
              AFTER DELETE
              ON "${entityTable}"
              FOR EACH ROW EXECUTE FUNCTION  "fkcf${entityTable}Collaborators"();
            ------------------------------------------------------------------------------------
            END$$;`,
            { transaction },
          ));
          return Promise.all([...promises]);
        }));
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            WITH
            "ActivityReport_Approvers" AS (
                SELECT
                    '${ENTITY_TYPES.REPORT}' "entityType",
                    "activityReportId" "entityId",
                    unnest(ARRAY ['${COLLABORATOR_TYPES.RATIFIER}', '${COLLABORATOR_TYPES.EDITOR}']) "collaboratorType",
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
                    '${ENTITY_TYPES.REPORT}' "entityType",
                    "activityReportId" "entityId",
                    unnest(ARRAY ['${COLLABORATOR_TYPES.EDITOR}']) "collaboratorType",
                    "userId",
                    null::"enum_ActivityReportApprovers_status" "status",
                    null "note",
                    "createdAt",
                    "updatedAt",
                    null::timestamptz "deletedAt"
                FROM "ActivityReportCollaborators"
                WHERE "userId" IS NOT null
            ),
            "ActivityReport_OwnerCreator" AS (
                SELECT
                    '${ENTITY_TYPES.REPORT}' "entityType",
                    "id" "entityId",
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
            "ActivityReport_Goal" AS (
                SELECT
                    g.id "goalId",
                    (ARRAY_AGG(ar.id ORDER BY ar."createdAt" ASC))[1] "activityReportId"
                FROM "Goals" g
                JOIN "ActivityReportGoals" arg
                ON g.id = arg."goalId"
                JOIN "ActivityReports" ar
                ON arg."activityReportId" = ar.id
                GROUP BY g.id
            ),
            "ActivityReport_Objective" AS (
                SELECT
                    o.id "objectiveId",
                    (ARRAY_AGG(ar.id ORDER BY ar."createdAt" ASC))[1] "activityReportId"
                FROM "Objectives" o
                JOIN "ActivityReportObjectives" aro
                ON o.id = aro."objectiveId"
                JOIN "ActivityReports" ar
                ON aro."activityReportId" = ar.id
                GROUP BY o.id
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
            "Goal_All" AS (
                SELECT DISTINCT
                    '${ENTITY_TYPES.GOAL}' "entityType",
                    ag."goalId" "entityId",
                    aa."userId",
                    aa."collaboratorTypes",
                    aa."status",
                    aa."note",
                    aa."tier",
                    g."createdAt",
                    g."updatedAt",
                    null::timestamptz "deletedAt"
                FROM "ActivityReport_Goal" ag
                JOIN "ActivityReport_All" aa
                ON ag."activityReportId" = aa."entityId"
                JOIN "Goals" g
                ON ag."goalId" = g.id
            ),
            "Objective_All" AS (
                SELECT DISTINCT
                    '${ENTITY_TYPES.OBJECTIVE}' "entityType",
                    ao."objectiveId" "entityId",
                    aa."userId",
                    aa."collaboratorTypes",
                    aa."status",
                    aa."note",
                    aa."tier",
                    o."createdAt",
                    o."updatedAt",
                    null::timestamptz "deletedAt"
                FROM "ActivityReport_Objective" ao
                JOIN "ActivityReport_All" aa
                ON ao."activityReportId" = aa."entityId"
                JOIN "Objectives" o
                ON ao."objectiveId" = o.id
            ),
            "ReportGoal_All" AS (
                SELECT DISTINCT
                    '${ENTITY_TYPES.REPORTGOAL}' "entityType",
                    arg."id" "entityId",
                    aa."userId",
                    aa."collaboratorTypes",
                    aa."status",
                    aa."note",
                    aa."tier",
                    arg."createdAt",
                    arg."updatedAt",
                    null::timestamptz "deletedAt"
                FROM "ActivityReportGoals" arg
                JOIN "ActivityReport_All" aa
                ON arg."activityReportId" = aa."entityId"
            ),
            "ReportObjective_All" AS (
                SELECT DISTINCT
                    '${ENTITY_TYPES.REPORTOBJECTIVE}' "entityType",
                    aro."id" "entityId",
                    aa."userId",
                    aa."collaboratorTypes",
                    aa."status",
                    aa."note",
                    aa."tier",
                    aro."createdAt",
                    aro."updatedAt",
                    null::timestamptz "deletedAt"
                FROM "ActivityReportObjectives" aro
                JOIN "ActivityReport_All" aa
                ON aro."activityReportId" = aa."entityId"
            ),
            "Collected_Collaborators" AS (
                SELECT *
                FROM "ActivityReport_All"
                UNION
                SELECT *
                FROM "Goal_All"
                UNION
                SELECT *
                FROM "Objective_All"
                UNION
                SELECT *
                FROM "ReportGoal_All"
                UNION
                SELECT *
                FROM "ReportObjective_All"
            )
            INSERT INTO "Collaborators"
            (
              "entityType",
              "entityId",
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
              cc."entityType"::"enum_Collaborators_entityType",
              cc."entityId",
              cc."userId",
              cc."collaboratorTypes"::"enum_Collaborators_collaboratorTypes"[],
              case
                WHEN  cc."status" = 'approved' THEN 'ratified'::"enum_Collaborators_status"
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
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.addColumn('CollaboratorRoles', 'collaboratorId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Collaborators',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
        }, { transaction });
        await queryInterface.addColumn('CollaboratorRoles', 'roleId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Roles',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
        }, { transaction });

        await queryInterface.sequelize.query(
          `UPDATE "CollaboratorRoles" cr
         SET "collaboratorId" = c.id
         FROM "Collaborators" c
         WHERE c."entityType" = '${ENTITY_TYPES.REPORT}'
         AND c."entityId" = cr."activityReportCollaboratorId";`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `UPDATE "CollaboratorRoles" cr
         SET "roleId" = r.id
         FROM "Roles" r
         WHERE cr."role" = r."fullName";`,
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
          cra."createdAt",
          cra."updatedAt"
         FROM "CollaboratorRoles_ALL" cra
         ORDER BY 3, 1, 2;`,
          { transaction },
        );

        await queryInterface.removeColumn('CollaboratorRoles', 'activityReportCollaboratorId', { transaction });
        await queryInterface.removeColumn('CollaboratorRoles', 'role', { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.removeColumn('ActivityReports', 'creatorRole', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'userId', { transaction });
        await queryInterface.dropTable('ActivityReportApprovers', { transaction });
        await queryInterface.dropTable('ActivityReportCollaborators', { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
