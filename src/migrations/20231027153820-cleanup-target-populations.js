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
        -- Update AR 'Preschool (ages 3-5)'.
        UPDATE "ActivityReports"
        SET
            "targetPopulations" = array_replace("targetPopulations", 'Preschool (ages 3-5)', 'Preschool Children (ages 3-5)')
          WHERE "targetPopulations" @> ARRAY['Preschool (ages 3-5)']::varchar[];

        -- Update AR 'Pregnant Women'.
        UPDATE "ActivityReports"
          SET
          "targetPopulations" = array_replace("targetPopulations", 'Pregnant Women', 'Pregnant Women / Pregnant Persons')
            WHERE "targetPopulations" @> ARRAY['Pregnant Women']::varchar[];

       -- Cleanup JSON 'Target Populations' for TR.
       WITH "goodTgt" as (
        SELECT erp.id, ARRAY_AGG(erptp.tp) AS good
        FROM "EventReportPilots" erp
        CROSS JOIN UNNEST(STRING_TO_ARRAY(trim(data -> 'targetPopulations' ->> 0,'"'),E'\n')) erptp(tp)
        GROUP BY 1
        ORDER BY 1
      )
      UPDATE "EventReportPilots" e
      SET data = JSONB_SET(
                  data,
                  ARRAY['targetPopulations'],
                  TO_JSONB(gt.good)
                  )
      FROM "goodTgt" gt
      WHERE e."id" = gt."id";

      -- Cleanup JSON 'Reasons' for TR.
      WITH "goodTgt" as (
      SELECT erp.id, ARRAY_AGG(erpr.r) AS good
      FROM "EventReportPilots" erp
      CROSS JOIN UNNEST(STRING_TO_ARRAY(TRIM(REPLACE(data ->> 'reasons', '", "', ' '),'["] '), '\n')) erpr(r)
      GROUP BY 1
      ORDER BY 1
      )
      UPDATE "EventReportPilots" e
      SET data = JSONB_SET(
                  data,
                  ARRAY['reasons'],
                  TO_JSONB(gt.good)
                  )
      FROM "goodTgt" gt
      WHERE e."id" = gt."id";

        -- Update TR 'Preschool (ages 3-5)'.
        UPDATE "EventReportPilots"
        SET data = JSONB_SET(
              data,
              ARRAY['targetPopulations'],
              TO_JSONB(REPLACE(data->>'targetPopulations', 'Preschool (ages 3-5)', 'Preschool Children (ages 3-5)'))
              );

        -- Update TR 'Pregnant Women/Pregnant People'.
        UPDATE "EventReportPilots"
        SET data = JSONB_SET(
            data,
            ARRAY['targetPopulations'],
            TO_JSONB(REPLACE(data->>'targetPopulations', 'Pregnant Women/Pregnant People', 'Pregnant Women / Pregnant Persons'))
            );
     `, { transaction });
    });
  },

  down: async () => {},
};
