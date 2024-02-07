/* eslint-disable max-len */
// Resources Phase 1: Create and Populate Resources table from all explicitly and implicitly included resources from across ActivityReports, NextSteps, & Objectives
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    const SOURCE_FIELD = {
      REPORT: {
        NONECLKC: 'nonECLKCResourcesUsed',
        ECLKC: 'ECLKCResourcesUsed',
        CONTEXT: 'context',
        NOTES: 'additionalNotes',
        RESOURCE: 'resource',
      },
      NEXTSTEPS: {
        NOTE: 'note',
        RESOURCE: 'resource',
      },
      GOAL: {
        NAME: 'name',
        TIMEFRAME: 'timeframe',
        RESOURCE: 'resource',
      },
      GOALTEMPLATE: {
        NAME: 'name',
        TIMEFRAME: 'timeframe',
        RESOURCE: 'resource',
      },
      REPORTGOAL: {
        NAME: 'name',
        TIMEFRAME: 'timeframe',
        RESOURCE: 'resource',
      },
      OBJECTIVE: {
        TITLE: 'title',
        RESOURCE: 'resource',
      },
      OBJECTIVETEMPLATE: {
        TITLE: 'title',
        RESOURCE: 'resource',
      },
      REPORTOBJECTIVE: {
        TITLE: 'title',
        TTAPROVIDED: 'ttaProvided',
        RESOURCE: 'resource',
      },
    };

    const loggedUser = '0';
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

    // make table to hold resource data
    await queryInterface.createTable('Resources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      url: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      domain: {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, { transaction });

    // make table to link resources to activity reports
    await queryInterface.createTable('ActivityReportResources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      activityReportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ActivityReports',
          },
          key: 'id',
        },
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORT))),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, { transaction });

    // make table to link resources to next steps
    await queryInterface.createTable('NextStepResources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nextStepId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'NextSteps',
          },
          key: 'id',
        },
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.NEXTSTEPS))),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, { transaction });

    // make table to link resources to goals
    await queryInterface.createTable('GoalResources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      goalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Goals',
          },
          key: 'id',
        },
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.GOAL))),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      onAR: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      onApprovedAR: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    }, { transaction });

    // make table to link resources to goals
    await queryInterface.createTable('GoalTemplateResources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      goalTemplateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'GoalTemplates',
          },
          key: 'id',
        },
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.GOALTEMPLATE))),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, { transaction });

    // make table to link resources to goals
    await queryInterface.createTable('ActivityReportGoalResources', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      activityReportGoalId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ActivityReportGoals',
          },
          key: 'id',
        },
      },
      resourceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      sourceFields: {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORTGOAL))),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }, { transaction });

    // add columns to objective resources to link to resources and identify its source
    await queryInterface.addColumn(
      'ObjectiveResources',
      'resourceId',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      { transaction },
    );

    await queryInterface.addColumn(
      'ObjectiveResources',
      'sourceFields',
      {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.OBJECTIVE))),
      },
      { transaction },
    );

    // add columns to objective template resources to link to resources and identify its source
    await queryInterface.addColumn(
      'ObjectiveTemplateResources',
      'resourceId',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      { transaction },
    );

    await queryInterface.addColumn(
      'ObjectiveTemplateResources',
      'sourceFields',
      {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.OBJECTIVETEMPLATE))),
      },
      { transaction },
    );

    // add columns to activity report objective resources to link to resources and identify its source
    await queryInterface.addColumn(
      'ActivityReportObjectiveResources',
      'resourceId',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Resources',
          },
          key: 'id',
        },
      },
      { transaction },
    );

    await queryInterface.addColumn(
      'ActivityReportObjectiveResources',
      'sourceFields',
      {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.REPORTOBJECTIVE))),
      },
      { transaction },
    );

    const urlRegex = '(?:(?:http(?:s)?|ftp(?:s)?|sftp):\\/\\/(?:(?:[a-zA-Z0-9._]+)(?:[:](?:[a-zA-Z0-9%._\\+~#=]+))?[@])?(?:(?:www\\.)?(?:[a-zA-Z0-9%._\\+~#=\\-]{1,}\\.[a-z]{2,6})|(?:(?:[0-9]{1,3}\\.){3}[0-9]{1,3}))(?:[:](?:[0-9]+))?(?:[\\/](?:[-a-zA-Z0-9\'\'@\\:%_\\+.,~#&\\/=()]*[-a-zA-Z0-9@\\:%_\\+.~#&\\/=()])?)?(?:[?](?:[-a-zA-Z0-9@\\:%_\\+.~#&\\/=()]*))*)';
    const domainRegex = '^(?:(?:http(?:s)?|ftp(?:s)?|sftp):\\/\\/(?:(?:[a-zA-Z0-9._]+)(?:[:](?:[a-zA-Z0-9%._\\+~#=]+))?[@])?(?:(?:www\\.)?([a-zA-Z0-9%._\\+~#=\\-]{1,}\\.[a-z]{2,6})|((?:[0-9]{1,3}\\.){3}[0-9]{1,3})))';

    // populate "Resources" and "ActivityReportResources" from current data from reports via nonECLKCResourcesUsed, ECLKCResourcesUsed, context, & additionalNotes
    // 1. Generate a list of all reports where either nonECLKCResourcesUsed or ECLKCResourcesUsed is populated.
    // 2. Collect all urls from nonECLKCResourcesUsed.
    // 3. Collect all urls from ECLKCResourcesUsed.
    // 4. Collect all urls from context.
    // 5. Collect all urls from additionalNotes.
    // 6. Collect all urls found in steps two through five.
    // 7. Extract domain from urls.
    // 8. Insert distinct domains and urls into "Resources" table.
    // 9. Insert all records into "ActivityReportResources" linking the reports to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "ARResources" AS (
        SELECT
            id "activityReportId",
            "nonECLKCResourcesUsed",
            "ECLKCResourcesUsed",
            "createdAt",
            "updatedAt"
        FROM "ActivityReports" a
        WHERE ( a."nonECLKCResourcesUsed" is not null
               AND  ARRAY_LENGTH(a."nonECLKCResourcesUsed",1) > 0
               AND nullIf(a."nonECLKCResourcesUsed"[1],'') IS NOT null)
        OR (a."ECLKCResourcesUsed" is not null
            AND  ARRAY_LENGTH(a."ECLKCResourcesUsed",1) > 0
            AND nullIf(a."ECLKCResourcesUsed"[1],'') IS NOT null)
        order by ID
      ),
      "ARNResources" AS (
        SELECT
            arr."activityReportId",
            (regexp_matches(ne.resource,'${urlRegex}','g')) urls,
            'nonECLKCResourcesUsed' "sourceField",
            arr."createdAt",
            arr."updatedAt"
        FROM "ARResources" arr
        CROSS JOIN UNNEST(arr."nonECLKCResourcesUsed") AS ne(resource)
      ),
      "AREResources" AS (
        SELECT
            arr."activityReportId",
            (regexp_matches(ne.resource,'${urlRegex}','g')) urls,
            'ECLKCResourcesUsed' "sourceField",
            arr."createdAt",
            arr."updatedAt"
        FROM "ARResources" arr
        CROSS JOIN UNNEST(arr."ECLKCResourcesUsed") AS ne(resource)
      ),
      "ARCResources" AS (
        SELECT
          a.id "activityReportId",
          (regexp_matches(a.context,'${urlRegex}','g')) urls,
          'context' "sourceField",
          a."createdAt",
          a."updatedAt"
        FROM "ActivityReports" a
      ),
      "ARAResources" AS (
        SELECT
          a.id "activityReportId",
          (regexp_matches(a."additionalNotes",'${urlRegex}','g')) urls,
          'additionalNotes' "sourceField",
          a."createdAt",
          a."updatedAt"
        FROM "ActivityReports" a
      ),
      "ClusteredARResources" AS (
        SELECT *
        FROM "ARNResources"
        UNION
        SELECT *
        FROM "AREResources"
        UNION
        SELECT *
        FROM "ARCResources"
        UNION
        SELECT *
        FROM "ARAResources"
      ),
      "AllARResources" AS (
        SELECT
          carr."activityReportId",
          carr."sourceField",
          (regexp_match(url,'${domainRegex}'))[1] "domain",
          u.url,
          carr."createdAt" "createdAt",
          carr."updatedAt" "updatedAt"
        FROM "ClusteredARResources" carr
        CROSS JOIN UNNEST(carr.urls) u(url)
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          aarr."domain",
          aarr.url,
          MIN(aarr."createdAt") "createdAt",
          MAX(aarr."updatedAt") "updatedAt"
        FROM "AllARResources" aarr
        GROUP BY
          aarr."domain",
          aarr.url
        ORDER BY
          MIN(aarr."createdAt")
        RETURNING
          id "resourceId",
          "domain",
          url
      )
      INSERT INTO "ActivityReportResources" (
        "activityReportId",
        "resourceId",
        "sourceFields",
        "createdAt",
        "updatedAt"
      )
      SELECT
        aarr."activityReportId",
        nr."resourceId",
        ARRAY_AGG(DISTINCT aarr."sourceField")::"enum_ActivityReportResources_sourceFields"[] "sourceFields",
        MIN(aarr."createdAt") "createdAt",
        MAX(aarr."updatedAt") "updatedAt"
      FROM "AllARResources" aarr
      JOIN "NewResources" nr
      ON aarr."domain" = nr."domain"
      AND aarr.url = nr.url
      GROUP BY
        aarr."activityReportId",
        nr."resourceId"
      ORDER BY
        aarr."activityReportId",
        nr."resourceId",
        MIN(aarr."createdAt"),
        MAX(aarr."updatedAt");
    `, { transaction });

    // populate "Resources" and "NextStepResources" from current data from "NextSteps" via note
    // 1. Collect all urls from note column in "NextSteps".
    // 2. Extract domain from urls.
    // 3. Generate a distinct list of collected urls.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Insert all records into "NextStepResources" linking the "NextSteps" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "NextStepsUrls" AS (
        SELECT
          ns.id "nextStepId",
          (regexp_matches(ns.note,'${urlRegex}','g')) urls,
          ns."createdAt",
          ns."updatedAt"
        FROM "NextSteps" ns
      ),
      "NextStepsUrlDomain" AS (
        SELECT
          nsu."nextStepId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          nsu."createdAt",
          nsu."updatedAt"
        FROM "NextStepsUrls" nsu
        CROSS JOIN UNNEST(nsu.urls) u(url)
      ),
      "NextStepResources" AS (
        SELECT
          nsud."domain",
          nsud.url,
          MIN(nsud."createdAt") "createdAt",
          MAX(nsud."updatedAt") "updatedAt"
        FROM "NextStepsUrlDomain" nsud
        GROUP BY
          nsud."domain",
          nsud.url
        ORDER BY
          MIN(nsud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", nsr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", nsr."updatedAt")
        FROM "NextStepResources" nsr
        JOIN "Resources" r2
        ON nsr."domain" = r2."domain"
        AND nsr.url = r2.url
        WHERE nsr."domain" = r."domain"
        AND nsr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          nsr."domain",
          nsr.url,
          nsr."createdAt",
          nsr."updatedAt"
        FROM "NextStepResources" nsr
        LEFT JOIN "Resources" r
        ON nsr."domain" = r."domain"
        AND nsr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          nsr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      INSERT INTO "NextStepResources" (
        "nextStepId",
        "resourceId",
        "sourceFields",
        "createdAt",
        "updatedAt"
      )
      SELECT
        nsud."nextStepId",
        ar."resourceId",
        ARRAY['${SOURCE_FIELD.NEXTSTEPS.NOTE}']::"enum_NextStepResources_sourceFields"[] "sourceFields",
        nsud."createdAt",
        nsud."updatedAt"
      FROM "NextStepsUrlDomain" nsud
      JOIN "AffectedResources" ar
      ON nsud."domain" = ar."domain"
      AND nsud.url = ar.url
      ORDER BY
        nsud."nextStepId",
        ar."resourceId",
        nsud."createdAt",
        nsud."updatedAt";
    `, { transaction });

    // populate "Resources" and "GoalResources" from current data from "Goals" via name and timeframe
    // 1. Collect all urls from name and timeframe columns in "Goals".
    // 2. Extract domain from urls.
    // 3. Generate a distinct resource per goal.
    // 4. Generate a distinct list of collected urls.
    // 5. Update "Resources" for all existing urls.
    // 6. Insert distinct domains and urls into "Resources" table.
    // 7. Collect all affected "Resources" records.
    // 8. Insert all records into "GoalResources" linking the "Goals" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "GoalUrls" AS (
        SELECT
          g.id "goalId",
          (regexp_matches(g.name,'${urlRegex}','g')) urls,
          '${SOURCE_FIELD.GOAL.NAME}' "sourceField",
          g."createdAt",
          g."updatedAt"
        FROM "Goals" g
        UNION
        SELECT
          g.id "goalId",
          (regexp_matches(g."timeframe",'${urlRegex}','g')) urls,
          '${SOURCE_FIELD.GOAL.TIMEFRAME}' "sourceField",
          g."createdAt",
          g."updatedAt"
        FROM "Goals" g
      ),
      "GoalUrlDomain" AS (
        SELECT
          gu."goalId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          gu."sourceField",
          gu."createdAt",
          gu."updatedAt"
        FROM "GoalUrls" gu
        CROSS JOIN UNNEST(gu.urls) u(url)
      ),
      "FoundGoalResources" AS (
        SELECT
          gud."goalId",
          gud."domain",
          gud.url,
          ARRAY_AGG(gud."sourceField") "sourceFields",
          MIN(gud."createdAt") "createdAt",
          MAX(gud."updatedAt") "updatedAt"
        FROM "GoalUrlDomain" gud
        GROUP BY
          gud."goalId",
          gud."domain",
          gud.url
        ORDER BY
          MIN(gud."createdAt")
      ),
      "FoundResources" AS (
        SELECT
          fgr."domain",
          fgr.url,
          MIN(fgr."createdAt") "createdAt",
          MAX(fgr."updatedAt") "updatedAt"
        FROM "FoundGoalResources" fgr
        GROUP BY
          fgr."domain",
          fgr.url
        ORDER BY
          MIN(fgr."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", fr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", fr."updatedAt")
        FROM "FoundResources" fr
        JOIN "Resources" r2
        ON fr."domain" = r2."domain"
        AND fr.url = r2.url
        WHERE fr."domain" = r."domain"
        AND fr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          fr."domain",
          fr.url,
          fr."createdAt",
          fr."updatedAt"
        FROM "FoundResources" fr
        LEFT JOIN "Resources" r
        ON fr."domain" = r."domain"
        AND fr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          fr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      INSERT INTO "GoalResources" (
        "goalId",
        "resourceId",
        "sourceFields",
        "createdAt",
        "updatedAt"
      )
      SELECT
        fgr."goalId",
        ar."resourceId",
        fgr."sourceFields"::"enum_GoalResources_sourceFields"[] "sourceFields",
        fgr."createdAt",
        fgr."updatedAt"
      FROM "FoundGoalResources" fgr
      JOIN "AffectedResources" ar
      ON fgr."domain" = ar."domain"
      AND fgr.url = ar.url
      ORDER BY
        fgr."goalId",
        ar."resourceId",
        fgr."createdAt",
        fgr."updatedAt";
    `, { transaction });

    // populate "Resources" and "GoalTemplateResources" from current data from "GoalTemplates" via name and timeframe
    // 1. Collect all urls from name and timeframe columns in "GoalTemplates".
    // 2. Extract domain from urls.
    // 3. Generate a distinct resource per goalTemplate.
    // 4. Generate a distinct list of collected urls.
    // 5. Update "Resources" for all existing urls.
    // 6. Insert distinct domains and urls into "Resources" table.
    // 7. Collect all affected "Resources" records.
    // 8. Insert all records into "GoalTemplateResources" linking the "GoalTemplates" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "GoalTemplateUrls" AS (
        SELECT
          g.id "goalTemplateId",
          (regexp_matches(g."templateName",'${urlRegex}','g')) urls,
          '${SOURCE_FIELD.GOAL.NAME}' "sourceField",
          g."createdAt",
          g."updatedAt"
        FROM "GoalTemplates" g
      ),
      "GoalTemplateUrlDomain" AS (
        SELECT
          gu."goalTemplateId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          gu."sourceField",
          gu."createdAt",
          gu."updatedAt"
        FROM "GoalTemplateUrls" gu
        CROSS JOIN UNNEST(gu.urls) u(url)
      ),
      "FoundGoalTemplateResources" AS (
        SELECT
          gud."goalTemplateId",
          gud."domain",
          gud.url,
          ARRAY_AGG(gud."sourceField") "sourceFields",
          MIN(gud."createdAt") "createdAt",
          MAX(gud."updatedAt") "updatedAt"
        FROM "GoalTemplateUrlDomain" gud
        GROUP BY
          gud."goalTemplateId",
          gud."domain",
          gud.url
        ORDER BY
          MIN(gud."createdAt")
      ),
      "FoundResources" AS (
        SELECT
          fgr."domain",
          fgr.url,
          MIN(fgr."createdAt") "createdAt",
          MAX(fgr."updatedAt") "updatedAt"
        FROM "FoundGoalTemplateResources" fgr
        GROUP BY
          fgr."domain",
          fgr.url
        ORDER BY
          MIN(fgr."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", fr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", fr."updatedAt")
        FROM "FoundResources" fr
        JOIN "Resources" r2
        ON fr."domain" = r2."domain"
        AND fr.url = r2.url
        WHERE fr."domain" = r."domain"
        AND fr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          fr."domain",
          fr.url,
          fr."createdAt",
          fr."updatedAt"
        FROM "FoundResources" fr
        LEFT JOIN "Resources" r
        ON fr."domain" = r."domain"
        AND fr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          fr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      INSERT INTO "GoalTemplateResources" (
        "goalTemplateId",
        "resourceId",
        "sourceFields",
        "createdAt",
        "updatedAt"
      )
      SELECT
        fgr."goalTemplateId",
        ar."resourceId",
        fgr."sourceFields"::"enum_GoalTemplateResources_sourceFields"[] "sourceFields",
        fgr."createdAt",
        fgr."updatedAt"
      FROM "FoundGoalTemplateResources" fgr
      JOIN "AffectedResources" ar
      ON fgr."domain" = ar."domain"
      AND fgr.url = ar.url
      ORDER BY
        fgr."goalTemplateId",
        ar."resourceId",
        fgr."createdAt",
        fgr."updatedAt";
    `, { transaction });

    // populate "Resources" and "ActivityReportGoalResources" from current data from "ActivityReportGoals" via name and timeframe
    // 1. Collect all urls from name and timeframe columns in "ActivityReportGoals".
    // 2. Extract domain from urls.
    // 3. Generate a distinct resource per goal.
    // 4. Generate a distinct list of collected urls.
    // 5. Update "Resources" for all existing urls.
    // 6. Insert distinct domains and urls into "Resources" table.
    // 7. Collect all affected "Resources" records.
    // 8. Insert all records into "ActivityReportGoalResources" linking the "ActivityReportGoals" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "GoalUrls" AS (
        SELECT
          g.id "activityReportGoalId",
          (regexp_matches(g.name,'${urlRegex}','g')) urls,
          '${SOURCE_FIELD.REPORTGOAL.NAME}' "sourceField",
          g."createdAt",
          g."updatedAt"
        FROM "ActivityReportGoals" g
        UNION
        SELECT
          g.id "activityReportGoalId",
          (regexp_matches(g."timeframe",'${urlRegex}','g')) urls,
          '${SOURCE_FIELD.REPORTGOAL.TIMEFRAME}' "sourceField",
          g."createdAt",
          g."updatedAt"
        FROM "ActivityReportGoals" g
      ),
      "GoalUrlDomain" AS (
        SELECT
          gu."activityReportGoalId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          gu."sourceField",
          gu."createdAt",
          gu."updatedAt"
        FROM "GoalUrls" gu
        CROSS JOIN UNNEST(gu.urls) u(url)
      ),
      "FoundGoalResources" AS (
        SELECT
          gud."activityReportGoalId",
          gud."domain",
          gud.url,
          ARRAY_AGG(gud."sourceField") "sourceFields",
          MIN(gud."createdAt") "createdAt",
          MAX(gud."updatedAt") "updatedAt"
        FROM "GoalUrlDomain" gud
        GROUP BY
          gud."activityReportGoalId",
          gud."domain",
          gud.url
        ORDER BY
          MIN(gud."createdAt")
      ),
      "FoundResources" AS (
        SELECT
          fgr."domain",
          fgr.url,
          MIN(fgr."createdAt") "createdAt",
          MAX(fgr."updatedAt") "updatedAt"
        FROM "FoundGoalResources" fgr
        GROUP BY
          fgr."domain",
          fgr.url
        ORDER BY
          MIN(fgr."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", fr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", fr."updatedAt")
        FROM "FoundResources" fr
        JOIN "Resources" r2
        ON fr."domain" = r2."domain"
        AND fr.url = r2.url
        WHERE fr."domain" = r."domain"
        AND fr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          fr."domain",
          fr.url,
          fr."createdAt",
          fr."updatedAt"
        FROM "FoundResources" fr
        LEFT JOIN "Resources" r
        ON fr."domain" = r."domain"
        AND fr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          fr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      INSERT INTO "ActivityReportGoalResources" (
        "activityReportGoalId",
        "resourceId",
        "sourceFields",
        "createdAt",
        "updatedAt"
      )
      SELECT
        fgr."activityReportGoalId",
        ar."resourceId",
        fgr."sourceFields"::"enum_ActivityReportGoalResources_sourceFields"[] "sourceFields",
        fgr."createdAt",
        fgr."updatedAt"
      FROM "FoundGoalResources" fgr
      JOIN "AffectedResources" ar
      ON fgr."domain" = ar."domain"
      AND fgr.url = ar.url
      ORDER BY
        fgr."activityReportGoalId",
        ar."resourceId",
        fgr."createdAt",
        fgr."updatedAt";
    `, { transaction });

    // populate "Resources" from current data from "ObjectiveResources" via userProvidedUrl
    // 1. Collect all urls from userProvidedUrl column in "ObjectiveResources".
    // 2. Extract domain from urls.
    // 3. Generate a distinct list of collected urls.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Update "ObjectiveResources" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "ObjectiveResourcesURLs" AS (
        SELECT
          id "objectiveResourceId",
          (regexp_matches("userProvidedUrl",'${urlRegex}','g')) urls,
          "createdAt",
          "updatedAt"
        FROM "ObjectiveResources"
      ),
      "ObjectiveResourcesUrlDomain" AS (
        SELECT
          oru."objectiveResourceId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          oru."createdAt",
          oru."updatedAt"
        FROM "ObjectiveResourcesURLs" oru
        CROSS JOIN UNNEST(oru.urls) u(url)
      ),
      "ObjectiveResourcesResources" AS (
        SELECT
          orud."domain",
          orud.url,
          MIN(orud."createdAt") "createdAt",
          MAX(orud."updatedAt") "updatedAt"
        FROM "ObjectiveResourcesUrlDomain" orud
        GROUP BY
          orud."domain",
          orud.url
        ORDER BY
          MIN(orud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", orr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", orr."updatedAt")
        FROM "ObjectiveResourcesResources" orr
        JOIN "Resources" r2
        ON orr."domain" = r2."domain"
        AND orr.url = r2.url
        WHERE orr."domain" = r."domain"
        AND orr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          orr."domain",
          orr.url,
          orr."createdAt",
          orr."updatedAt"
        FROM "ObjectiveResourcesResources" orr
        LEFT JOIN "Resources" r
        ON orr."domain" = r."domain"
        AND orr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          orr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      UPDATE "ObjectiveResources" "or"
      SET
        "resourceId" = ar."resourceId",
        "sourceFields" = ARRAY['${SOURCE_FIELD.OBJECTIVE.RESOURCE}']::"enum_ObjectiveResources_sourceFields"[]
      FROM "ObjectiveResourcesUrlDomain" orud
      JOIN "AffectedResources" ar
      ON orud."domain" = ar."domain"
      AND orud.url = ar.url
      WHERE "or".id = orud."objectiveResourceId";
    `, { transaction });

    // populate "Resources" and "ObjectiveResources" from current data from "Objectives" via title
    // 1. Collect all urls from title column in "Objectives".
    // 2. Extract domain from urls.
    // 3. Collect all current resource records in the format of the incoming records.
    // 4. Union the incoming and current resource records.
    // 5. Group the incoming and current records to correctly populate the sourceFields
    // 6. Generate a distinct list of collected urls excluding records solely from a current record.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Update "ObjectiveResources" for all exiting urls.
    // 8. Insert "ObjectiveResources" for newly found urls.
    // 9. Collect all records that have been affected.
    // 10. Return statistics form operation.
    await queryInterface.sequelize.query(`
    WITH
      "ObjectiveUrls" AS (
        SELECT
          o.id "objectiveId",
          (regexp_matches(o.title,'${urlRegex}','g')) urls,
          o."createdAt",
          o."updatedAt",
          o."onAR",
          o."onApprovedAR"
        FROM "Objectives" o
      ),
      "ObjectiveTitleUrlDomain" AS (
        SELECT
          ou."objectiveId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          ou."createdAt",
          ou."updatedAt",
          ou."onAR",
          ou."onApprovedAR",
          '${SOURCE_FIELD.OBJECTIVE.TITLE}' "sourceField"
        FROM "ObjectiveUrls" ou
        CROSS JOIN UNNEST(ou.urls) u(url)
      ),
      "ObjectiveCurrentUrlDomain" AS (
        SELECT
          o."objectiveId",
          r."domain",
          r.url,
          o."createdAt",
          o."updatedAt",
          o."onAR",
          o."onApprovedAR",
          sf."sourceField"::TEXT "sourceField"
        FROM "ObjectiveResources" o
        JOIN "Resources" r
        ON o."resourceId" = r.id
        CROSS JOIN UNNEST(o."sourceFields") sf("sourceField")
      ),
      "ObjectiveAllUrlDomain" AS (
        SELECT *
        FROM "ObjectiveTitleUrlDomain"
        UNION
        SELECT *
        FROM "ObjectiveCurrentUrlDomain"
      ),
      "ObjectiveUrlDomain" AS (
        SELECT
          oaud."objectiveId",
          oaud."domain",
          oaud.url,
          MIN(oaud."createdAt") "createdAt",
          MAX(oaud."updatedAt") "updatedAt",
          BOOL_OR(oaud."onAR") "onAR",
          BOOL_OR(oaud."onApprovedAR") "onApprovedAR",
          ARRAY_AGG(DISTINCT oaud."sourceField") "sourceFields",
          BOOL_OR(oaud."sourceField" = '${SOURCE_FIELD.OBJECTIVE.TITLE}') "isAutoDetected"
        FROM "ObjectiveAllUrlDomain" oaud
        GROUP BY
          oaud."objectiveId",
          oaud."domain",
          oaud.url
      ),
      "ObjectiveDetectedResources" AS (
        SELECT
          oud."domain",
          oud.url,
          MIN(oud."createdAt") "createdAt",
          MAX(oud."updatedAt") "updatedAt"
        FROM "ObjectiveUrlDomain" oud
        WHERE NOT('${SOURCE_FIELD.OBJECTIVE.RESOURCE}' = ANY(oud."sourceFields")
          AND array_length(oud."sourceFields", 1) = 1)
        GROUP BY
          oud."domain",
          oud.url
        ORDER BY
          MIN(oud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", odr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", odr."updatedAt")
        FROM "ObjectiveDetectedResources" odr
        WHERE odr."domain" = r."domain"
        AND odr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          odr."domain",
          odr.url,
          odr."createdAt",
          odr."updatedAt"
        FROM "ObjectiveDetectedResources" odr
        LEFT JOIN "Resources" r
        ON odr."domain" = r."domain"
        AND odr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          odr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      ),
      "UpdateObjectiveResources" AS (
        UPDATE "ObjectiveResources" r
        SET
          "resourceId" = ar."resourceId",
          "createdAt" = LEAST(r."createdAt", oud."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", oud."updatedAt"),
          "sourceFields" = COALESCE(oud."sourceFields"::"enum_ObjectiveResources_sourceFields"[], r."sourceFields"),
          "onAR" = (r."onAR" OR oud."onAR"),
          "onApprovedAR" = (r."onApprovedAR" OR oud."onApprovedAR")
        FROM "ObjectiveUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        WHERE oud."objectiveId" = r."objectiveId"
        AND oud.url = r."userProvidedUrl"
        RETURNING
          r.id "objectiveResourceId"
      ),
      "NewObjectiveResources" AS (
        INSERT INTO "ObjectiveResources" (
          "userProvidedUrl",
          "objectiveId",
          "createdAt",
          "updatedAt",
          "onAR",
          "onApprovedAR",
          "resourceId",
          "sourceFields"
        )
        SELECT
          oud.url "userProvidedUrl",
          oud."objectiveId",
          oud."createdAt",
          oud."updatedAt",
          oud."onAR",
          oud."onApprovedAR",
          ar."resourceId",
          ARRAY['${SOURCE_FIELD.OBJECTIVE.TITLE}']::"enum_ObjectiveResources_sourceFields"[] "sourceFields"
        FROM "ObjectiveUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        LEFT JOIN "ObjectiveResources" r
        ON oud."objectiveId" = r."objectiveId"
        AND oud.url = r."userProvidedUrl"
        WHERE r.id IS NULL
        ORDER BY
          oud."createdAt",
          ar."resourceId"
        RETURNING
          id "objectiveResourceId"
      ),
      "AffectedObjectiveResources" AS (
        SELECT
          "objectiveResourceId",
          'updated' "action"
        FROM "UpdateObjectiveResources"
        UNION
        SELECT
          "objectiveResourceId",
          'created' "action"
        FROM "NewObjectiveResources"
      )
      SELECT
        "action",
        count("objectiveResourceId")
      FROM "AffectedObjectiveResources"
      GROUP BY "action";
    `, { transaction });

    // populate "Resources" from current data from "ObjectiveTemplateResources" via userProvidedUrl
    // 1. Collect all urls from userProvidedUrl column in "ObjectiveTemplateResources".
    // 2. Extract domain from urls.
    // 3. Generate a distinct list of collected urls.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Update "ObjectiveTemplateResources" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "ObjectiveTemplateResourcesURLs" AS (
        SELECT
          id "objectiveTemplateResourceId",
          (regexp_matches("userProvidedUrl",'${urlRegex}','g')) urls,
          "createdAt",
          "updatedAt"
        FROM "ObjectiveTemplateResources"
      ),
      "ObjectiveTemplateResourcesUrlDomain" AS (
        SELECT
          oru."objectiveTemplateResourceId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          oru."createdAt",
          oru."updatedAt"
        FROM "ObjectiveTemplateResourcesURLs" oru
        CROSS JOIN UNNEST(oru.urls) u(url)
      ),
      "ObjectiveTemplateResourcesResources" AS (
        SELECT
          orud."domain",
          orud.url,
          MIN(orud."createdAt") "createdAt",
          MAX(orud."updatedAt") "updatedAt"
        FROM "ObjectiveTemplateResourcesUrlDomain" orud
        GROUP BY
          orud."domain",
          orud.url
        ORDER BY
          MIN(orud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", orr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", orr."updatedAt")
        FROM "ObjectiveTemplateResourcesResources" orr
        JOIN "Resources" r2
        ON orr."domain" = r2."domain"
        AND orr.url = r2.url
        WHERE orr."domain" = r."domain"
        AND orr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          orr."domain",
          orr.url,
          orr."createdAt",
          orr."updatedAt"
        FROM "ObjectiveTemplateResourcesResources" orr
        LEFT JOIN "Resources" r
        ON orr."domain" = r."domain"
        AND orr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          orr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      UPDATE "ObjectiveTemplateResources" "or"
      SET
        "resourceId" = ar."resourceId",
        "sourceFields" = ARRAY['${SOURCE_FIELD.OBJECTIVE.RESOURCE}']::"enum_ObjectiveTemplateResources_sourceFields"[]
      FROM "ObjectiveTemplateResourcesUrlDomain" orud
      JOIN "AffectedResources" ar
      ON orud."domain" = ar."domain"
      AND orud.url = ar.url
      WHERE "or".id = orud."objectiveTemplateResourceId";
    `, { transaction });

    // populate "Resources" and "ObjectiveTemplateResources" from current data from "ObjectiveTemplates" via title
    // 1. Collect all urls from title column in "ObjectiveTemplates".
    // 2. Extract domain from urls.
    // 3. Collect all current resource records in the format of the incoming records.
    // 4. Union the incoming and current resource records.
    // 5. Group the incoming and current records to correctly populate the sourceFields
    // 6. Generate a distinct list of collected urls excluding records solely from a current record.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Update "ObjectiveTemplateResources" for all exiting urls.
    // 8. Insert "ObjectiveTemplateResources" for newly found urls.
    // 9. Collect all records that have been affected.
    // 10. Return statistics form operation.
    await queryInterface.sequelize.query(`
    WITH
      "ObjectiveTemplateUrls" AS (
        SELECT
          o.id "objectiveTemplateId",
          (regexp_matches(o."templateTitle",'${urlRegex}','g')) urls,
          o."createdAt",
          o."updatedAt"
        FROM "ObjectiveTemplates" o
      ),
      "ObjectiveTemplateTitleUrlDomain" AS (
        SELECT
          ou."objectiveTemplateId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          ou."createdAt",
          ou."updatedAt",
          '${SOURCE_FIELD.OBJECTIVE.TITLE}' "sourceField"
        FROM "ObjectiveTemplateUrls" ou
        CROSS JOIN UNNEST(ou.urls) u(url)
      ),
      "ObjectiveTemplateCurrentUrlDomain" AS (
        SELECT
          o."objectiveTemplateId",
          r."domain",
          r.url,
          o."createdAt",
          o."updatedAt",
          sf."sourceField"::TEXT "sourceField"
        FROM "ObjectiveTemplateResources" o
        JOIN "Resources" r
        ON o."resourceId" = r.id
        CROSS JOIN UNNEST(o."sourceFields") sf("sourceField")
      ),
      "ObjectiveTemplateAllUrlDomain" AS (
        SELECT *
        FROM "ObjectiveTemplateTitleUrlDomain"
        UNION
        SELECT *
        FROM "ObjectiveTemplateCurrentUrlDomain"
      ),
      "ObjectiveTemplateUrlDomain" AS (
        SELECT
          oaud."objectiveTemplateId",
          oaud."domain",
          oaud.url,
          MIN(oaud."createdAt") "createdAt",
          MAX(oaud."updatedAt") "updatedAt",
          ARRAY_AGG(DISTINCT oaud."sourceField") "sourceFields",
          BOOL_OR(oaud."sourceField" = '${SOURCE_FIELD.OBJECTIVETEMPLATE.TITLE}') "isAutoDetected"
        FROM "ObjectiveTemplateAllUrlDomain" oaud
        GROUP BY
          oaud."objectiveTemplateId",
          oaud."domain",
          oaud.url
      ),
      "ObjectiveTemplateDetectedResources" AS (
        SELECT
          oud."domain",
          oud.url,
          MIN(oud."createdAt") "createdAt",
          MAX(oud."updatedAt") "updatedAt"
        FROM "ObjectiveTemplateUrlDomain" oud
        WHERE NOT('${SOURCE_FIELD.OBJECTIVETEMPLATE.RESOURCE}' = ANY(oud."sourceFields")
          AND array_length(oud."sourceFields", 1) = 1)
        GROUP BY
          oud."domain",
          oud.url
        ORDER BY
          MIN(oud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", odr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", odr."updatedAt")
        FROM "ObjectiveTemplateDetectedResources" odr
        WHERE odr."domain" = r."domain"
        AND odr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          odr."domain",
          odr.url,
          odr."createdAt",
          odr."updatedAt"
        FROM "ObjectiveTemplateDetectedResources" odr
        LEFT JOIN "Resources" r
        ON odr."domain" = r."domain"
        AND odr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          odr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      ),
      "UpdateObjectiveTemplateResources" AS (
        UPDATE "ObjectiveTemplateResources" r
        SET
          "resourceId" = ar."resourceId",
          "createdAt" = LEAST(r."createdAt", oud."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", oud."updatedAt"),
          "sourceFields" = COALESCE(oud."sourceFields"::"enum_ObjectiveTemplateResources_sourceFields"[], r."sourceFields")
        FROM "ObjectiveTemplateUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        WHERE oud."objectiveTemplateId" = r."objectiveTemplateId"
        AND oud.url = r."userProvidedUrl"
        RETURNING
          r.id "objectiveTemplateResourceId"
      ),
      "NewObjectiveTemplateResources" AS (
        INSERT INTO "ObjectiveTemplateResources" (
          "userProvidedUrl",
          "objectiveTemplateId",
          "createdAt",
          "updatedAt",
          "resourceId",
          "sourceFields"
        )
        SELECT
          oud.url "userProvidedUrl",
          oud."objectiveTemplateId",
          oud."createdAt",
          oud."updatedAt",
          ar."resourceId",
          ARRAY['${SOURCE_FIELD.OBJECTIVETEMPLATE.TITLE}']::"enum_ObjectiveTemplateResources_sourceFields"[] "sourceFields"
        FROM "ObjectiveTemplateUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        LEFT JOIN "ObjectiveTemplateResources" r
        ON oud."objectiveTemplateId" = r."objectiveTemplateId"
        AND oud.url = r."userProvidedUrl"
        WHERE r.id IS NULL
        ORDER BY
          oud."createdAt",
          ar."resourceId"
        RETURNING
          id "objectiveTemplateResourceId"
      ),
      "AffectedObjectiveTemplateResources" AS (
        SELECT
          "objectiveTemplateResourceId",
          'updated' "action"
        FROM "UpdateObjectiveTemplateResources"
        UNION
        SELECT
          "objectiveTemplateResourceId",
          'created' "action"
        FROM "NewObjectiveTemplateResources"
      )
      SELECT
        "action",
        count("objectiveTemplateResourceId")
      FROM "AffectedObjectiveTemplateResources"
      GROUP BY "action";
    `, { transaction });

    // populate "Resources" from current data from "ActivityReportObjectiveResources" via userProvidedUrl
    // 1. Collect all urls from userProvidedUrl column in "ActivityReportObjectiveResources".
    // 2. Extract domain from urls.
    // 3. Generate a distinct list of collected urls.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Update "ObjectiveResources" records to their corresponding records in "Resources".
    await queryInterface.sequelize.query(`
    WITH
      "ObjectiveResourcesURLs" AS (
        SELECT
          id "objectiveResourceId",
          (regexp_matches("userProvidedUrl",'${urlRegex}','g')) urls,
          "createdAt",
          "updatedAt"
        FROM "ActivityReportObjectiveResources"
      ),
      "ObjectiveResourcesUrlDomain" AS (
        SELECT
          oru."objectiveResourceId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          oru."createdAt",
          oru."updatedAt"
        FROM "ObjectiveResourcesURLs" oru
        CROSS JOIN UNNEST(oru.urls) u(url)
      ),
      "ObjectiveResourcesResources" AS (
        SELECT
          orud."domain",
          orud.url,
          MIN(orud."createdAt") "createdAt",
          MAX(orud."updatedAt") "updatedAt"
        FROM "ObjectiveResourcesUrlDomain" orud
        GROUP BY
          orud."domain",
          orud.url
        ORDER BY
          MIN(orud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", orr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", orr."updatedAt")
        FROM "ObjectiveResourcesResources" orr
        JOIN "Resources" r2
        ON orr."domain" = r2."domain"
        AND orr.url = r2.url
        WHERE orr."domain" = r."domain"
        AND orr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          orr."domain",
          orr.url,
          orr."createdAt",
          orr."updatedAt"
        FROM "ObjectiveResourcesResources" orr
        LEFT JOIN "Resources" r
        ON orr."domain" = r."domain"
        AND orr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          orr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      )
      UPDATE "ActivityReportObjectiveResources" "or"
      SET
        "resourceId" = ar."resourceId",
        "sourceFields" = ARRAY['${SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE}']::"enum_ActivityReportObjectiveResources_sourceFields"[]
      FROM "ObjectiveResourcesUrlDomain" orud
      JOIN "AffectedResources" ar
      ON orud."domain" = ar."domain"
      AND orud.url = ar.url
      WHERE "or".id = orud."objectiveResourceId";
    `, { transaction });

    // populate "Resources" and "ActivityReportObjectiveResources" from current data from "ActivityReportObjectives" via title and ttaProvided
    // 1. Collect all urls from title column in "ActivityReportObjective".
    // 2. Collect all urls from ttaProvided column in "ActivityReportObjective".
    // 3. Union the collected resources and current resources.
    // 2. Extract domain from urls.
    // 3. Collect all current resource records in the format of the incoming records.
    // 4. Union the incoming and current resource records.
    // 5. Group the incoming and current records to correctly populate the sourceFields
    // 6. Generate a distinct list of collected urls excluding records solely from a current record.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Update "ObjectiveResources" for all exiting urls.
    // 8. Insert "ObjectiveResources" for newly found urls.
    // 9. Collect all records that have been affected.
    // 10. Return statistics form operation.
    await queryInterface.sequelize.query(`
    WITH
      "ObjectiveTitleUrls" AS (
        SELECT
          o.id "activityReportObjectiveId",
          (regexp_matches(o.title,'${urlRegex}','g')) urls,
          o."createdAt",
          o."updatedAt",
          '${SOURCE_FIELD.REPORTOBJECTIVE.TITLE}'::"enum_ActivityReportObjectiveResources_sourceFields" "sourceField"
        FROM "ActivityReportObjectives" o
      ),
      "ObjectiveTtaProvidedUrls" AS (
        SELECT
          o.id "activityReportObjectiveId",
          (regexp_matches(o."ttaProvided",'${urlRegex}','g')) urls,
          o."createdAt",
          o."updatedAt",
          '${SOURCE_FIELD.REPORTOBJECTIVE.TTAPROVIDED}'::"enum_ActivityReportObjectiveResources_sourceFields" "sourceField"
        FROM "ActivityReportObjectives" o
      ),
      "ObjectiveUrls" AS (
        SELECT *
        FROM "ObjectiveTitleUrls"
        UNION
        SELECT *
        FROM "ObjectiveTtaProvidedUrls"
      ),
      "ObjectiveIncomingUrlDomain" AS (
        SELECT
          ou."activityReportObjectiveId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          ou."createdAt",
          ou."updatedAt",
          ou."sourceField"
        FROM "ObjectiveUrls" ou
        CROSS JOIN UNNEST(ou.urls) u(url)
      ),
      "ObjectiveCurrentUrlDomain" AS (
        SELECT
          o."activityReportObjectiveId",
          r."domain",
          r.url,
          o."createdAt",
          o."updatedAt",
          sf."sourceField" "sourceField"
        FROM "ActivityReportObjectiveResources" o
        JOIN "Resources" r
        ON o."resourceId" = r.id
        CROSS JOIN UNNEST(o."sourceFields") sf("sourceField")
      ),
      "ObjectiveAllUrlDomain" AS (
        SELECT *
        FROM "ObjectiveIncomingUrlDomain"
        UNION
        SELECT *
        FROM "ObjectiveCurrentUrlDomain"
      ),
      "ObjectiveUrlDomain" AS (
        SELECT
          oaud."activityReportObjectiveId",
          oaud."domain",
          oaud.url,
          MIN(oaud."createdAt") "createdAt",
          MAX(oaud."updatedAt") "updatedAt",
          ARRAY_AGG(DISTINCT oaud."sourceField") "sourceFields"
        FROM "ObjectiveAllUrlDomain" oaud
        GROUP BY
          oaud."activityReportObjectiveId",
          oaud."domain",
          oaud.url
      ),
      "ObjectiveDetectedResources" AS (
        SELECT
          oud."domain",
          oud.url,
          MIN(oud."createdAt") "createdAt",
          MAX(oud."updatedAt") "updatedAt"
        FROM "ObjectiveUrlDomain" oud
        WHERE NOT('${SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE}'::"enum_ActivityReportObjectiveResources_sourceFields" = ANY(oud."sourceFields")
          AND array_length(oud."sourceFields", 1) = 1)
        GROUP BY
          oud."domain",
          oud.url
        ORDER BY
          MIN(oud."createdAt")
      ),
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", odr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", odr."updatedAt")
        FROM "ObjectiveDetectedResources" odr
        WHERE odr."domain" = r."domain"
        AND odr.url = r.url
        RETURNING
          r.id "resourceId",
          r."domain",
          r.url
      ),
      "NewResources" AS (
        INSERT INTO "Resources" (
          "domain",
          "url",
          "createdAt",
          "updatedAt"
        )
        SELECT
          odr."domain",
          odr.url,
          odr."createdAt",
          odr."updatedAt"
        FROM "ObjectiveDetectedResources" odr
        LEFT JOIN "Resources" r
        ON odr."domain" = r."domain"
        AND odr.url = r.url
        WHERE r.id IS NULL
        ORDER BY
          odr."createdAt"
        RETURNING
          id "resourceId",
          "domain",
          url
      ),
      "AffectedResources" AS (
        SELECT *
        FROM "UpdateResources"
        UNION
        SELECT *
        FROM "NewResources"
      ),
      "UpdateObjectiveResources" AS (
        UPDATE "ActivityReportObjectiveResources" r
        SET
          "resourceId" = ar."resourceId",
          "createdAt" = LEAST(r."createdAt", oud."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", oud."updatedAt"),
          "sourceFields" = COALESCE(oud."sourceFields"::"enum_ActivityReportObjectiveResources_sourceFields"[], r."sourceFields")
        FROM "ObjectiveUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        WHERE oud."activityReportObjectiveId" = r."activityReportObjectiveId"
        AND oud.url = r."userProvidedUrl"
        AND oud."sourceFields" != r."sourceFields"
        RETURNING
          r.id "activityReportObjectiveResourceId"
      ),
      "NewObjectiveResources" AS (
        INSERT INTO "ActivityReportObjectiveResources" (
          "userProvidedUrl",
          "activityReportObjectiveId",
          "createdAt",
          "updatedAt",
          "resourceId",
          "sourceFields"
        )
        SELECT
          oud.url "userProvidedUrl",
          oud."activityReportObjectiveId",
          oud."createdAt",
          oud."updatedAt",
          ar."resourceId",
          oud."sourceFields"::"enum_ActivityReportObjectiveResources_sourceFields"[] "sourceFields"
        FROM "ObjectiveUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        LEFT JOIN "ActivityReportObjectiveResources" r
        ON oud."activityReportObjectiveId" = r."activityReportObjectiveId"
        AND oud.url = r."userProvidedUrl"
        WHERE r.id IS NULL
        ORDER BY
          oud."createdAt",
          ar."resourceId"
        RETURNING
          id "activityReportObjectiveResourceId"
      ),
      "AffectedObjectiveResources" AS (
        SELECT
          "activityReportObjectiveResourceId",
          'updated' "action"
        FROM "UpdateObjectiveResources"
        UNION
        SELECT
          "activityReportObjectiveResourceId",
          'created' "action"
        FROM "NewObjectiveResources"
      )
      SELECT
        "action",
        count("activityReportObjectiveResourceId")
      FROM "AffectedObjectiveResources"
      GROUP BY "action";
    `, { transaction });

    // Remove unneeded columns
    await queryInterface.removeColumn('ActivityReportObjectiveResources', 'userProvidedUrl', { transaction });
    await queryInterface.removeColumn('ObjectiveTemplateResources', 'userProvidedUrl', { transaction });
    await queryInterface.removeColumn('ObjectiveResources', 'userProvidedUrl', { transaction });

    // Set columns to not allow null
    await queryInterface.changeColumn(
      'ActivityReportObjectiveResources',
      'resourceId',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      { transaction },
    );
    await queryInterface.changeColumn(
      'ObjectiveTemplateResources',
      'resourceId',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      { transaction },
    );
    await queryInterface.changeColumn(
      'ObjectiveResources',
      'resourceId',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      { transaction },
    );
  }),
  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.addColumn(
      'ObjectiveResources',
      'userProvidedUrl',
      {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      { transaction },
    );

    await queryInterface.sequelize.query(`
    UPDATE "ObjectiveResources" "or"
    SET
      "userProvidedUrl" = r."url"
    FROM "Resources" r
    WHERE "or"."resourceId" = r.id;
    `, { transaction });

    await queryInterface.addColumn(
      'ActivityReportObjectiveResources',
      'userProvidedUrl',
      {
        allowNull: false,
        type: Sequelize.TEXT,
      },
      { transaction },
    );

    await queryInterface.sequelize.query(`
    UPDATE "ActivityReportObjectiveResources" "or"
    SET
      "userProvidedUrl" = r."url"
    FROM "Resources" r
    WHERE "or"."resourceId" = r.id;
    `, { transaction });

    await queryInterface.removeColumn('ActivityReportObjectiveResources', 'sourceFields', { transaction });
    await queryInterface.removeColumn('ActivityReportObjectiveResources', 'isAutoDetected', { transaction });
    await queryInterface.removeColumn('ActivityReportObjectiveResources', 'resourceId', { transaction });
    await queryInterface.removeColumn('ObjectiveResources', 'sourceFields', { transaction });
    await queryInterface.removeColumn('ObjectiveResources', 'isAutoDetected', { transaction });
    await queryInterface.removeColumn('ObjectiveResources', 'resourceId', { transaction });
    await queryInterface.dropTable('NextStepResources', { transaction });
    await queryInterface.dropTable('ActivityReportResources', { transaction });
    await queryInterface.dropTable('Resources', { transaction });
  }),
};
