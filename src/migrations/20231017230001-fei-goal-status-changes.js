const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(`
      -- fixing the desired goal status
      DROP TABLE IF EXISTS status_update_goals;
      CREATE TABLE status_update_goals
      AS
      WITH goalset AS (
        SELECT * FROM (
          VALUES
            (50741), (50952), (50952), (52420), (51164), (51171), (50953),
            (51165), (50954), (51166), (50955), (50955), (54325), (50956),
            (50957), (50958), (50959), (51168), (50960), (52223), (50705),
            (50961), (51169), (51170), (55649), (55648), (52453), (52454),
            (52455), (54275), (54774), (55647), (50605), (50606), (50607),
            (52456), (52451), (52451), (52451), (55215), (53116), (51599),
            (56632), (51811), (53390), (54349), (54350), (54215), (52294),
            (55635), (56022), (55115), (56047), (54317)
        ) AS data(gid)
      )
      SELECT
        gid,
        BOOL_OR(ar.id IS NOT NULL) on_approved_ar
      FROM goalset g
      JOIN "Objectives" o
        ON o."goalId" = g.gid
      LEFT JOIN "ActivityReportObjectives" aro
        ON aro."objectiveId" = o.id
      LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND "calculatedStatus" = 'approved'
      GROUP BY 1
      ;

      DROP TABLE IF EXISTS updated_to_not_started;
      CREATE TEMP TABLE updated_to_not_started
      AS
      WITH updater AS (
        UPDATE "Goals"
        SET
          status = 'Not Started',
          "updatedAt" = NOW()
        FROM status_update_goals
        WHERE id = gid
          AND on_approved_ar = FALSE
          AND status != 'Not Started'
        RETURNING
          id
      ) SELECT * FROM updater
      ;
      DROP TABLE IF EXISTS updated_to_in_progress;
      CREATE TEMP TABLE updated_to_in_progress
      AS
      WITH updater AS (
        UPDATE "Goals"
        SET
          status = 'In Progress',
          "updatedAt" = NOW()
        FROM status_update_goals
        WHERE id = gid
          AND on_approved_ar
          AND status != 'In Progress'
        RETURNING
          id
      ) SELECT * FROM updater
      ;
      
      SELECT 'updated_to_in_progress' operation, COUNT(*) cnt FROM updated_to_in_progress
      UNION
      SELECT 'updated_to_not_started' operation, COUNT(*) cnt FROM updated_to_not_started
      ;
      `, { transaction });
    });
  },

  down: async () => {
    // it doesn't make sense to roll this back to bad data.
  },
};
