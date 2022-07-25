const { ENTITY_TYPES, COLLABORATOR_TYPES, RATIFIER_STATUSES } = require('../constants');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
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
            allowNull: true,
            default: null,
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
          `DO $$
          ------------------------------------------------------------------------------------
          BEGIN
            ------------------------------------------------------------------------------------
            CONSTRAINTS
            ------------------------------------------------------------------------------------
            ALTER TABLE "Collaborators"
            ADD CONSTRAINT "Collaborators_entity_user"
            UNIQUE ("entityType", "entityId", "userId");
            ------------------------------------------------------------------------------------
            ------------------------------------------------------------------------------------
            ENTITY INDEX in lieu of unsupported multi-table-multi-column foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_ActivityReports_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'ActivityReport';
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_Goals_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'Goal';
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_GoalTemplates_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'GoalTemplate';
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_Objectives_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'Objective';
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_ObjectiveTemplates_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'ObjectiveTemplate';
            ------------------------------------------------------------------------------------
            ------------------------------------------------------------------------------------
            RATIFIER INDEX for each of the sudo-linked foreign tables
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_ActivityReports_Ratifiers_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'ActivityReport'
            AND 'Ratifier' = ANY ( "collaboratorTypes" );
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_Goals_Ratifiers_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'Goal'
            AND 'Ratifier' = ANY ( "collaboratorTypes" );
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_GoalTemplates_Ratifiers_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'GoalTemplate'
            AND 'Ratifier' = ANY ( "collaboratorTypes" );
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_Objectives_Ratifiers_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'Objective'
            AND 'Ratifier' = ANY ( "collaboratorTypes" );
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Collaborators_ObjectiveTemplates_Ratifiers_Index"
            ON "Collaborators"
            ("entityId")
            WHERE "entityType" = 'ObjectiveTemplate'
            AND 'Ratifier' = ANY ( "collaboratorTypes" );
            ------------------------------------------------------------------------------------
            ------------------------------------------------------------------------------------
            Triggers to emulate the behavior of foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfCollaboratorEntity"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (NEW."entityType" = 'ActivityReport') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ActivityReports"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ActivityReports" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = 'Goal') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "Goals"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "Goals" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = 'GoalTemplate') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "GoalTemplates"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "GoalTemplates" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = 'Objective') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "Objectives"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "Objectives" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = 'ObjectiveTemplate') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ObjectiveTemplates"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ObjectiveTemplates" with id = %', NEW.entityId;
                END IF;
              END IF;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctCollaboratorsEntity"
              AFTER INSERT OR UPDATE
              ON "Collaborators"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfCollaboratorsEntity"();
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfActivityReportsCollaborators"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Collaborators"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = 'ActivityReport')) THEN
                RAISE EXCEPTION 'Can not delete "ActivityReports" with id = %, still in use in "Collaborators"', NEW.entityId;
              END IF;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctActivityReportsCollaborators"
              AFTER DELETE
              ON "ActivityReports"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfActivityReportsCollaborators"();
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfGoalsCollaborators"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Collaborators"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = 'Goal')) THEN
                RAISE EXCEPTION 'Can not delete "Goals" with id = %, still in use in "Collaborators"', NEW.entityId;
              END IF;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctGoalsCollaborators"
              AFTER DELETE
              ON "Goals"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfGoalsCollaborators"();
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfGoalTemplatesCollaborators"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Collaborators"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = 'GoalTemplate')) THEN
                RAISE EXCEPTION 'Can not delete "GoalTemplates" with id = %, still in use in "Collaborators"', NEW.entityId;
              END IF;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctGoalTemplatesCollaborators"
              AFTER DELETE
              ON "GoalTemplates"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfGoalTemplatesCollaborators"();
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfObjectivesCollaborators"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Collaborators"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = 'Objective')) THEN
                RAISE EXCEPTION 'Can not delete "Objectives" with id = %, still in use in "Collaborators"', NEW.entityId;
              END IF;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctObjectivesCollaborators"
              AFTER DELETE
              ON "Objectives"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfObjectivesCollaborators"();
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfObjectiveTemplatesCollaborators"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Collaborators"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = 'ObjectiveTemplate')) THEN
                RAISE EXCEPTION 'Can not delete "ObjectiveTemplates" with id = %, still in use in "Collaborators"', NEW.entityId;
              END IF;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctObjectiveTemplatesCollaborators"
              AFTER DELETE
              ON "ObjectiveTemplates"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfObjectiveTemplatesCollaborators"();
            ------------------------------------------------------------------------------------
          END$$;`,
          { transaction },
        );
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
                    'ActivityReport' "entityType",
                    "activityReportId" "entityId",
                    unnest(ARRAY ['Ratifier', 'Editor']) "collaboratorType",
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
                    'ActivityReport' "entityType",
                    "activityReportId" "entityId",
                    unnest(ARRAY ['Editor']) "collaboratorType",
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
                    'ActivityReport' "entityType",
                    "id" "entityId",
                    unnest(ARRAY ['Owner','Editor','Instantiator']) "collaboratorType",
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
                    null::int "tier",
                    MIN("createdAt") "createdAt",
                    MAX("updatedAt") "updatedAt",
                    MAX("deletedAt") "deletedAt"
                FROM "ActivityReport_Union"
                GROUP BY "entityType", "entityId", "userId"
            ),
            "Goal_All" AS (
                SELECT
                    'Goal' "entityType",
                    ag."goalId" "entityId",
                    aa."userId",
                    aa."collaboratorTypes",
                    aa."status",
                    aa."note",
                    aa."tier",
                    aa."createdAt",
                    aa."updatedAt",
                    aa."deletedAt"
                FROM "ActivityReport_Goal" ag
                JOIN "ActivityReport_All" aa
                ON ag."activityReportId" = aa."entityId"
            ),
            "Objective_All" AS (
                SELECT
                    'Objective' "entityType",
                    ao."objectiveId" "entityId",
                    aa."userId",
                    aa."collaboratorTypes",
                    aa."status",
                    aa."note",
                    aa."tier",
                    aa."createdAt",
                    aa."updatedAt",
                    aa."deletedAt"
                FROM "ActivityReport_Objective" ao
                JOIN "ActivityReport_All" aa
                ON ao."activityReportId" = aa."entityId"
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
            FROM "Collected_Collaborators" cc;
          END$$;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
