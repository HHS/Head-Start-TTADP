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
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );
        await queryInterface.addColumn('Goals', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('Objectives', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('ObjectiveFiles', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('ObjectiveResources', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('ObjectiveTopics', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('ObjectiveFiles', 'onApprovedAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('ObjectiveResources', 'onApprovedAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.addColumn('ObjectiveTopics', 'onApprovedAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: true }, { transaction });
        await queryInterface.sequelize.query(
          `WITH
            "GoalsOnARs" AS (
              SELECT
                g.id,
                (arg.id IS NOT NULL) "onAR"
              FROM "Goals" g
              LEFT JOIN "ActivityReportGoals" arg
              ON g.id = arg."goalId"
            )
          UPDATE "Goals" g
          SET "onAR" = goa."onAR"
          FROM "GoalsOnARs" goa
          WHERE g.id = goa.id;`,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `WITH
            "ObjectivesOnARs" AS (
              SELECT
                o.id,
                (aro.id IS NOT NULL) "onAR"
              FROM "Objectives" o
              LEFT JOIN "ActivityReportObjectives" aro
              ON o.id = aro."objectiveId"
            )
          UPDATE "Objectives" o
          SET "onAR" = ooa."onAR"
          FROM "ObjectivesOnARs" ooa
          WHERE o.id = ooa.id;`,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `WITH
            "ObjectiveFilesOnARs" AS (
              SELECT
                "of"."id",
                (arof.id IS NOT NULL) "onAR",
                (arof.id IS NOT NULL
                AND ar."calculatedStatus"::text = 'approved') "onApprovedAR"
              FROM "ObjectiveFiles" "of"
              LEFT JOIN "ActivityReportObjectives" aro
              ON "of"."objectiveId" = aro."objectiveId"
              LEFT JOIN "ActivityReportObjectiveFiles" arof
              ON aro.id = arof."activityReportObjectiveId"
              AND "of"."fileId" = arof."fileId"
              LEFT JOIN "ActivityReports" ar
              ON aro."activityReportId" = ar.id
            )
          UPDATE "ObjectiveFiles" "of"
          SET
            "onAR" = ofoa."onAR",
            "onApprovedAR" = ofoa."onApprovedAR"
          FROM "ObjectiveFilesOnARs" ofoa
          WHERE "of".id = ofoa.id;`,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `WITH
            "ObjectiveResourcesOnARs" AS (
              SELECT
                "or"."id",
                (aror.id IS NOT NULL) "onAR",
                (aror.id IS NOT NULL
                AND ar."calculatedStatus"::text = 'approved') "onApprovedAR"
              FROM "ObjectiveResources" "or"
              LEFT JOIN "ActivityReportObjectives" aro
              ON "or"."objectiveId" = aro."objectiveId"
              LEFT JOIN "ActivityReportObjectiveResources" aror
              ON aro.id = aror."activityReportObjectiveId"
              AND "or"."userProvidedUrl" = aror."userProvidedUrl"
              LEFT JOIN "ActivityReports" ar
              ON aro."activityReportId" = ar.id
            )
          UPDATE "ObjectiveResources" "or"
          SET
            "onAR" = oroa."onAR",
            "onApprovedAR" = oroa."onApprovedAR"
          FROM "ObjectiveResourcesOnARs" oroa
          WHERE "or".id = oroa.id;`,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `WITH
            "ObjectiveTopicsOnARs" AS (
              SELECT
                ot."id",
                (arot.id IS NOT NULL) "onAR",
                (arot.id IS NOT NULL
                AND ar."calculatedStatus"::text = 'approved') "onApprovedAR"
              FROM "ObjectiveTopics" ot
              LEFT JOIN "ActivityReportObjectives" aro
              ON ot."objectiveId" = aro."objectiveId"
              LEFT JOIN "ActivityReportObjectiveTopics" arot
              ON aro.id = arot."activityReportObjectiveId"
              AND ot."topicId" = arot."topicId"
              LEFT JOIN "ActivityReports" ar
              ON aro."activityReportId" = ar.id
            )
          UPDATE "ObjectiveTopics" ot
          SET
            "onAR" = otoa."onAR",
            "onApprovedAR" = otoa."onApprovedAR"
          FROM "ObjectiveTopicsOnARs" otoa
          WHERE ot.id = otoa.id;`,
          { transaction },
        );
        await queryInterface.changeColumn('Goals', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('Objectives', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('ObjectiveFiles', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('ObjectiveResources', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('ObjectiveTopics', 'onAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('ObjectiveFiles', 'onApprovedAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('ObjectiveResources', 'onApprovedAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.changeColumn('ObjectiveTopics', 'onApprovedAR', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction });
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
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
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );
        await queryInterface.removeColumn('Goals', 'onAR', { transaction });
        await queryInterface.removeColumn('Objectives', 'onAR', { transaction });
        await queryInterface.removeColumn('ObjectiveFiles', 'onAR', { transaction });
        await queryInterface.removeColumn('ObjectiveResources', 'onAR', { transaction });
        await queryInterface.removeColumn('ObjectiveTopics', 'onAR', { transaction });
        await queryInterface.removeColumn('ObjectiveFiles', 'onApprovedAR', { transaction });
        await queryInterface.removeColumn('ObjectiveResources', 'onApprovedAR', { transaction });
        await queryInterface.removeColumn('ObjectiveTopics', 'onApprovedAR', { transaction });
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
};
