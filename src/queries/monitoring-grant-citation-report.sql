/**
* @name: Monitoring Grant Citation Report
* @description: Retrieves monitoring report data based on various filters for compliance and audit purposes.
* @defaultOutputName: monitoring_grant_citation_report
* @technicalDescription: This query extracts monitoring report details including region, grant number, report delivery date, finding type, and citations, filtered by several parameters such as report delivery date, review outcomes, review types, finding reported date, and others.
*
* The query results are filterable by the following SSDI flags, which are passed as an array of values:
* - ssdi.regionIds - integer[] - One or more values for 1 through 12
* - ssdi.reportDeliveryDate - date[] - Two dates defining a range for the reportDeliveryDate to be within. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored.
* - ssdi.reviewOutcomes - string[] - One or more review outcomes
* - ssdi.reviewTypes - string[] - One or more review types
* - ssdi.findingReportedDate - date[] - Two dates defining a range for the findingReportedDate to be within. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored.
* - ssdi.findingStatuses - string[] - One or more finding statuses
* - ssdi.findingTypes - string[] - One or more finding types
* - ssdi.citations - string[] - One or more citations
* - ssdi.grantNumbers - string[] - One or more grant numbers
* - ssdi.recipients - string[] - One or more recipient names
* - ssdi.uei - string[] - One or more UEI values
*
* Zero or more SSDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set an SSDI flag:
* SELECT SET_CONFIG('ssdi.reportDeliveryDate', '["2023-01-01", "2023-12-31"]', TRUE);
*/
SELECT DISTINCT
    gr."regionId",
    gr.number,
    mr."reportDeliveryDate",
    mr."reviewType",
    mf."findingType",
    ms."citation"
FROM "Grants" gr
JOIN "Recipients" r
    ON gr."recipientId" = r.id
JOIN "MonitoringReviewGrantees" mrg
    ON gr.number = mrg."grantNumber"
JOIN "MonitoringReviews" mr
    ON mrg."reviewId" = mr."reviewId"
JOIN "MonitoringReviewStatuses" mrs
    ON mr."statusId" = mrs."statusId"
JOIN "MonitoringFindingHistories" mfh
    ON mr."reviewId" = mfh."reviewId"
JOIN "MonitoringFindings" mf
    ON mfh."findingId" = mf."findingId"
JOIN "MonitoringFindingStandards" mfs
    ON mf."findingId" = mfs."findingId"
JOIN "MonitoringStandards" ms
    ON mfs."standardId" = ms."standardId"
JOIN "MonitoringFindingStatuses" mfs2
    ON mf."statusId" = mfs2."statusId"
WHERE mrs.name = 'Complete'
-- Filter for reportDeliveryDate dates between two values if ssdi.reportDeliveryDate is defined
AND (NULLIF(current_setting('ssdi.reportDeliveryDate', true), '') IS NULL
    OR mr."reportDeliveryDate"::date <@ (
        SELECT
            CONCAT(
                '[',
                MIN(value::timestamp),
                ',',
                COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                ')'
            )::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.reportDeliveryDate', true), ''),'[]')::json) AS value
    ))
-- Filter for review outcome if ssdi.reviewOutcomes is defined
AND (NULLIF(current_setting('ssdi.reviewOutcomes', true), '') IS NULL
    OR mr."outcome" in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.reviewOutcomes', true), ''),'[]')::json) AS value
    ))
-- Filter for reviewType if ssdi.reviewTypes is defined
AND (NULLIF(current_setting('ssdi.reviewTypes', true), '') IS NULL
    OR mr."reviewType" in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.reviewTypes', true), ''),'[]')::json) AS value
    ))
-- Filter for finding reportedDate dates between two values if ssdi.findingReportedDate is defined
AND (NULLIF(current_setting('ssdi.findingReportedDate', true), '') IS NULL
    OR mf."reportedDate"::date <@ (
        SELECT
            CONCAT(
                '[',
                MIN(value::timestamp),
                ',',
                COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                ')'
            )::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.findingReportedDate', true), ''),'[]')::json) AS value
    ))
-- Filter for findingStatus if ssdi.findingStatuses is defined
AND (NULLIF(current_setting('ssdi.findingStatuses', true), '') IS NULL
    OR mfs2."name" in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.findingStatuses', true), ''),'[]')::json) AS value
    ))
-- Filter for findingType if ssdi.findingTypes is defined
AND (NULLIF(current_setting('ssdi.findingTypes', true), '') IS NULL
    OR mf."findingType" in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.findingTypes', true), ''),'[]')::json) AS value
    ))
-- Filter for citations if ssdi.citations is defined
AND (NULLIF(current_setting('ssdi.citations', true), '') IS NULL
    OR ms."citation" in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.citations', true), ''),'[]')::json) AS value
    ))
-- Filter for regionIds if ssdi.regionIds is defined
AND (NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
    OR gr."regionId" in (
        SELECT
            value::integer AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.regionIds', true), ''),'[]')::json) AS value
    ))
-- Filter for grantNumbers if ssdi.grantNumbers is defined
AND (NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NULL
    OR gr.number in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumbers', true), ''),'[]')::json) AS value
    ))
-- Filter for recipients if ssdi.recipients is defined
AND (NULLIF(current_setting('ssdi.recipients', true), '') IS NULL
    OR r.name in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipients', true), ''),'[]')::json) AS value
    ))
-- Filter for UEI if ssdi.uei is defined
AND (NULLIF(current_setting('ssdi.uei', true), '') IS NULL
    OR r.uei in (
        SELECT
            value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.uei', true), ''),'[]')::json) AS value
    ))
ORDER BY 1,2,3;
