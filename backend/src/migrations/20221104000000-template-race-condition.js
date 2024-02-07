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
        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempDuplicateGoalTemplates" AS
            SELECT
              min(gt.id) "goalTemplateId",
              dgt.id "duplicateGoalTemplateId",
              dgt.hash,
              dgt."regionId"
            FROM "GoalTemplates" gt
            JOIN "GoalTemplates" dgt
            ON gt.hash = dgt.hash
            AND gt.id < dgt.id
            GROUP BY 2,3,4;
            ------------------------------------------------------------------------------------
            UPDATE "Goals" g
            SET
              "goalTemplateId" = tdgt."goalTemplateId"
            FROM "TempDuplicateGoalTemplates" tdgt
            WHERE g."goalTemplateId" = tdgt."duplicateGoalTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "GoalTemplateDates" AS (
                SELECT
                  gt.id "goalTemplateId",
                  min(gt2."createdAt") "createdAt",
                  max(gt2."updatedAt") "updatedAt",
                  max(gt2."lastUsed") "lastUsed",
                  max(gt2."templateNameModifiedAt") "templateNameModifiedAt"
                FROM "GoalTemplates" gt
                JOIN "TempDuplicateGoalTemplates" tdgt
                ON gt.id = tdgt."goalTemplateId"
                JOIN "GoalTemplates" gt2
                ON tdgt."goalTemplateId" = gt2.id
                OR tdgt."duplicateGoalTemplateId" = gt2.id
                GROUP BY 1
              )
            UPDATE "GoalTemplates" gt
            SET
              "createdAt" = gtd."createdAt",
              "updatedAt" = gtd."updatedAt",
              "lastUsed" = gtd."lastUsed",
              "templateNameModifiedAt" = gtd."templateNameModifiedAt"
            FROM "GoalTemplateDates" gtd
            WHERE gt.id = gtd."goalTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "GoalTemplateObjectiveTemplatesToUpdate" AS (
                SELECT
                  gtot.id "goalTemplateObjectiveTemplateId",
                  tdgt."goalTemplateId",
                  tdgt."duplicateGoalTemplateId",
                  gtot."objectiveTemplateId",
                  gtot."createdAt",
                  gtot."updatedAt"
                FROM "GoalTemplateObjectiveTemplates" gtot
                JOIN "TempDuplicateGoalTemplates" tdgt
                ON gtot."objectiveTemplateId" = tdgt."duplicateGoalTemplateId"
                LEFT JOIN "GoalTemplateObjectiveTemplates" gtot2
                ON tdgt."goalTemplateId" = gtot2."goalTemplateId"
                AND gtot."objectiveTemplateId" = gtot2."objectiveTemplateId"
                WHERE gtot2.id IS NULL
              )
            UPDATE "GoalTemplateObjectiveTemplates" gtot
            SET  "goalTemplateId" = gtotu."goalTemplateId"
            FROM "GoalTemplateObjectiveTemplatesToUpdate" gtotu
            WHERE gtot.id = gtotu."goalTemplateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            UPDATE "GoalTemplateObjectiveTemplates" gtot
            SET  "goalTemplateId" = tdgt."goalTemplateId"
            FROM "TempDuplicateGoalTemplates" tdgt
            WHERE gtot."goalTemplateId" = tdgt."duplicateGoalTemplateId";
            ------------------------------------------------------------------------------------
            DELETE FROM "GoalTemplates" gt
            USING "TempDuplicateGoalTemplates" tdgt
            WHERE gt."id" = tdgt."duplicateGoalTemplateId";
            ------------------------------------------------------------------------------------
            DROP TABLE "TempDuplicateGoalTemplates";
          END$$;`,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `DO $$
          BEGIN
            CREATE TEMP TABLE "TempDuplicateObjectiveTemplates" AS
            SELECT
              min(ot.id) "objectiveTemplateId",
              dot.id "duplicateObjectiveTemplateId",
              dot.hash,
              dot."regionId"
            FROM "ObjectiveTemplates" ot
            JOIN "ObjectiveTemplates" dot
            ON ot.hash = dot.hash
            AND ot.id < dot.id
            GROUP BY 2,3,4;
            ------------------------------------------------------------------------------------
            UPDATE "Objectives" o
            SET
              "objectiveTemplateId" = tdot."objectiveTemplateId"
            FROM "TempDuplicateObjectiveTemplates" tdot
            WHERE o."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "ObjectiveTemplateDates" AS (
                SELECT
                  ot.id "objectiveTemplateId",
                  min(ot2."createdAt") "createdAt",
                  max(ot2."updatedAt") "updatedAt",
                  max(ot2."lastUsed") "lastUsed",
                  max(ot2."templateTitleModifiedAt") "templateTitleModifiedAt"
                FROM "ObjectiveTemplates" ot
                JOIN "TempDuplicateObjectiveTemplates" tdot
                ON ot.id = tdot."objectiveTemplateId"
                JOIN "ObjectiveTemplates" ot2
                ON tdot."objectiveTemplateId" = ot2.id
                OR tdot."duplicateObjectiveTemplateId" = ot2.id
                GROUP BY 1
              )
            UPDATE "ObjectiveTemplates" ot
            SET
              "createdAt" = otd."createdAt",
              "updatedAt" = otd."updatedAt",
              "lastUsed" = otd."lastUsed",
              "templateTitleModifiedAt" = otd."templateTitleModifiedAt"
            FROM "ObjectiveTemplateDates" otd
            WHERE ot.id = otd."objectiveTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "GoalTemplateObjectiveTemplatesToUpdate" AS (
                SELECT
                  gtot.id "goalTemplateObjectiveTemplateId",
                  tdot."objectiveTemplateId",
                  tdot."duplicateObjectiveTemplateId",
                  gtot."goalTemplateId",
                  gtot."createdAt",
                  gtot."updatedAt"
                FROM "GoalTemplateObjectiveTemplates" gtot
                JOIN "TempDuplicateObjectiveTemplates" tdot
                ON gtot."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId"
                LEFT JOIN "GoalTemplateObjectiveTemplates" gtot2
                ON tdot."objectiveTemplateId" = gtot2."objectiveTemplateId"
                AND gtot."goalTemplateId" = gtot2."goalTemplateId"
                WHERE gtot2.id IS NULL
              )
            UPDATE "GoalTemplateObjectiveTemplates" gtot
            SET  "objectiveTemplateId" = gtotu."objectiveTemplateId"
            FROM "GoalTemplateObjectiveTemplatesToUpdate" gtotu
            WHERE gtot.id = gtotu."goalTemplateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            DELETE FROM "GoalTemplateObjectiveTemplates" gtot
            USING "TempDuplicateObjectiveTemplates" tdot
            WHERE gtot."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "ObjectiveTemplateFilesToUpdate" AS (
                SELECT
                  otf.id "objectiveTemplateFileId",
                  tdot."objectiveTemplateId",
                  tdot."duplicateObjectiveTemplateId",
                  otf."fileId",
                  otf."createdAt",
                  otf."updatedAt"
                FROM "ObjectiveTemplateFiles" otf
                JOIN "TempDuplicateObjectiveTemplates" tdot
                ON otf."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId"
                LEFT JOIN "ObjectiveTemplateFiles" otf2
                ON tdot."objectiveTemplateId" = otf2."objectiveTemplateId"
                AND otf."fileId" = otf2."fileId"
                WHERE otf2.id IS NULL
              )
            UPDATE "ObjectiveTemplateFiles" otf
            SET
              "objectiveTemplateId" = otfu."objectiveTemplateId"
            FROM "ObjectiveTemplateFilesToUpdate" otfu
            WHERE otf.id = otfu."objectiveTemplateFileId";
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTemplateFiles" otf
            USING "TempDuplicateObjectiveTemplates" tdot
            WHERE otf."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "ObjectiveTemplateResourcesToUpdate" AS (
                SELECT
                  otr.id "objectiveTemplateResourceId",
                  tdot."objectiveTemplateId",
                  tdot."duplicateObjectiveTemplateId",
                  otr."userProvidedUrl",
                  otr."createdAt",
                  otr."updatedAt"
                FROM "ObjectiveTemplateResources" otr
                JOIN "TempDuplicateObjectiveTemplates" tdot
                ON otr."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId"
                LEFT JOIN "ObjectiveTemplateResources" otr2
                ON tdot."objectiveTemplateId" = otr2."objectiveTemplateId"
                AND otr."userProvidedUrl" = otr2."userProvidedUrl"
                WHERE otr2.id IS NULL
              )
            UPDATE "ObjectiveTemplateResources" otr
            SET
              "objectiveTemplateId" = otru."objectiveTemplateId"
            FROM "ObjectiveTemplateResourcesToUpdate" otru
            WHERE otr.id = otru."objectiveTemplateResourceId";
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTemplateResources" otr
            USING "TempDuplicateObjectiveTemplates" tdot
            WHERE otr."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            WITH
              "ObjectiveTemplateTopicsToUpdate" AS (
                SELECT
                  ott.id "objectiveTemplateTopicId",
                  tdot."objectiveTemplateId",
                  tdot."duplicateObjectiveTemplateId",
                  ott."topicId",
                  ott."createdAt",
                  ott."updatedAt"
                FROM "ObjectiveTemplateTopics" ott
                JOIN "TempDuplicateObjectiveTemplates" tdot
                ON ott."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId"
                LEFT JOIN "ObjectiveTemplateTopics" ott2
                ON tdot."objectiveTemplateId" = ott2."objectiveTemplateId"
                AND ott."topicId" = ott2."topicId"
                WHERE ott2.id IS NULL
              )
            UPDATE "ObjectiveTemplateTopics" ott
            SET
              "objectiveTemplateId" = ottu."objectiveTemplateId"
            FROM "ObjectiveTemplateTopicsToUpdate" ottu
            WHERE ott.id = ottu."objectiveTemplateTopicId";
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTemplateTopics" ott
            USING "TempDuplicateObjectiveTemplates" tdot
            WHERE ott."objectiveTemplateId" = tdot."duplicateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTemplates" ot
            USING "TempDuplicateObjectiveTemplates" tdot
            WHERE ot."id" = tdot."duplicateObjectiveTemplateId";
            ------------------------------------------------------------------------------------
            DROP TABLE "TempDuplicateObjectiveTemplates";
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
