const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`

      -- Get all unwanted objectives for this Goal.
      DROP TABLE IF EXISTS ObjectivesToRemove;
      CREATE TEMP TABLE ObjectivesToRemove
            AS
      SELECT
      o."id"
      FROM "Objectives" o
      LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
      LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
      WHERE o."goalId" = 66089
        AND o."status" = 'Not Started'
        AND COALESCE(ar."calculatedStatus",'draft') = 'draft';

      -- Delete from ARO Topics.
      DROP TABLE IF EXISTS DeleteTopics;
      CREATE TEMP TABLE DeleteTopics
            AS
      WITH updatetopics AS (
      DELETE FROM "ActivityReportObjectiveTopics" WHERE "activityReportObjectiveId" IN (
        SELECT id FROM "ActivityReportObjectives" WHERE "objectiveId" IN (
          SELECT id FROM ObjectivesToRemove
        )
      )
      RETURNING
      id
      ) SELECT * FROM updatetopics;



     -- Delete from ARO Resources.
     DROP TABLE IF EXISTS DeleteResources;
      CREATE TEMP TABLE DeleteResources
            AS
      WITH updateresources AS (
      DELETE FROM "ActivityReportObjectiveResources" WHERE "activityReportObjectiveId" IN (
        SELECT id FROM "ActivityReportObjectives" WHERE "objectiveId" IN (
          SELECT id FROM ObjectivesToRemove
        )
      )
      RETURNING
      id
      ) SELECT * FROM updateresources;

      -- Delete from ARO Files.
      DROP TABLE IF EXISTS DeleteFiles;
      CREATE TEMP TABLE DeleteFiles
            AS
      WITH updatedfiles AS (
      DELETE FROM "ActivityReportObjectiveFiles" WHERE "activityReportObjectiveId" IN (
        SELECT id FROM "ActivityReportObjectives" WHERE "objectiveId" IN (
          SELECT id FROM ObjectivesToRemove
        )
      )
      RETURNING
      id
      ) SELECT * FROM updatedfiles;

      -- Delete from AR Courses.
      DROP TABLE IF EXISTS DeleteCourses;
      CREATE TEMP TABLE DeleteCourses
            AS
      WITH updatedcourses AS (
      DELETE FROM "ActivityReportObjectiveCourses" WHERE "activityReportObjectiveId" IN (
        SELECT id FROM "ActivityReportObjectives" WHERE "objectiveId" IN (
          SELECT id FROM ObjectivesToRemove
        )
      )
      RETURNING
      id
      ) SELECT * FROM updatedcourses;

      -- Delete ARO's.
      DROP TABLE IF EXISTS DeleteAROs;
      CREATE TEMP TABLE DeleteAROs
            AS
      WITH updatearos AS (
      DELETE FROM "ActivityReportObjectives" WHERE "objectiveId" IN (
        SELECT id FROM ObjectivesToRemove
      )
      RETURNING
      id
      ) SELECT * FROM updatearos;

      -- Delete objectives.
      DROP TABLE IF EXISTS DeleteObjectives;
      CREATE TEMP TABLE DeleteObjectives
            AS
      WITH updateobjectives AS (
      DELETE FROM "Objectives" WHERE id IN (
         SELECT id FROM ObjectivesToRemove
      )
      RETURNING
      id
      ) SELECT * FROM updateobjectives;

      -- Get Delete counts using union.
      SELECT COUNT(*), 'ARO Topics' FROM DeleteTopics
      UNION ALL
      SELECT COUNT(*), 'ARO Resources' FROM DeleteResources
      UNION ALL
      SELECT COUNT(*), 'ARO Files' FROM DeleteFiles
      UNION ALL
      SELECT COUNT(*), 'ARO Courses' FROM DeleteCourses
      UNION ALL
      SELECT COUNT(*), 'AROs' FROM DeleteAROs
      UNION ALL
      SELECT COUNT(*), 'Objectives' FROM DeleteObjectives;
        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // No need to put back unwanted objectives.
    },
  ),
};
