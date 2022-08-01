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
            GROUP BY 2,3,4;;
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
            USING "GoalTemplateDates" gtd
            WHERE gt.id = gtd."goalTemplateId";
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
            GROUP BY 2,3,4;;
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
            USING "ObjectiveTemplateDates" otd
            WHERE ot.id = otd."objectiveTemplateId";
            ------------------------------------------------------------------------------------
            DELETE FROM "ObjectiveTemplates" ot
            USING "TempDuplicateObjectiveTemplates" tdot
            WHERE ot."id" = tdgt."duplicateObjectiveTemplateId";
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
