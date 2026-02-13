const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // This starts by creating a stored procedure that can be
      // used now and in the future to create a time series table with a
      // name of the form <source tablename>_timeseries, e.g. Goals_timeseries

      // usage: SELECT create_timeseries_from_audit_log('<tablename>')
      // example: SELECT create_timeseries_from_audit_log('Goals')
      // creates Goals_timeseries

      // Resulting tables are like their source tables except:
      // * id becomes data_id and is only unique when combined with the timeband
      // * timeband_start identifies the beginning of the timeband of a particular
      //   record state
      // * timeband_end identifies the ending of the timeband were the record has
      //   that state
      // * enums are converted to text values because enums change over time and
      //   thus historical data may not fit current enums

      // Root causes were not saving to ActivityReportGoalFieldResponses
      // on multi-recipient ARs where a goal already had a root cause
      // for one recipient. Because ActivityReportGoalFieldResponses
      // is supposed to have the root cause as it was at report approval
      // time, which can differ from the current root causes for goals
      // as recorded in GoalFieldResponses. Calculating what the state of
      // root causes at the time of AR approval is aided by having a
      // time series of GoalFieldResponses to join into with the addition of
      // of a check like:
      // LEFT JOIN GoalFieldResponses_timeseries gfrt
      //   ON arg."goalId" = gfrt."goalId"
      //   AND ar."approvedAt" BETWEEN gfrt.timeband_start AND gfrt.timeband_end

      await queryInterface.sequelize.query(
        `

      CREATE OR REPLACE FUNCTION create_timeseries_from_audit_log(tablename text)
      RETURNS VOID LANGUAGE plpgsql AS
      $$
      DECLARE
        qry text := '';
        wtext text := '';
        rec record;
      BEGIN
      -- Get the column list for the main table
      -- NOTE regarding string formatting used to assemble the queries that the
      -- function uses to do its work:
      -- The format() function works like C string interpolation except
      -- that it protects from SQL injection attacks. Like C string interpolation,
      -- the %<character> is replaced by the comma-separated values following the
      -- base string.
      -- %I is formatted as a database object name and manages double quotes
      -- %L is formatted as a string literal and manages single quotes
      -- %s can be used for arbitrary string interpolation but doesn't
      -- provide any protections or quote management.
      qry := format('
      DROP TABLE IF EXISTS clist;
      CREATE TEMP TABLE clist
      AS
      SELECT
        column_name cname
        ,ordinal_position cnum
        ,data_type  ctype
      FROM information_schema.columns ic
      WHERE table_schema = %L
        AND table_name = %L'
      ,'public'
      ,tablename);
      EXECUTE qry;
      qry := '';
      -- Get the pg_typeof column datatypes for the main table
      -- these are more precise than the information schema types
      qry := 'DROP TABLE IF EXISTS ctypes;
      CREATE TEMP TABLE ctypes
      AS';
      FOR rec IN
        SELECT * FROM clist ORDER BY cnum
      LOOP
        wtext := wtext || format('
          SELECT cname, cnum, ctype, pg_typeof( %I ) pgtype FROM clist LEFT JOIN (SELECT * FROM %I LIMIT 1) a ON TRUE WHERE %L = cname UNION'
        ,rec.cname
        ,tablename
        ,rec.cname);
      END LOOP;
      qry := qry || LEFT(wtext,-6) || '
      ORDER BY cnum';
      wtext := '';
      EXECUTE qry;
      qry := '';
      -- set up the beginning and end of time
      qry := format('DROP TABLE IF EXISTS timeband;
      CREATE TEMP TABLE timeband
      AS
      SELECT
        %L::timestamp timebegin,
        NOW() timeend'
      ,'2020-01-01');
      EXECUTE qry;
      qry := '';
      wtext := '';
      -- assemble flat_z, containing the typed columns with changed data
      -- there will be one record per audit log entry, plus one for the
      -- current value
      -- This assumes every table as an id column, which the audit log
      -- also assumes
      qry := format('DROP TABLE IF EXISTS flat_z;
      CREATE TEMP TABLE flat_z
      AS
      SELECT
        id zid
        ,data_id
        ,dml_timestamp
        ,dml_type = %L is_insert
        ,FALSE is_current_record'
      ,'INSERT');
      FOR rec IN
        SELECT * FROM ctypes WHERE cname != 'id' ORDER BY cnum
      LOOP
        CASE
          WHEN rec.ctype = 'USER-DEFINED' THEN -- for enums
            -- because the enums have changed over time we
            -- are only casting to text. The other option
            -- of building a new enum containing all historical
            -- enums is both more complex and won't make
            -- using the resulting time series any easier
            wtext := wtext || format('
            ,(old_row_data->>%L)::%s AS %I'
            ,rec.cname
            ,'text'
            ,rec.cname);
          WHEN rec.ctype = 'ARRAY' THEN
            -- Because the arrays are stored as strings, they need to be parsed
            -- back into arrays. They look like:
            -- ["element1", "element2", "", "element4"]
            -- The X-X-X is a string very unlikely to be present
            -- in the internal text and replaces the internal element separators (", ")
            -- before the start ([") and end ("]) are stripped off. That step probably
            -- isn't strictly necessary, but is in place because the end also trims
            -- double quotes, so it's safest to already have the internal separators
            -- containing the double quotes replaced with an alternative separator.
            wtext := wtext || format('
            ,(
              string_to_array(
                TRIM(
                  TRIM(
                    regexp_replace((old_row_data->>%L), %L , %L, %L
                    ), %L
                  ),%L
                ), %L
              )
            )::%s AS %I'
            ,rec.cname
            ,'", "'
            ,'X-X-X'
            ,'g'
            ,'["'
            ,'"]'
            ,'X-X-X'
            ,rec.pgtype
            ,rec.cname);
          ELSE -- for everything else
            -- All of these values can be cast as-is into their original types
            wtext := wtext || format('
            ,(old_row_data->>%L)::%s AS %I'
            ,rec.cname
            ,rec.ctype
            ,rec.cname);
        END CASE;
        -- this detects whether the column was updated to be null
        wtext := wtext || format('
        ,(old_row_data->%L) = %L %I'
        ,rec.cname
        ,'null'
        ,rec.cname || '_isnull');
      END LOOP;
      qry := qry || wtext || format('
      FROM %I
      UNION ALL
      -- Add in the current value from the live table as a final record
      SELECT
        9223372036854775807 --max bigint so these always sort last
        ,id
        ,timeend
        ,FALSE
        ,TRUE'
      , 'ZAL' || tablename);
      wtext := '';
      FOR rec IN
        SELECT * FROM ctypes WHERE cname != 'id' ORDER BY cnum
      LOOP
        CASE
          WHEN rec.ctype = 'USER-DEFINED' THEN -- for enums
            -- this is to match pushing enums to text in
            -- records pulled from the audit log
            wtext := wtext || format('
            ,%I::%s'
            ,rec.cname
            ,'text');
          ELSE
            wtext := wtext || format('
            ,%I'
            ,rec.cname);
        END CASE;
        wtext := wtext || format('
        ,%I IS NULL %I'
        ,rec.cname
        ,rec.cname || '_isnull');
      END LOOP;
      qry := qry || wtext || format('
      FROM %I
      CROSS JOIN timeband
      ORDER BY 2,1'
      ,tablename);
      wtext := '';
      EXECUTE qry;
      qry := '';
      -- create group ids for each column to identify which iteration
      -- of column value each record should have
      qry := 'DROP TABLE IF EXISTS group_z;
      CREATE TEMP TABLE group_z
      AS
      SELECT
        zid
        ,data_id';
      FOR rec IN
        SELECT * FROM ctypes WHERE cname != 'id' ORDER BY cnum
      LOOP
        wtext := wtext || format('
        ,SUM(CASE WHEN %I OR %I IS NOT NULL THEN 1 ELSE 0 END) OVER (PARTITION BY data_id ORDER BY zid DESC ROWS UNBOUNDED PRECEDING) AS %I'
        ,rec.cname || '_isnull'
        ,rec.cname
        ,rec.cname || '_group');
      END LOOP;
      qry := qry || wtext || E'\n' || 'FROM flat_z';
      wtext := '';
      EXECUTE qry;
      qry := '';
      -- spread the value from the records with update values throughout their respective groups
      -- also create the start and end timestamps using adjacent timestamps. Add one millisecond
      -- to the previous record's timestamp so it's not possible to match both with a BETWEEN.
      -- This is not implausible if a large number of records are updated at the same time in a
      -- shared transaction
      qry := format('DROP TABLE IF EXISTS banded_z;
      CREATE TEMP TABLE banded_z
      AS
      SELECT
        fz.zid
        ,fz.data_id
        ,fz.is_insert
        ,fz.is_current_record
        ,(LAG(fz.dml_timestamp) OVER (PARTITION BY fz.data_id ORDER BY fz.zid)) + (1 * interval %L) timeband_start
        ,fz.dml_timestamp timeband_end'
        ,'1  ms');
      FOR rec IN
        SELECT * FROM ctypes WHERE cname != 'id' ORDER BY cnum
      LOOP
        wtext := wtext || format('
        ,FIRST_VALUE(fz.%I) OVER (PARTITION BY fz.data_id, %I ORDER BY fz.zid DESC) AS %I'
        ,rec.cname
        ,rec.cname || '_group'
        ,rec.cname);
      END LOOP;
      qry := qry || wtext || '
      FROM flat_z fz
      JOIN group_z gz
        ON fz.zid = gz.zid
        AND fz.data_id = gz.data_id';
      wtext := '';
      EXECUTE qry;
      qry := '';
      -- create the actual time series table
      qry := format('DROP TABLE IF EXISTS %I;
      CREATE TEMP TABLE %I
      AS
      SELECT
        data_id
        ,CASE
          WHEN is_current_record AND timeband_start IS NULL THEN timebegin 
          ELSE COALESCE(timeband_start, timebegin)
        END timeband_start
        ,timeband_end'
        ,tablename || '_timeseries'
        ,tablename || '_timeseries');
      FOR rec IN
        SELECT * FROM ctypes WHERE cname != 'id' ORDER BY cnum
      LOOP
        wtext := wtext || format('
        ,%I'
        ,rec.cname);
      END LOOP;
      qry := qry || wtext || '
      FROM banded_z
      CROSS JOIN timeband
      WHERE NOT is_insert';
      wtext := '';
      EXECUTE qry;
      END
      $$
      ;
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `

      -- Create GoalFieldResponses_timeseries
    
      SELECT create_timeseries_from_audit_log('GoalFieldResponses');

      -- Pull the data necessary to create an ARGFR from the historical
      -- state of the associated GFR. If there is a historical state, use
      -- it, if not, use the root cause currently on the goal. If there's
      -- still no root cause, do nothing.
      DROP TABLE IF EXISTS argfrs_to_insert;
      CREATE TEMP TABLE argfrs_to_insert
      AS
      SELECT
        arg.id argid,
        gfrt."goalId" gid,
        gfrt.data_id gfrid,
        COALESCE(gfrt."goalTemplateFieldPromptId", gfr."goalTemplateFieldPromptId") "goalTemplateFieldPromptId",
        COALESCE(gfrt.response, gfr.response) response
      FROM "ActivityReports" ar
      JOIN "ActivityReportGoals" arg
        ON ar.id = arg."activityReportId"
      JOIN "Goals" g
        ON arg."goalId" = g.id
      LEFT JOIN "GoalFieldResponses_timeseries" gfrt
        ON arg."goalId" = gfrt."goalId"
        AND ar."approvedAt" BETWEEN timeband_start AND timeband_end
      LEFT JOIN "ActivityReportGoalFieldResponses" argfr
        ON arg.id = argfr."activityReportGoalId"
      LEFT JOIN "GoalFieldResponses" gfr
        ON gfr."goalId" = arg."goalId"
      WHERE argfr.id IS NULL
        AND g."goalTemplateId" = 19017
        AND (gfrt.response IS NOT NULL OR gfr.response IS NOT NULL)
      ;
      
      -- Insert the records
      INSERT INTO "ActivityReportGoalFieldResponses" (
        "activityReportGoalId",
        "goalTemplateFieldPromptId",
        response,
        "createdAt",
        "updatedAt"
      )
      SELECT
        argid,
        "goalTemplateFieldPromptId",
        response,
        NOW(),
        NOW()
      FROM argfrs_to_insert
      ;
      `,
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await await queryInterface.sequelize.query(
        /* sql */ `
      DROP FUNCTION IF EXISTS create_timeseries_from_audit_log;
      `,
        { transaction }
      )
    })
  },
}
