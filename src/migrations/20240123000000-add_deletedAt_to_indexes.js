const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        `
        -- Original plan: In tables that use Sequelize's built-in "deletedAt" column, exclude deleted records
        -- from unique indexes that don't include the pkey. However, this does not support using ON CONFLICT
        -- in upserts. So, we need to include "deletedAt" in the index instead.

        ALTER TABLE "ActivityReportApprovers" DROP CONSTRAINT "unique_activityReportId_userId";
        DROP INDEX IF EXISTS "unique_activityReportId_userId";
        CREATE UNIQUE INDEX "unique_activityReportId_userId"
        ON "ActivityReportApprovers" ("activityReportId", "userId", "deletedAt");
        ALTER TABLE "ActivityReportApprovers" ADD CONSTRAINT "unique_activityReportId_userId" UNIQUE
        USING INDEX "unique_activityReportId_userId";

        ALTER TABLE "CollaboratorTypes" DROP CONSTRAINT "CollaboratorTypes_name_validForId_unique";
        DROP INDEX IF EXISTS "CollaboratorTypes_name_validForId_unique";
        CREATE UNIQUE INDEX "CollaboratorTypes_name_validForId_unique"
        ON "CollaboratorTypes" (name, "validForId", "deletedAt");
        ALTER TABLE "CollaboratorTypes" ADD CONSTRAINT "CollaboratorTypes_name_validForId_unique" UNIQUE
        USING INDEX "CollaboratorTypes_name_validForId_unique";

        ALTER TABLE "Courses" DROP CONSTRAINT "Courses_name_unique";
        DROP INDEX IF EXISTS "Courses_name_unique";
        CREATE UNIQUE INDEX "Courses_name_unique"
        ON "Courses" (name, "deletedAt");
        ALTER TABLE "Courses" ADD CONSTRAINT "Courses_name_unique" UNIQUE
        USING INDEX "Courses_name_unique";

        ALTER TABLE "GoalCollaborators" DROP CONSTRAINT "GoalCollaborators_goalId_userId_collaboratorTypeId_unique";
        DROP INDEX IF EXISTS "GoalCollaborators_goalId_userId_collaboratorTypeId_unique";
        CREATE UNIQUE INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_unique"
        ON "GoalCollaborators" ("goalId", "userId", "collaboratorTypeId", "deletedAt");
        ALTER TABLE "GoalCollaborators" ADD CONSTRAINT "GoalCollaborators_goalId_userId_collaboratorTypeId_unique" UNIQUE
        USING INDEX "GoalCollaborators_goalId_userId_collaboratorTypeId_unique";

        ALTER TABLE "ObjectiveCollaborators" DROP CONSTRAINT "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un";
        DROP INDEX IF EXISTS "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un";
        CREATE UNIQUE INDEX "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un"
        ON "ObjectiveCollaborators" ("objectiveId", "userId", "collaboratorTypeId", "deletedAt");
        ALTER TABLE "ObjectiveCollaborators" ADD CONSTRAINT "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un" UNIQUE
        USING INDEX "ObjectiveCollaborators_objectiveId_userId_collaboratorTypeId_un";

        ALTER TABLE "ValidFor" DROP CONSTRAINT "ValidFor_option_unique";
        DROP INDEX IF EXISTS "ValidFor_option_unique";
        CREATE UNIQUE INDEX "ValidFor_option_unique"
        ON "ValidFor" (name, "deletedAt");
        ALTER TABLE "ValidFor" ADD CONSTRAINT "ValidFor_option_unique" UNIQUE
        USING INDEX "ValidFor_option_unique";
        `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
