-- Convenience script: exports finding_observations/review_observations (see
-- monitoringAnomalyDetectionViews.ts) to CSV for the data scientist to look
-- at. Run with psql, not as part of any automated process:
--   psql -f src/tools/validation/exportAnomalyDetectionCsvs.sql <connection args>
\copy (SELECT * FROM finding_observations) TO 'finding_observations.csv' WITH (FORMAT csv, HEADER true)
\copy (SELECT * FROM review_observations) TO 'review_observations.csv' WITH (FORMAT csv, HEADER true)
