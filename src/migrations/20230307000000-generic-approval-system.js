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

      const APPROVAL_RATIO = {
        ANY: 'any',
        MAJORITY: 'majority',
        TWOTHIRDS: 'two_thirds',
        ALL: 'all',
      };

      const REPORT_STATUSES = {
        DRAFT: 'draft',
        DELETED: 'deleted',
        SUBMITTED: 'submitted',
        APPROVED: 'approved',
        NEEDS_ACTION: 'needs_action',
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
        await queryInterface.createTable('Approvals', {
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
          tier: {
            allowNull: true,
            default: null,
            type: Sequelize.INTEGER,
          },
          ratioRequired: {
            allowNull: false,
            type: Sequelize.DataTypes
              .ENUM(Object.keys(APPROVAL_RATIO).map((k) => APPROVAL_RATIO[k])),
            default: APPROVAL_RATIO.ALL,
          },
          submissionStatus: {
            allowNull: false,
            type: Sequelize.DataTypes
              .ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
          },
          calculatedStatus: {
            allowNull: true,
            type: Sequelize.DataTypes
              .ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
          },
          firstSubmittedAt: {
            allowNull: true,
            type: Sequelize.DataTypes.DATE,
          },
          submittedAt: {
            allowNull: true,
            type: Sequelize.DataTypes.DATE,
          },
          approvedAt: {
            allowNull: true,
            type: Sequelize.DataTypes.DATE,
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
          ALTER TABLE "Approvals"
          ADD CONSTRAINT "Approvals_entity_tier"
          UNIQUE ("entityType", "entityId", "tier");`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `DO $$
          ------------------------------------------------------------------------------------
          BEGIN
            ------------------------------------------------------------------------------------
            --- Triggers to emulate the behavior of foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcfApprovalsEntity"()
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
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.REPORTGOAL}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ActivityReportGoals"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ActivityReportGoals" with id = %', NEW.entityId;
                END IF;
              ELSIF (NEW."entityType" = '${ENTITY_TYPES.REPORTOBJECTIVE}') THEN
                IF (NOT EXISTS(
                    SELECT id
                    FROM "ActivityReportObjectives"
                    WHERE id = NEW."entityId")) THEN
                  RAISE EXCEPTION 'There are no "ActivityReportObjectives" with id = %', NEW.entityId;
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
              END IF;
              RETURN NEW;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkctApprovalsEntity"
              AFTER INSERT OR UPDATE
              ON "Approvals"
              FOR EACH ROW EXECUTE FUNCTION  "fkcfApprovalsEntity"();
            ------------------------------------------------------------------------------------
          END$$;`,
          { transaction },
        );

        const entitySets = [
          { entityType: ENTITY_TYPES.REPORT, entityTable: 'ActivityReports' },
          { entityType: ENTITY_TYPES.REPORTGOAL, entityTable: 'ActivityReportGoals' },
          { entityType: ENTITY_TYPES.REPORTOBJECTIVE, entityTable: 'ActivityReportObjectives' },
          { entityType: ENTITY_TYPES.GOAL, entityTable: 'Goals' },
          { entityType: ENTITY_TYPES.GOALTEMPLATE, entityTable: 'GoalTemplates' },
          { entityType: ENTITY_TYPES.OBJECTIVE, entityTable: 'Objectives' },
          { entityType: ENTITY_TYPES.OBJECTIVETEMPLATE, entityTable: 'ObjectiveTemplates' },
        ];

        await Promise.all(entitySets.map(async (entitySet) => {
          const { entityType, entityTable } = entitySet;
          const promises = [];
          promises.push(await queryInterface.sequelize.query(
            `--- ENTITY INDEX in lieu of unsupported multi-table-multi-column foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE INDEX IF NOT EXISTS "Approvals_${entityTable}_Index"
            ON "Approvals"
            ("entityId")
            WHERE "entityType" = '${entityType}';`,
            { transaction },
          ));
          promises.push(await queryInterface.sequelize.query(
            `DO $$
            ------------------------------------------------------------------------------------
            BEGIN
            ------------------------------------------------------------------------------------
            --- Triggers to emulate the behavior of foreign key constraint
            ------------------------------------------------------------------------------------
            CREATE FUNCTION "fkcf${entityTable}Approvals"()
              RETURNS trigger
              LANGUAGE plpgsql AS
            $body$
            BEGIN
              IF (EXISTS(
                  SELECT id
                  FROM "Approvals"
                  WHERE "entityId" = NEW."id"
                  AND "entityType" = '${entityType}')) THEN
                RAISE EXCEPTION 'Can not delete from "${entityTable}" with id = %, still in use in "Approvals"', NEW.entityId;
              END IF;
              RETURN NEW;
            END
            $body$;
            ------------------------------------------------------------------------------------
            CREATE TRIGGER "fkct${entityTable}Approvals"
              AFTER DELETE
              ON "${entityTable}"
              FOR EACH ROW EXECUTE FUNCTION  "fkcf${entityTable}Approvals"();
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
          `INSERT INTO "Approvals"
          (
            "entityType",
            "entityId",
            "tier",
            "ratioRequired",
            "submissionStatus",
            "calculatedStatus",
            "firstSubmittedAt",
            "submittedAt",
            "approvedAt",
            "createdAt",
            "updatedAt",
            "deletedAt"
          )
          SELECT
            '${ENTITY_TYPES.REPORT}' "entityType",
            ar.id "entityId",
            UNNEST(ARRAY [0,1]) "tier",
            '${APPROVAL_RATIO.ALL}' "ratioRequired",
            CASE
              WHEN
                ar."submissionStatus" IS NULL
                AND ar."legacyId" IS NOT NULL
              THEN
                '${REPORT_STATUSES.SUBMITTED}'::"enum_Approvals_submissionStatus"
              ELSE
                ar."submissionStatus"::text::"enum_Approvals_submissionStatus"
            END "submissionStatus",
            CASE
              WHEN
                ar."calculatedStatus" IS NULL
                AND ar."legacyId" IS NOT NULL
              THEN
                '${REPORT_STATUSES.APPROVED}'::"enum_Approvals_calculatedStatus"
              ELSE
                ar."calculatedStatus"::text::"enum_Approvals_calculatedStatus"
            END "calculatedStatus",
            NULL "firstSubmittedAt",
            NULL "submittedAt",
            ar."approvedAt",
            ar."createdAt",
            ar."updatedAt",
            NULL "deletedAt"
          FROM "ActivityReports" ar
          ORDER BY 2;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.removeColumn('ActivityReports', 'submissionStatus', { transaction });
        await queryInterface.removeColumn('ActivityReports', 'calculatedStatus', { transaction });
        // await queryInterface.removeColumn('ActivityReports', 'approvedAt', { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
