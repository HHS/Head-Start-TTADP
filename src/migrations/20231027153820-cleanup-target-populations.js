const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        /* sql */ `
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

       -- Cleanup JSON 'Target Populations' for TR (create proper array).
       WITH "goodTgt" as (
        SELECT
          erp.id,
          ARRAY_AGG(DISTINCT erptp.tp) "targetPopulations"
        FROM "EventReportPilots" erp
        CROSS JOIN LATERAL (
          SELECT
          UNNEST(
            CASE
              WHEN value::text like '%' || chr(92) || chr(92) || 'n' || '%'
              THEN STRING_TO_ARRAY(trim(value::text,'"'), chr(92) || 'n') -- Char(10) is a new line.
              ELSE ARRAY[trim(value::TEXT,'"')]::TEXT[]
            END
            ) tp
          FROM jsonb_array_elements(erp.data -> 'targetPopulations') WITH ORDINALITY
        ) erptp
        GROUP BY 1
        ORDER BY 1
      )
      UPDATE "EventReportPilots" e
      SET data = JSONB_SET(
                  data,
                  ARRAY['targetPopulations'],
                  TO_JSONB(gt."targetPopulations")
                  )
      FROM "goodTgt" gt
      WHERE e."id" = gt."id";

      -- Cleanup JSON 'Reasons' for TR (create proper array).
      WITH "goodTgt" as (
      SELECT erp.id, ARRAY_AGG(erpr.r) AS good
      FROM "EventReportPilots" erp
      CROSS JOIN UNNEST(STRING_TO_ARRAY(TRIM(REPLACE(data ->> 'reasons', '", "', ' '),'["] '), chr(92) || 'n')) erpr(r)
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

       -- Update JSON array property 'targetPopulations' for TR 'Preschool (ages 3-5)'.
        UPDATE "EventReportPilots"
            SET data = (
          SELECT JSONB_SET(
                  data,
                  '{targetPopulations}',
                  (
            SELECT jsonb_agg(
              CASE
              WHEN value::text = '"Preschool (ages 3-5)"' THEN '"Preschool Children (ages 3-5)"'::jsonb
              ELSE value
              END
            )
            FROM jsonb_array_elements(data->'targetPopulations') AS value
            )::jsonb
                  ))
        WHERE data->'targetPopulations' @> '["Preschool (ages 3-5)"]'::jsonb;

        -- Update JSON array property 'targetPopulations' for TR 'Pregnant Women/Pregnant People'.
        UPDATE "EventReportPilots"
            SET data = (
          SELECT JSONB_SET(
                  data,
                  '{targetPopulations}',
                  (
            SELECT jsonb_agg(
              CASE
              WHEN value::text = '"Pregnant Women/Pregnant People"' OR value::text = '"Pregnant Women"' THEN '"Pregnant Women / Pregnant Persons"'::jsonb
              ELSE value
              END
            )
            FROM jsonb_array_elements(data->'targetPopulations') AS value
            )::jsonb
                  ))
        WHERE data->'targetPopulations' @> '["Pregnant Women/Pregnant People"]'::jsonb;

        -- Remove all duplicates from JSON array property 'targetPopulations' for TR.
        UPDATE "EventReportPilots"
            SET data = (
          SELECT JSONB_SET(
                  data,
                  '{targetPopulations}',
                  (
            SELECT jsonb_agg(DISTINCT value)
            FROM jsonb_array_elements(data->'targetPopulations') AS value
            )::jsonb
                  ))
        WHERE data->'targetPopulations' IS NOT NULL;
     `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
