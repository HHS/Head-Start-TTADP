/**
* This query collects all the communication logs based on several criteria.
*
* The query results are filterable by the SSDI flags. All SSDI flags are passed as an array of values
* The following are the available flags within this script:
* - ssdi.regionIds - one or more values for 1 through 12
* - ssdi.recipients - one or more verbatim recipient names
* - ssdi.users - one or more verbatim user names
* - ssdi.role - one or more verbatim role names
* - ssdi.method - one or more verbatim method names
* - ssdi.communicationDate - two dates defining a range for the communicationDate to be within
* - ssdi.uei - one or more verbatim UEI values
*
* Zero or more SSDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a SSDI flag:
* SELECT SET_CONFIG('ssdi.regionIds','[9]',TRUE);
* SELECT SET_CONFIG('ssdi.communicationDate','["2023-07-01","2024-06-27"]',TRUE);
*/
SELECT
    r.name,
    r.uei,
    u.name "user",
    STRING_AGG(DISTINCT rr.name, ' ') "roles",
    cl."createdAt",
    cl.data ->> 'method' method,
    NULLIF(cl.data ->> 'result', '') result,
    cl.data ->> 'purpose' purpose,
    cl.data ->> 'duration' duration, 
    cl.data ->> 'regionId' region,
    to_date(cl.data ->> 'communicationDate', 'MM/DD/YYYY') "communicationDate",
    cl.data ->> 'pocComplete' "pocComplete",
    (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(cl.data -> 'recipientNextSteps') elem
        WHERE elem != '{"note": "","completeDate": ""}'::jsonb
    ) AS recipientNextSteps,
    (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(cl.data -> 'specialistNextSteps') elem
        WHERE elem != '{"note": "","completeDate": ""}'::jsonb
    ) AS specialistNextSteps,
    NULLIF(array_remove(array_agg(f."originalFileName"), null), '{}') AS filenames
FROM "Recipients" r
JOIN "CommunicationLogs" cl
    ON cl."recipientId" = r.id
JOIN "Users" u
    ON cl."userId" = u.id
JOIN "UserRoles" ur
    ON u.id = ur."userId"
JOIN "Roles" rr
    ON ur."roleId" = rr.id
LEFT JOIN "CommunicationLogFiles" clf
    ON cl.id = clf."communicationLogId"
LEFT JOIN "Files" f
    ON clf."fileId" = f.id
WHERE
-- Filter for regionIds if ssdi.regionIds is defined
(NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
        OR (cl.data ->> 'regionId')::int in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.regionIds', true), ''),'[]')::json) AS value
        ))
AND
-- Filter for communicationDate if ssdi.communicationDate is defined
(NULLIF(current_setting('ssdi.communicationDate', true), '') IS NULL
        OR to_date(cl.data ->> 'communicationDate', 'MM/DD/YYYY') <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.communicationDate', true), ''),'[]')::json) AS value
        ))
AND
-- Filter for recipients if ssdi.recipients is defined
(NULLIF(current_setting('ssdi.recipients', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipients', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for users if ssdi.users is defined
(NULLIF(current_setting('ssdi.users', true), '') IS NULL
      OR u.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.users', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for role if ssdi.role is defined
(NULLIF(current_setting('ssdi.role', true), '') IS NULL
      OR rr.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.role', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for method if ssdi.method is defined
(NULLIF(current_setting('ssdi.method', true), '') IS NULL
      OR cl.data ->> 'method' in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.method', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for UEI if ssdi.uei is defined
(NULLIF(current_setting('ssdi.uei', true), '') IS NULL
      OR r.uei in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.uei', true), ''),'[]')::json) AS value
      ))
AND cl.data -> 'pageState' ->> '1' = 'Complete'
AND cl.data -> 'pageState' ->> '2' = 'Complete'
AND cl.data -> 'pageState' ->> '3' = 'Complete'
GROUP BY 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
ORDER BY 1,11;
