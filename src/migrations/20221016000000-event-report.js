module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const REPORT_TYPE = {
        ACTIVITY: 'activity',
        RTTAPA: 'rttapa',
      };

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
        RATIFIER: 'ratifier',
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
        await queryInterface.createTable('EventReports', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          reportType: {
            allowNull: false,
            default: null,
            type: Sequelize.DataTypes.ENUM(
              Object.keys(REPORT_TYPE).map((k) => REPORT_TYPE[k]),
            ),
          },
          additionalNotes: {
            allowNull: true,
            type: Sequelize.TEXT,
          },
          deliveryMethod: { // TODO: should this be an array of enums to cover "In Person", "Virtual - Telephone", "Virtual - Video"
            allowNull: true,
            type: Sequelize.STRING,
          },
          startDate: {
            allowNull: true,
            type: Sequelize.DATEONLY,
          },
          endDate: {
            allowNull: true,
            type: Sequelize.DATEONLY,
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
        }, { transaction });

        await queryInterface.sequelize.query(
          `INSERT INTO "EventReports" (
            "id",
            "reportType",
            "additionalNotes",
            "deliveryMethod",
            "startDate",
            "endDate",
            "createdAt",
            "updatedAt"
          )
          SELECT
            "id",
            '${REPORT_TYPE.ACTIVITY}' "reportType",
            "additionalNotes",
            "deliveryMethod",
            "startDate",
            "endDate",
            "createdAt",
            "updatedAt"
          FROM "ActivityReports";`,
          { transaction },
        );

        const maxindex = await queryInterface.sequelize.query(
          `SELECT
            MAX(id)
          FROM "EventReports";`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `ALTER SEQUENCE "EventReports_id_seq"
          RESTART WITH ${maxindex + 1};`,
        );

        await queryInterface.addColumn(
          'ActivityReports',
          'eventReportId',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: { tableName: 'EventReports' }, key: 'id' },
          },
          { transaction },
        );
        await queryInterface.removeColumn(
          'ActivityReports',
          'additionalNotes',
          { transaction },
        );
        await queryInterface.removeColumn(
          'ActivityReports',
          'deliveryMethod',
          { transaction },
        );
        await queryInterface.removeColumn(
          'ActivityReports',
          'startDate',
          { transaction },
        );
        await queryInterface.removeColumn(
          'ActivityReports',
          'endDate',
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      const remappings = [
        {
          from: 'ActivityRecipients',
          to: 'ReportRecipients',
          sequences: [
            { from: 'ActivityParticipants_id_seq', to: 'ReportRecipients_id_seq' },
          ],
          constraints: [
            { from: 'ActivityParticipants_pkey', to: 'ReportRecipients_pkey' },
            { from: 'ActivityParticipants_activityReportId_fkey', to: 'ReportRecipients_activityReportId_fkey' },
            { from: 'ActivityParticipants_grantId_fkey', to: 'ReportRecipients_grantId_fkey' },
            { from: 'ActivityRecipients_otherEntityId', to: 'ReportRecipients_otherEntityId' },
          ],
          indexes: [],
          columns: [],
        },
        {
          from: 'ActivityReportFiles',
          to: 'ReportFiles',
          sequences: [
            { from: 'ActivityReportFiles_id_seq', to: 'ReportFiles_id_seq' },
          ],
          constraints: [
            { from: 'ActivityReportFiles_pkey', to: 'ReportFiles_pkey' },
            { from: 'ActivityReportFiles_activityReportId_fkey', to: 'ReportFiles_activityReportId_fkey' },
            { from: 'ActivityReportFiles_fileId_fkey', to: 'ReportFiles_fileId_fkey' },
          ],
          indexes: [],
          columns: [],
        },
        {
          from: 'ActivityReportGoals',
          to: 'ReportGoals',
          sequences: [
            { from: 'ActivityReportGoals_id_seq', to: 'ReportGoals_id_seq' },
          ],
          constraints: [
            { from: 'ActivityReportGoals_pkey', to: 'ReportGoals_pkey' },
            { from: 'ActivityReportGoals_activityReportId_fkey', to: 'ReportGoals_activityReportId_fkey' },
            { from: 'ActivityReportGoals_goalId_fkey', to: 'ReportGoals_goalId_fkey' },
          ],
          indexes: [],
          columns: [],
        },
        {
          from: 'ActivityReportObjectives',
          to: 'ReportObjectives',
          sequences: [
            { from: 'ActivityReportObjectives_id_seq', to: 'ReportObjectives_id_seq' },
          ],
          constraints: [
            { from: 'ActivityReportObjectives_pkey', to: 'ReportObjectives_pkey' },
            { from: 'ActivityReportObjectives_activityReportId_fkey', to: 'ReportObjectives_activityReportId_fkey' },
            { from: 'ActivityReportObjectives_objectiveId_fkey', to: 'ReportObjectives_objectiveId_fkey' },
          ],
          indexes: [],
          columns: [],
        },
        {
          from: 'ActivityReportObjectiveFiles',
          to: 'ReportObjectiveFiles',
          sequences: [
            { from: 'ActivityReportObjectiveFiles_id_seq', to: 'ReportObjectiveFiles_id_seq' },
          ],
          constraints: [
            { from: 'ActivityReportObjectiveFiles_pkey', to: 'ReportObjectiveFiles_pkey' },
            { from: 'ActivityReportObjectiveFiles_activityReportObjectiveId_fkey', to: 'ReportObjectiveFiles_reportObjectiveId_fkey' },
            { from: 'ActivityReportObjectiveFiles_fileId_fkey', to: 'ReportObjectiveFiles_fileId_fkey' },
          ],
          indexes: [],
          columns: [
            { from: 'activityReportObjectiveId', to: 'reportObjectiveId' },
          ],
        },
        {
          from: 'ActivityReportObjectiveResources',
          to: 'ReportObjectiveResources',
          sequences: [
            { from: 'ActivityReportObjectiveResources_id_seq', to: 'ReportObjectiveResources_id_seq' },
          ],
          constraints: [
            { from: 'ActivityReportObjectiveResources_pkey', to: 'ReportObjectiveResources_pkey' },
            { from: 'ActivityReportObjectiveResources_activityReportObjectiveId_fkey', to: 'ReportObjectiveResources_reportObjectiveId_fkey' },
          ],
          indexes: [],
          columns: [
            { from: 'activityReportObjectiveId', to: 'reportObjectiveId' },
          ],
        },
        {
          from: 'ActivityReportObjectiveTopics',
          to: 'ReportObjectiveTopics',
          sequences: [
            { from: 'ActivityReportObjectiveTopics_id_seq', to: 'ReportObjectiveTopics_id_seq' },
          ],
          constraints: [
            { from: 'ActivityReportObjectiveTopics_pkey', to: 'ReportObjectiveTopics_pkey' },
            { from: 'ActivityReportObjectiveTopics_activityReportObjectiveId_fkey', to: 'ReportObjectiveTopics_reportObjectiveId_fkey' },
            { from: 'ActivityReportObjectiveTopics_topicId_fkey', to: 'ReportObjectiveTopics_topicId_fkey' },
          ],
          indexes: [],
          columns: [
            { from: 'activityReportObjectiveId', to: 'reportObjectiveId' },
          ],
        },
      ];

      try {
        await Promise.all(remappings.map(async (remapping) => {
          const promises = [];

          // Remove auditing to table
          promises.push(await queryInterface.sequelize.query(
            ` SELECT "ZAFRemoveAuditingOnTable"('${remapping.from}');`,
            {
              type: queryInterface.QueryTypes.RAW,
              raw: true,
              transaction,
            },
          ));

          // Rename Table
          promises.push(await queryInterface.sequelize.query(
            `ALTER TABLE IF EXISTS "${remapping.from}"
             RENAME TO "${remapping.to}"`,
            {
              type: queryInterface.QueryTypes.RAW,
              raw: true,
              transaction,
            },
          ));

          // Add eventReportId column
          promises.push(await queryInterface.addColumn(
            remapping.from,
            'eventReportId',
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: { tableName: 'EventReports' }, key: 'id' },
            },
            { transaction },
          ));

          // Populate eventReportId column
          promises.push(await queryInterface.sequelize.query(
            `UPDATE "${remapping.from}"
            SET "eventReportId" = "activityReportId";`,
            { transaction },
          ));

          // Rename Sequences
          remapping.sequences.map(async (sequence) => {
            promises.push(await queryInterface.sequelize.query(
              `ALTER SEQUENCE IF EXISTS "${sequence.from}"
               RENAME TO "${sequence.to}";`,
              {
                type: queryInterface.QueryTypes.RAW,
                raw: true,
                transaction,
              },
            ));
          });

          // Rename Constraints
          remapping.constraints.map(async (constraint) => {
            promises.push(await queryInterface.sequelize.query(
              `ALTER TABLE IF EXISTS"${remapping.to}"
               RENAME CONSTRAINT "${constraint.from}" TO "${constraint.to}";`,
              {
                type: queryInterface.QueryTypes.RAW,
                raw: true,
                transaction,
              },
            ));
          });

          // Rename Indexes
          remapping.indexes.map(async (index) => {
            promises.push(await queryInterface.sequelize.query(
              `ALTER INDEX IF EXISTS "${index.from}"
               RENAME TO "${index.to}";`,
              {
                type: queryInterface.QueryTypes.RAW,
                raw: true,
                transaction,
              },
            ));
          });

          // Remove activityReportId Column
          await queryInterface.removeColumn(
            remapping.from,
            'activityReportId',
            { transaction },
          );

          // Add auditing to table
          promises.push(await queryInterface.sequelize.query(
            ` SELECT "ZAFAddAuditingOnTable"('${remapping.to}');`,
            {
              type: queryInterface.QueryTypes.RAW,
              raw: true,
              transaction,
            },
          ));

          // Add auditing to table
          promises.push(await queryInterface.sequelize.query(
            `INSERT INTO "ZAL${remapping.to}"
            SELECT *
            FROM "ZAL${remapping.from}";`,
            {
              type: queryInterface.QueryTypes.RAW,
              raw: true,
              transaction,
            },
          ));

          const maxindex = await queryInterface.sequelize.query(
            `SELECT
              MAX(id)
            FROM "ZAL${remapping.to}";`,
            { transaction },
          );

          promises.push(await queryInterface.sequelize.query(
            `ALTER SEQUENCE "ZAL${remapping.to}_id_seq"
            RESTART WITH ${maxindex + 1};`,
          ));

          // Drop old audit log table
          await queryInterface.dropTable(
            `ZAL${remapping.from}`,
            { transaction },
          );

          return Promise.all(promises);
        }));
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.sequelize.query(
          `CREATE OR REPLACE FUNCTION "fkcfCollaboratorsEntity"()
          RETURNS trigger
          LANGUAGE plpgsql AS
        $body$
        BEGIN
          IF (NEW."entityType" = '${ENTITY_TYPES.REPORT}') THEN
            IF (NOT EXISTS(
                SELECT id
                FROM "EventReports"
                WHERE id = NEW."entityId")) THEN
              RAISE EXCEPTION 'There are no "EventReports" with id = %', NEW.entityId;
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
                FROM "ReportGoals"
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
                FROM "ReportObjectives"
                WHERE id = NEW."entityId")) THEN
              RAISE EXCEPTION 'There are no "ReportObjectives" with id = %', NEW.entityId;
            END IF;
          END IF;
          RETURN NEW;
        END
        $body$;`,
          { transaction },
        );

        const entitySets = [
          { entityType: ENTITY_TYPES.REPORT, entityTable: 'EventReports', needsRatifier: true },
          { entityType: ENTITY_TYPES.REPORTGOAL, entityTable: 'ReportGoals' },
          { entityType: ENTITY_TYPES.REPORTOBJECTIVE, entityTable: 'ReportObjectives' },
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
              AND '${COLLABORATOR_TYPES.RATIFIER}' = ANY ( "collaboratorTypes" );`,
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
            CREATE OR REPLACE FUNCTION "fkcf${entityTable}Collaborators"()
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
    },
  ),
  down: async () => {},
};
