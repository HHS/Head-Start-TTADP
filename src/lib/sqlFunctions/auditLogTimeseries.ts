import type { Transaction } from 'sequelize';
import type { sequelize } from '../../models';

/**
 * Creates or replaces the create_timeseries_from_audit_log(tablename) stored procedure.
 *
 * This is the canonical definition of that function, originally shipped in the
 * 20240607000000-fix-timeseries.js migration. It's exported so the monitoring
 * validation pipeline can call this directly before relying on the function each
 * run - ensuring fresh environments and CI always get the current definition
 * without any SQL being duplicated. See monitoringValidationStaging.ts for the
 * pipeline call site and docs/monitoring-data-validation.md for how the resulting
 * <table>_timeseries temp tables get used.
 *
 * A new migration that calls this function is only needed if you need existing
 * deployed environments to pick up a function change before the next pipeline run.
 *
 * Usage: SELECT create_timeseries_from_audit_log('<tablename>')
 * Example: SELECT create_timeseries_from_audit_log('Goals') creates Goals_timeseries
 *
 * Resulting tables are like their source tables except:
 * - id becomes data_id and is only unique when combined with the timeband
 * - timeband_start/timeband_end bound the period a record held that state.
 *   The live/current row's timeband_end is 'infinity', not wall-clock NOW() - a
 *   stable open-ended sentinel, so re-running this doesn't shift past rows' values.
 * - enums are converted to text (enums can change over time; historical data may
 *   not fit current enum values)
 *
 * Each row is the record's full state during a bounded period of time; a new
 * period begins on any update to the record (as reflected by an audit event),
 * not only an update to the specific column you care about.
 *
 * NOTE: If this file is ever moved or renamed, update the require() path in any
 * migration that imports it (currently 20240607000000-fix-timeseries.js predates
 * this file and still carries its own copy of the function body - this is the
 * canonical copy going forward).
 */
export const recreateTimeseriesFunction = async (
  queryInterface: ReturnType<typeof sequelize.getQueryInterface>,
  transaction: Transaction
) => {
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
    -- set up the beginning and end of time. timeend is 'infinity', not NOW() -
    -- a stable sentinel for the still-open current band, so re-running this
    -- doesn't shift the displayed end timestamp of past reconstructions.
    qry := format('DROP TABLE IF EXISTS timeband;
    CREATE TEMP TABLE timeband
    AS
    SELECT
      %L::timestamp timebegin,
      ''infinity''::timestamptz timeend'
    ,'2020-01-01');
    EXECUTE qry;
    qry := '';
    wtext := '';
    -- assemble flat_z, containing the typed columns with changed data
    -- there will be one record per audit log entry, plus one for the
    -- current value
    -- This assumes every table has an id column, which the audit log
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
        WHEN rec.ctype = 'ARRAY' AND rec.pgtype::text NOT LIKE '"enum%' THEN
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
        WHEN rec.ctype = 'ARRAY' AND rec.pgtype::text LIKE '"enum%' THEN
          -- As a combinations of both previous cases, arrays of enums need
          -- to be cast to arrays of text.
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
          ,'text[]'
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
        WHEN rec.ctype = 'ARRAY' AND rec.pgtype::text LIKE '"enum%' THEN
          -- For handling enums in arrays, which have the same issue
          wtext := wtext || format('
          ,%I::%s'
          ,rec.cname
          ,'text[]');
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
    -- dml_timestamp is CURRENT_TIMESTAMP in the audit trigger, which Postgres
    -- pins to transaction start - several real changes to one row inside a
    -- single transaction can share an identical raw value. Nudge each row
    -- forward 1ms per its position (by zid) within its data_id, so every
    -- row's dml_timestamp is strictly greater than the previous one - this
    -- is what lets timeband_start below use that ordering directly with no
    -- separate gap added on top. data_id is in the join to disambiguate live
    -- rows added by the UNION ALL above.
    --
    -- Known limitation: this assumes zid order tracks real chronological
    -- order, which isn't airtight (dml_timestamp is each transaction's own
    -- start time, not commit time, so overlapping transactions on the same
    -- row could commit, and so get their zid, out of start-time order). In
    -- practice this needs the same entity to appear more than once within one
    -- source file with genuinely differing state between those entries (a true
    -- duplicate entry changes nothing to miscount) and have those writes land
    -- as overlapping transactions - this app's sequential, one-row-per-entity-
    -- per-file import (src/lib/importSystem/processRecords.ts,
    -- processFilesFromZip.ts) doesn't produce that.
    UPDATE flat_z fz
    SET dml_timestamp = fz.dml_timestamp + ((sub.rn - 1) * interval '1 millisecond')
    FROM (
      SELECT zid, data_id, ROW_NUMBER() OVER (PARTITION BY data_id ORDER BY zid) rn
      FROM flat_z
    ) sub
    WHERE fz.zid = sub.zid
      AND fz.data_id = sub.data_id;
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
    -- also create the start and end timestamps using adjacent timestamps. No extra gap is
    -- added here - the de-duplication above already guarantees each row's dml_timestamp is
    -- strictly greater than the previous one, so a band's start (the previous row's value)
    -- can never equal its own end (this row's value).
    qry := 'DROP TABLE IF EXISTS banded_z;
    CREATE TEMP TABLE banded_z
    AS
    SELECT
      fz.zid
      ,fz.data_id
      ,fz.is_insert
      ,fz.is_current_record
      ,(LAG(fz.dml_timestamp) OVER (PARTITION BY fz.data_id ORDER BY fz.zid)) timeband_start
      ,fz.dml_timestamp timeband_end';
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
  );
};

export default recreateTimeseriesFunction;
