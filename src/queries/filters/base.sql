/*
JSON: {
  "type": "filters"
  "name": "base",
  "description": {
    "standard": "Generates temp tables used in filter process.",
    "technical": "Generates temp tables used in filter process."
  },
  "dependancies": [
  ],
  "filters": [
  ]
}
*/
DO $$
DECLARE
BEGIN
---------------------------------------------------------------------------------------------------
-- table to log each step of the process and how the result set is affected
  DROP TABLE IF EXISTS process_log;
  CREATE TEMP TABLE IF NOT EXISTS process_log(
    action TEXT,
    record_cnt int,
    occured_at TIMESTAMP DEFAULT NOW()
  );
---------------------------------------------------------------------------------------------------
-- table to record the filters that are active on the result set
  DROP TABLE IF EXISTS active_filters;
  CREATE TEMP TABLE IF NOT EXISTS active_filters(
    name TEXT,
  );
---------------------------------------------------------------------------------------------------
END $$;
