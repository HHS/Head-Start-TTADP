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
        { from: 'ActivityRecipients', to: 'ReportRecipients' },
        { from: 'ActivityReportFiles', to: 'ReportFiles' },
        { from: 'ActivityReportGoals', to: 'ReportGoals' },
        { from: 'ActivityReportObjectiveFiles', to: 'ReportObjectiveFiles' },
        { from: 'ActivityReportObjectives', to: 'ReportObjectives' },
      ];

      try {
        await Promise.all(remappings.map(async (remapping) => {
          const promises = [];
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

          promises.push(await queryInterface.sequelize.query(
            `UPDATE "${remapping.from}"
            SET "eventReportId" = "activityReportId";`,
            { transaction },
          ));

          await queryInterface.removeColumn(
            remapping.from,
            'activityReportId',
            { transaction },
          );

          promises.push(await queryInterface.sequelize.query(
            `ALTER TABLE '${remapping.from}'
             RENAME TO '${remapping.to}'`,
            {
              type: queryInterface.QueryTypes.RAW,
              raw: true,
              transaction,
            },
          ));
          return Promise.all(promises);
        }));
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {

        await queryInterface.sequelize.query(
          `CREATE FUNCTION "fkcfCollaboratorsEntity"()
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
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async () => {},
};
