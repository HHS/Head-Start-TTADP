module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
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
        // 1. collect duplicate objectives based on matching title and goalId
        // 2. Merge two records into the original records
        // 3. Intermediate dataset
        // 4. Merge two records into the original records using the status of the newer
        // 5. Merge two records into the original records using the status of the older
        // 7. for each of the three datasets merge objectives into the older records as described
        // 8. create a unified list of affected objectives
        // 9. migrate/delete metadata table values from newer objectives into the older objectives
        // 10. migrate/merge/delete ARO records to use the older objectives
        // 11. delete the newer objectives
        // 12. results
        await queryInterface.sequelize.query(
          `WITH
          -- collect duplicate objectives based on matching title and goalId
          "DuplicateObjectives" AS (
            SELECT
              a.id "sourceId",
              a.status "sourceStatus",
              b.*
            FROM "Objectives" a
            JOIN "Objectives" b
            ON ( COALESCE(a."goalId",0) = COALESCE(b."goalId",0)
              AND COALESCE(a."otherEntityId",0) = COALESCE(b."otherEntityId",0))
            AND md5(trim(a.title)) = md5(trim(b.title))
            AND a.id < b.id
          ),
          -- Merge two records into the original records
          "FullDuplicateObjectives" AS (
            SELECT
            *
            FROM "DuplicateObjectives" d
            WHERE d."sourceStatus" = d.status
          ),
          -- Intermediate dataset
          "PartialDuplicateObjectives" AS (
            SELECT
            *
            FROM "DuplicateObjectives" d
            WHERE d."sourceStatus" != d.status
          ),
          -- Merge two records into the original records using the status of the newer
          "AdvanceableDuplicateObjectives" AS (
            SELECT *
            from "PartialDuplicateObjectives"
            WHERE
              CASE
                WHEN "sourceStatus" = 'Not Started' THEN 1
                WHEN "sourceStatus" = 'In Progress' THEN 2
                WHEN "sourceStatus" = 'Complete' THEN 4
              END
              <
              CASE
                WHEN "status" = 'Not Started' THEN 1
                WHEN "status" = 'In Progress' THEN 2
                WHEN "status" = 'Complete' THEN 4
              END
          ),
          -- Merge two records into the original records using the status of the older
          "FalseRestartDuplicateObjectives" AS (
            SELECT *
            from "PartialDuplicateObjectives"
            WHERE
              CASE
                WHEN "sourceStatus" = 'Not Started' THEN 1
                WHEN "sourceStatus" = 'In Progress' THEN 2
                WHEN "sourceStatus" = 'Complete' THEN 4
              END
              >
              CASE
                WHEN "status" = 'Not Started' THEN 1
                WHEN "status" = 'In Progress' THEN 2
                WHEN "status" = 'Complete' THEN 4
              END
            AND "sourceStatus" != 'Complete'
          ),
          --- for each of the three datasets merge objectives into the older records as described
          "FullDuplicateObjectivesUpdated" AS (
            UPDATE "Objectives" o
            SET
              title = TRIM(fdo.title),
              "createdAt" = LEAST(o."createdAt", fdo."createdAt"),
              "updatedAt" = GREATEST(o."updatedAt", fdo."updatedAt"),
              "objectiveTemplateId" = LEAST(o."objectiveTemplateId", fdo."objectiveTemplateId"),
              "onApprovedAR" = (o."onApprovedAR" OR fdo."onApprovedAR"),
              "firstNotStartedAt" = LEAST(o."firstNotStartedAt", fdo."firstNotStartedAt"),
              "lastNotStartedAt" = GREATEST(o."lastNotStartedAt", fdo."lastNotStartedAt"),
              "firstInProgressAt" = LEAST(o."firstInProgressAt", fdo."firstInProgressAt"),
              "lastInProgressAt" = GREATEST(o."lastInProgressAt", fdo."lastInProgressAt"),
              "firstCompleteAt" = LEAST(o."firstCompleteAt", fdo."firstCompleteAt"),
              "lastCompleteAt" = GREATEST(o."lastCompleteAt", fdo."lastCompleteAt"),
              "firstSuspendedAt" = LEAST(o."firstSuspendedAt", fdo."firstSuspendedAt"),
              "lastSuspendedAt" = GREATEST(o."lastSuspendedAt", fdo."lastSuspendedAt")
            FROM "FullDuplicateObjectives" fdo
            WHERE o.id = fdo."sourceId"
            RETURNING
              o.id "objectiveId"
          ),
          "AdvanceableDuplicateObjectivesUpdated" AS (
            UPDATE "Objectives" o
            SET
              title = TRIM(ado.title),
              status = ado.status,
              "createdAt" = LEAST(o."createdAt", ado."createdAt"),
              "updatedAt" = GREATEST(o."updatedAt", ado."updatedAt"),
              "objectiveTemplateId" = LEAST(o."objectiveTemplateId", ado."objectiveTemplateId"),
              "onApprovedAR" = (o."onApprovedAR" OR ado."onApprovedAR"),
              "firstNotStartedAt" = LEAST(o."firstNotStartedAt", ado."firstNotStartedAt"),
              "lastNotStartedAt" = GREATEST(o."lastNotStartedAt", ado."lastNotStartedAt"),
              "firstInProgressAt" = LEAST(o."firstInProgressAt", ado."firstInProgressAt"),
              "lastInProgressAt" = GREATEST(o."lastInProgressAt", ado."lastInProgressAt"),
              "firstCompleteAt" = LEAST(o."firstCompleteAt", ado."firstCompleteAt"),
              "lastCompleteAt" = GREATEST(o."lastCompleteAt", ado."lastCompleteAt"),
              "firstSuspendedAt" = LEAST(o."firstSuspendedAt", ado."firstSuspendedAt"),
              "lastSuspendedAt" = GREATEST(o."lastSuspendedAt", ado."lastSuspendedAt")
            FROM "AdvanceableDuplicateObjectives" ado
            WHERE o.id = ado."sourceId"
            RETURNING
              o.id "objectiveId"
          ),
          "FalseRestartDuplicateObjectivesUpdated" AS (
            UPDATE "Objectives" o
            SET
              title = TRIM(frdo.title),
              "createdAt" = LEAST(o."createdAt", frdo."createdAt"),
              "updatedAt" = GREATEST(o."updatedAt", frdo."updatedAt"),
              "objectiveTemplateId" = LEAST(o."objectiveTemplateId", frdo."objectiveTemplateId"),
              "onApprovedAR" = (o."onApprovedAR" OR frdo."onApprovedAR"),
              "firstNotStartedAt" = LEAST(o."firstNotStartedAt", frdo."firstNotStartedAt"),
              "lastNotStartedAt" = GREATEST(o."lastNotStartedAt", frdo."lastNotStartedAt"),
              "firstInProgressAt" = LEAST(o."firstInProgressAt", frdo."firstInProgressAt"),
              "lastInProgressAt" = GREATEST(o."lastInProgressAt", frdo."lastInProgressAt"),
              "firstCompleteAt" = LEAST(o."firstCompleteAt", frdo."firstCompleteAt"),
              "lastCompleteAt" = GREATEST(o."lastCompleteAt", frdo."lastCompleteAt"),
              "firstSuspendedAt" = LEAST(o."firstSuspendedAt", frdo."firstSuspendedAt"),
              "lastSuspendedAt" = GREATEST(o."lastSuspendedAt", frdo."lastSuspendedAt")
            FROM "FalseRestartDuplicateObjectives" frdo
            WHERE o.id = frdo."sourceId"
            RETURNING
              o.id "objectiveId"
          ),
          --- create a unified list of affected objectives
          "AffectedObjectives" AS (
            SELECT *
            FROM "FullDuplicateObjectives"
            UNION
            SELECT *
            FROM "AdvanceableDuplicateObjectives"
            UNION
            SELECT *
            FROM "FalseRestartDuplicateObjectives"
          ),
          --- migrate/merge/delete metadata table values from newer objectives into the older objectives
          "AffectedObjectiveFiles" AS (
            SELECT
              f1.id "objectiveFileId",
              f2.id "objectiveFileIdOrig",
              ao.id "objectiveId",
              ao."sourceId"
            FROM "AffectedObjectives" ao
            LEFT JOIN "ObjectiveFiles" f1
            ON ao."id" = f1."objectiveId"
            LEFT JOIN "ObjectiveFiles" f2
            ON ao."sourceId" = f2."objectiveId"
            AND f1."fileId" = f2."fileId"
          ),
          "ObjectiveFilesMigrated" AS (
            UPDATE "ObjectiveFiles" f
            SET
              "objectiveId" = aof."sourceId"
            FROM "AffectedObjectiveFiles" aof
            WHERE f.id = aof."objectiveFileId"
            AND aof."objectiveFileIdOrig" IS NULL
            RETURNING
              f.id "objectiveFileId",
              f."objectiveId"
          ),
          "ObjectiveFilesDeleted" AS (
            DELETE FROM "ObjectiveFiles" f
            USING "AffectedObjectiveFiles" aof
            WHERE f.id = aof."objectiveFileId"
            AND aof."objectiveFileIdOrig" IS NOT NULL
            RETURNING
              f.id "objectiveFileId",
              f."objectiveId"
          ),
          "AffectedObjectiveResources" AS (
            SELECT
              r1.id "objectiveResourceId",
              r2.id "objectiveResourceIdOrig",
              ao.id "objectiveId",
              ao."sourceId"
            FROM "AffectedObjectives" ao
            LEFT JOIN "ObjectiveResources" r1
            ON ao."id" = r1."objectiveId"
            LEFT JOIN "ObjectiveResources" r2
            ON ao."sourceId" = r2."objectiveId"
            AND r1."userProvidedUrl" = r2."userProvidedUrl"
          ),
          "ObjectiveResourcesMigrated" AS (
            UPDATE "ObjectiveResources" r
            SET
              "objectiveId" = aor."sourceId"
            FROM "AffectedObjectiveResources" aor
            WHERE r.id = aor."objectiveResourceId"
            AND aor."objectiveResourceIdOrig" IS NULL
            RETURNING
              r.id "objectiveResourceId",
              r."objectiveId"
          ),
          "ObjectiveResourcesDeleted" AS (
            DELETE FROM "ObjectiveResources" r
            USING "AffectedObjectiveResources" aor
            WHERE r.id = aor."objectiveResourceId"
            AND aor."objectiveResourceIdOrig" IS NOT NULL
            RETURNING
              r.id "objectiveResourceId",
              r."objectiveId"
          ),
          "AffectedObjectiveTopics" AS (
            SELECT
              t1.id "objectiveTopicId",
              t2.id "objectiveTopicIdOrig",
              ao.id "objectiveId",
              ao."sourceId"
            FROM "AffectedObjectives" ao
            LEFT JOIN "ObjectiveTopics" t1
            ON ao."id" = t1."objectiveId"
            LEFT JOIN "ObjectiveTopics" t2
            ON ao."sourceId" = t2."objectiveId"
            AND t1."topicId" = t2."topicId"
          ),
          "ObjectiveTopicsMigrated" AS (
            UPDATE "ObjectiveTopics" t
            SET
              "objectiveId" = aot."sourceId"
            FROM "AffectedObjectiveTopics" aot
            WHERE t.id = aot."objectiveTopicId"
            AND aot."objectiveTopicIdOrig" IS NULL
            RETURNING
              t.id "objectiveTopicId",
              t."objectiveId"
          ),
          "ObjectiveTopicsDeleted" AS (
            DELETE FROM "ObjectiveTopics" t
            USING "AffectedObjectiveTopics" aot
            WHERE t.id = aot."objectiveTopicId"
            AND aot."objectiveTopicIdOrig" IS NOT NULL
            RETURNING
              t.id "objectiveTopicId",
              t."objectiveId"
          ),
          --- migrate/merge/delete ARO records to use the older objectives
          "AffectedActivityReportObjectives" AS (
            SELECT
              aro1.id "activityReportObjectiveId",
              aro2.id "activityReportObjectiveIdOrig",
              aro1."activityReportId",
              aro1."objectiveId",
              ao."sourceId"
            FROM "AffectedObjectives" ao
            JOIN "ActivityReportObjectives" aro1
            ON aro1."objectiveId" = ao.id
            LEFT JOIN "ActivityReportObjectives" aro2
            ON aro1."objectiveId" = ao."sourceId"
            AND aro1."activityReportId" = aro2."activityReportId"
          ),
          "ActivityReportObjectivesMigrated" AS (
            UPDATE "ActivityReportObjectives" aro
            SET
              "objectiveId" = earo."sourceId"
            FROM "AffectedActivityReportObjectives" earo
            WHERE aro.id = earo."activityReportObjectiveId"
            AND earo."activityReportObjectiveIdOrig" IS NULL
            RETURNING
              aro.id "objectiveFileId",
              aro."activityReportId",
              aro."objectiveId"
          ),
          "ActivityReportObjectivesDeleted" AS (
            DELETE FROM "ActivityReportObjectives" aro
            USING "AffectedActivityReportObjectives" earo
            WHERE aro.id = earo."activityReportObjectiveId"
            AND earo."activityReportObjectiveIdOrig" IS NOT NULL
            RETURNING
              aro.id "objectiveFileId",
              aro."activityReportId",
              aro."objectiveId"
          ),
          --- delete the newer objectives
          "ObjectivesDeleted" AS (
            DELETE FROM "Objectives" o
            USING "AffectedObjectives" ao
            WHERE o.id = ao.id
            RETURNING
              o.id "objectiveId"
          )
          --- results
          SELECT 'FullDuplicateObjectivesUpdated', count(*)
          FROM "FullDuplicateObjectivesUpdated"
          UNION
          SELECT 'AdvanceableDuplicateObjectivesUpdated', count(*)
          FROM "AdvanceableDuplicateObjectivesUpdated"
          UNION
          SELECT 'FalseRestartDuplicateObjectivesUpdated', count(*)
          FROM "FalseRestartDuplicateObjectivesUpdated"
          UNION
          SELECT 'ObjectiveFilesMigrated', count(*)
          FROM "ObjectiveFilesMigrated"
          UNION
          SELECT 'ObjectiveFilesDeleted', count(*)
          FROM "ObjectiveFilesDeleted"
          UNION
          SELECT 'ObjectiveResourcesMigrated', count(*)
          FROM "ObjectiveResourcesMigrated"
          UNION
          SELECT 'ObjectiveResourcesDeleted', count(*)
          FROM "ObjectiveResourcesDeleted"
          UNION
          SELECT 'ObjectiveTopicsMigrated', count(*)
          FROM "ObjectiveTopicsMigrated"
          UNION
          SELECT 'ObjectiveTopicsDeleted', count(*)
          FROM "ObjectiveTopicsDeleted"
          UNION
          SELECT 'ActivityReportObjectivesMigrated', count(*)
          FROM "ActivityReportObjectivesMigrated"
          UNION
          SELECT 'ActivityReportObjectivesDeleted', count(*)
          FROM "ActivityReportObjectivesDeleted"
          UNION
          SELECT 'ObjectivesDeleted', count(*)
          FROM "ObjectivesDeleted";
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
