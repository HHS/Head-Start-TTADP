const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return queryInterface.sequelize.query(`
        -- This reformats all historical communicationDate values to mm/dd/yyyy
        -- 
        -- Assumptions of preexisting data:
        -- -always month-day-year
        -- -always separated by a slash, period, or space [/. ]
        -- -if there is an extra separator it impacts the year
        -- -if the third position is at least two characters, it's the year, else it's the fourth position
        -- -the first four characters of a long year string holds the year
        --
        -- These assumptions are based on the data we have, so aren't guaranteed to be correct if this is rerun.
        -- However the logic is slightly overengineered for extra robustness if new errors show up. At the time of
        -- writing, this produces all valid strings where to_date(data->>'communicationDate','mm/dd/yyyy') succeeds

        DROP TABLE IF EXISTS comdate_corrections;
        CREATE TEMP TABLE comdate_corrections
        AS
        WITH reseparated AS (
        SELECT
          id clid,
          data->>'communicationDate' orig,
          -- replace [-. ] seperators (only - has been seen) with / so the subsequent logic always works
          regexp_replace(data->>'communicationDate','[-. ]','/','g') reseparated
        FROM "CommunicationLogs"
        WHERE data->>'communicationDate' !~ '^\\d{2}/\\d{2}/\\d{4}$'
          AND COALESCE(data->>'communicationDate','') != ''
        ),
        date_particles AS (
        SELECT
          clid,
          orig,
          SPLIT_PART(reseparated,'/',1) month_part,
          SPLIT_PART(reseparated,'/',2) day_part,
          -- check where the year part is because sometimes separators between day and year are doubled
          CASE
            WHEN LENGTH(SPLIT_PART(reseparated,'/',3)) > 1 THEN SPLIT_PART(reseparated,'/',3)
            ELSE SPLIT_PART(reseparated,'/',4)
          END AS year_part
        FROM reseparated
        ),
        padded_particles AS (
        SELECT
          clid,
          orig,
          LPAD(month_part,2,'0') padded_month,
          LPAD(day_part,2,'0') padded_day,
          -- pull out only the leftmost 4 characters, but pad them with the century if we only two chars
          LPAD(
            LEFT(year_part,4),
            4,
            '20'
          ) padded_year
        FROM date_particles
        )
        SELECT
          clid,
          orig,
          padded_month || '/' || padded_day || '/' || padded_year reformat
        FROM padded_particles
        ;

        UPDATE "CommunicationLogs"
        SET data = jsonb_set(data, '{communicationDate}', to_jsonb(reformat))
        FROM comdate_corrections
        WHERE id = clid
        ;

      `)
    })
  },

  async down() {
    // no rollbacks
  },
}
