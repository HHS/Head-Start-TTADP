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
      OBJECTIVE: {
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
      isAutoDetected: {
        type: Sequelize.DataTypes.BOOLEAN,
        default: false,
        allowNull: false,
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
      isAutoDetected: {
        type: Sequelize.BOOLEAN,
        default: false,
        allowNull: false,
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
      'isAutoDetected',
      {
        type: Sequelize.BOOLEAN,
        default: false,
        allowNull: false,
      },
      { transaction },
    );

    await queryInterface.addColumn(
      'ActivityReportObjectiveResources',
      'sourceFields',
      {
        allowNull: true,
        default: null,
        type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(SOURCE_FIELD.OBJECTIVE))),
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
      'isAutoDetected',
      {
        type: Sequelize.BOOLEAN,
        default: false,
        allowNull: false,
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
    const urlRegex = '(?:(?:http(?:s)?|ftp(?:s)?|sftp):\\/\\/(?:(?:[a-zA-Z0-9._]+)(?:[:](?:[a-zA-Z0-9%._\\+~#=]+))?[@])?(?:(?:www\\.)?(?:[a-zA-Z0-9%._\\+~#=]{1,}\\.[a-z]{2,6})|(?:(?:[0-9]{1,3}\\.){3}[0-9]{1,3}))(?:[:](?:[0-9]+))?(?:[\\/](?:[-a-zA-Z0-9@:%_\\+.~#&\\/=()]*))?(?:[?](?:[-a-zA-Z0-9@:%_\\+.~#&\\/=()]*))?)';
    const domainRegex = '^(?:(?:http|ftp|https|file):\\/\\/)?(?:www\\.)?((?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:])))';

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
            'nonECLKCResourcesUsed' "SourceField",
            arr."createdAt",
            arr."updatedAt"
        FROM "ARResources" arr
        CROSS JOIN UNNEST(arr."nonECLKCResourcesUsed") AS ne(resource)
      ),
      "AREResources" AS (
        SELECT
            arr."activityReportId",
            (regexp_matches(ne.resource,'${urlRegex}','g')) urls,
            'ECLKCResourcesUsed' "SourceField",
            arr."createdAt",
            arr."updatedAt"
        FROM "ARResources" arr
        CROSS JOIN UNNEST(arr."ECLKCResourcesUsed") AS ne(resource)
      ),
      "ARCResources" AS (
        SELECT
          a.id "activityReportId",
          (regexp_matches(a.context,'${urlRegex}','g')) urls,
          'context' "SourceField",
          a."createdAt",
          a."updatedAt"
        FROM "ActivityReports" a
      ),
      "ARAResources" AS (
        SELECT
          a.id "activityReportId",
          (regexp_matches(a."additionalNotes",'${urlRegex}','g')) urls,
          'additionalNotes' "SourceField",
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
          carr."SourceField",
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
        "isAutoDetected",
        "createdAt",
        "updatedAt"
      )
      SELECT
        aarr."activityReportId",
        nr."resourceId",
        ARRAY_AGG(DISTINCT aarr."sourceField") "sourceFields",
        BOOL_OR(aarr."sourceField" IN ('${SOURCE_FIELD.REPORT.CONTEXT}', '${SOURCE_FIELD.REPORT.NOTES}')) "isAutoDetected",
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
        aarr."createdAt",
        aarr."updatedAt";
    `, { transaction });

    // populate "Resources" and "NextStepsResources" from current data from "NextSteps" via note
    // 1. Collect all urls from note column in "NextSteps".
    // 2. Extract domain from urls.
    // 3. Generate a distinct list of collected urls.
    // 4. Update "Resources" for all existing urls.
    // 5. Insert distinct domains and urls into "Resources" table.
    // 6. Collect all affected "Resources" records.
    // 7. Insert all records into "NextStepsResources" linking the "NextSteps" records to their corresponding records in "Resources".
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
          id "resourceId",
          "domain",
          url
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
      INSERT INTO "NextStepsResources" (
        "nextStepId",
        "resourceId",
        "sourceFields",
        "isAutoDetected",
        "createdAt",
        "updatedAt"
      )
      SELECT
        nsud."nextStepId",
        ar."resourceId",
        ARRAY('${SOURCE_FIELD.NEXTSTEPS.NOTE}') "sourceFields",
        true,
        nsud."createdAt",
        nsud."updatedAt"
      FROM "NextStepsUrlDomain" nsud
      JOIN "AffectedResources" ar
      ON nsud."domain" = r."domain"
      AND nsud.url = r.url
      ORDER BY
        nsud."nextStepId",
        ar."resourceId",
        nsud."createdAt",
        nsud."updatedAt";
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
          "updatedAt",
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
          id "resourceId",
          "domain",
          url
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
        "sourceFields" = ARRAY('${SOURCE_FIELD.OBJECTIVE.RESOURCE}'),
        "isAutoDetected" = false
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
          sf."sourceField"
        FROM "ObjectivesResources" o
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
          ARRAY_AGG(DISTINCT oaud."sourceField") "sourceFields"
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
        WHERE NOT('${SOURCE_FIELD.OBJECTIVE.RESOURCE}' = ANY("sourceFields")
          AND array_length("sourceFields", 1) = 1)
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
          id "resourceId",
          "domain",
          url
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
          "isAutoDetected" = (r."isAutoDetected" AND oud."isAutoDetected"),
          "createdAt" = LEAST(r."createdAt", oud."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", oud."updatedAt"),
          "sourceFields" = COALESCE(oud."sourceFields", r."sourceFields"),
          "onAR" = (r."onAR" OR oud."onAR"),
          "onApprovedAR" = (r."onApprovedAR" OR oud."onApprovedAR")
        FROM "ObjectiveUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        WHERE oud."objectiveId" = r."objectiveId"
        AND oud.url = r."userProvidedUrl"
        RETURNING
          id "objectiveResourceId"
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
          "isAutoDetected",
          "sourceField"
        )
        SELECT
          oud.usr "userProvidedUrl",
          oud."objectiveId",
          oud."createdAt",
          oud."updatedAt",
          oud."onAR",
          oud."onApprovedAR",
          ar."resourceId",
          true "isAutoDetected",
          ARRAY('${SOURCE_FIELD.OBJECTIVE.TITLE}') "sourceFields"
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
          "updatedAt",
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
          id "resourceId",
          "domain",
          url
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
        "sourceFields" = ARRAY['${SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE}'],
        "isAutoDetected" = false
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
          o.id "objectiveId",
          (regexp_matches(o.title,'${urlRegex}','g')) urls,
          o."createdAt",
          o."updatedAt",
          o."onAR",
          o."onApprovedAR",
          '${SOURCE_FIELD.REPORTOBJECTIVE.TITLE}' "sourceField"
        FROM "ActivityReportObjectives" o
      ),
      "ObjectiveTtaProvidedUrls" AS (
        SELECT
          o.id "objectiveId",
          (regexp_matches(o."ttaProvided",'${urlRegex}','g')) urls,
          o."createdAt",
          o."updatedAt",
          o."onAR",
          o."onApprovedAR",
          '${SOURCE_FIELD.REPORTOBJECTIVE.TTAPROVIDED}' "sourceField"
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
          ou."objectiveId",
          (regexp_match(u.url, '${domainRegex}'))[1] "domain",
          u.url,
          ou."createdAt",
          ou."updatedAt",
          ou."onAR",
          ou."onApprovedAR",
          ou."sourceField"
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
          sf."sourceField"
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
          oaud."objectiveId",
          oaud."domain",
          oaud.url,
          MIN(oaud."createdAt") "createdAt",
          MAX(oaud."updatedAt") "updatedAt",
          BOOL_OR(oaud."onAR") "onAR",
          BOOL_OR(oaud."onApprovedAR") "onApprovedAR",
          ARRAY_AGG(DISTINCT oaud."sourceField") "sourceFields"
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
        WHERE NOT('${SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE}' = ANY("sourceFields")
          AND array_length("sourceFields", 1) = 1)
        GROUP BY
          oud."domain",
          oud.url
        ORDER BY
          MIN(oud."createdAt")
      ),
      ,
      "UpdateResources" AS (
        UPDATE "Resources" r
        SET
          "createdAt" = LEAST(r."createdAt", odr."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", odr."updatedAt")
        FROM "ObjectiveDetectedResources" odr
        WHERE odr."domain" = r."domain"
        AND odr.url = r.url
        RETURNING
          id "resourceId",
          "domain",
          url
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
          "isAutoDetected" = (r.isAutoDetected AND "isAutoDetected"),
          "createdAt" = LEAST(r."createdAt", oud."createdAt"),
          "updatedAt" = GREATEST(r."updatedAt", oud."updatedAt")
          "sourceFields" = oud."sourceFields"
        FROM "ObjectiveUrlDomain" oud
        JOIN "AffectedResources" ar
        ON oud."domain" = ar."domain"
        AND oud.url = ar.url
        WHERE oud."objectiveId" = r."activityReportObjectiveId"
        AND oud.url = r."userProvidedUrl"
        AND oud."sourceFields" != r."sourceFields"
        RETURNING
          id "objectiveResourceId"
      ),
      "NewObjectiveResources" AS (
        INSERT INTO "ActivityReportObjectiveResources" (
          "userProvidedUrl",
          "activityReportObjectiveId",
          "createdAt",
          "updatedAt",
          "onAR",
          "onApprovedAR",
          "resourceId",
          "isAutoDetected",
          "sourceField"
        )
        SELECT
          oud.url "userProvidedUrl",
          oud."objectiveId" "activityReportObjectiveId",
          oud."createdAt",
          oud."updatedAt",
          oud."onAR",
          oud."onApprovedAR",
          ar."resourceId",
          true "isAutoDetected",
          oud."objectiveId" "sourceFields"
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
  }),
  down: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {

  }),
};
