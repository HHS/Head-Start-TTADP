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
      CREATE TEMP TABLE status_update_goals
      AS
      WITH goalset AS (
        SELECT * FROM (
          VALUES -- sorted and deduped
          (50605), (50606), (50607), (50705), (50741), (50952), (50953), (50954), (50955), (50956),
          (50957), (50958), (50959), (50960), (50961), (51164), (51165), (51166), (51168), (51169),
          (51170), (51171), (51599), (51811), (52223), (52294), (52420), (52451), (52453), (52454),
          (52455), (52456), (53116), (53390), (54215), (54275), (54317), (54325), (54349), (54350),
          (54774), (55115), (55215), (55635), (55647), (55648), (55649), (56022), (56047), (56632)
        ) AS data(gid)
      )
      SELECT
        gid,
        BOOL_OR(ar.id IS NOT NULL) on_approved_ar
      FROM goalset g
      LEFT JOIN "Objectives" o
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
