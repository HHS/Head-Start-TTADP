/*
JSON: {
  "name": "Activity Report Export (flat)",
  "description": {
    "standard": "One row per Activity Report, with associated goals, objectives, topics, resources, next steps, and recipients flattened into labeled columns.",
    "technical": "One row per approved Activity Report, scoped to the passed-in ssdi.activityReportIds. Some columns contain large raw HTML fields, and some contain correlated data for multiple grants, goals, or objectives. All dates/times are US Eastern; approved_at_local is in the report's own approval timezone."
  },
  "output": {
    "defaultName": "activity_report_export",
    "schema": [
      { "columnName": "report_id", "type": "string", "nullable": false, "description": "Region-prefixed report id, e.g. R01-AR-1234." },
      { "columnName": "region", "type": "integer", "nullable": false, "description": "Region id (1-12)." },
      { "columnName": "ar_status", "type": "string", "nullable": false, "description": "calculatedStatus of the report." },
      { "columnName": "start_date", "type": "date", "nullable": true, "description": "Activity start date." },
      { "columnName": "end_date", "type": "date", "nullable": true, "description": "Activity end date." },
      { "columnName": "create_date", "type": "date", "nullable": true, "description": "Report created date (US Eastern)." },
      { "columnName": "approved_date", "type": "date", "nullable": true, "description": "Report approved date." },
      { "columnName": "creator", "type": "string", "nullable": true, "description": "Report author name." },
      { "columnName": "collaborators", "type": "string", "nullable": true, "description": "Collaborator names, newline-separated." },
      { "columnName": "approvers", "type": "string", "nullable": true, "description": "Approver names, newline-separated." },
      { "columnName": "requester", "type": "string", "nullable": true, "description": "Who requested the activity." },
      { "columnName": "program_specialists", "type": "string", "nullable": true, "description": "Program specialist names across the report's grants." },
      { "columnName": "recipient_type", "type": "string", "nullable": true, "description": "activityRecipientType (recipient vs other-entity)." },
      { "columnName": "activity_recipient_name", "type": "string", "nullable": true, "description": "Recipient/other-entity names." },
      { "columnName": "grant_numbers", "type": "string", "nullable": true, "description": "Grant numbers on the report." },
      { "columnName": "grant_cnt", "type": "integer", "nullable": true, "description": "Distinct grants on the report." },
      { "columnName": "programs", "type": "string", "nullable": true, "description": "Program types across the report's grants." },
      { "columnName": "state_codes", "type": "string", "nullable": true, "description": "State codes across the report's grants." },
      { "columnName": "reason", "type": "string", "nullable": true, "description": "Reasons, newline-separated." },
      { "columnName": "target_populations", "type": "string", "nullable": true, "description": "Target populations, newline-separated." },
      { "columnName": "tta_type", "type": "string", "nullable": true, "description": "TTA type(s)." },
      { "columnName": "language", "type": "string", "nullable": true, "description": "Language(s)." },
      { "columnName": "delivery_method", "type": "string", "nullable": true, "description": "Delivery method." },
      { "columnName": "virtual_delivery_type", "type": "string", "nullable": true, "description": "Virtual delivery type." },
      { "columnName": "duration", "type": "number", "nullable": true, "description": "Duration in hours." },
      { "columnName": "participant_roles", "type": "string", "nullable": true, "description": "Participant roles, newline-separated." },
      { "columnName": "num_participants", "type": "integer", "nullable": true, "description": "Number of participants." },
      { "columnName": "attachments", "type": "string", "nullable": true, "description": "Attachment file names." },
      { "columnName": "context", "type": "string", "nullable": true, "description": "Report context (raw HTML; strip at app layer)." },
      { "columnName": "goal_cnt", "type": "integer", "nullable": true, "description": "Distinct goals on the report." },
      { "columnName": "goal_uniq_cnt", "type": "integer", "nullable": true, "description": "Distinct goals by name." },
      { "columnName": "goal_standards", "type": "string", "nullable": true, "description": "gid: standard goal template name (short goal handle), per line; blank for legacy goals." },
      { "columnName": "goal_ids", "type": "string", "nullable": true, "description": "Goal ids, newline-separated." },
      { "columnName": "g_status_on_ar", "type": "string", "nullable": true, "description": "gid: goal status as of AR approval (from ActivityReportGoals), per line." },
      { "columnName": "g_status_now", "type": "string", "nullable": true, "description": "gid: goal's current status (from Goals), per line." },
      { "columnName": "goal_standard_ohs", "type": "string", "nullable": true, "description": "id: whether goal uses a curated/standard OHS template." },
      { "columnName": "fei_root_causes", "type": "string", "nullable": true, "description": "id: FEI root causes." },
      { "columnName": "goal_sources", "type": "string", "nullable": true, "description": "id: goal source." },
      { "columnName": "goal_created_via", "type": "string", "nullable": true, "description": "id: how the goal was created." },
      { "columnName": "obj_cnt", "type": "integer", "nullable": true, "description": "Distinct objectives on the report." },
      { "columnName": "obj_uniq_cnt", "type": "integer", "nullable": true, "description": "Distinct objectives by title." },
      { "columnName": "obj_titles_short", "type": "string", "nullable": true, "description": "goalId.objId: first ~100 chars of objective title, HTML stripped, per line." },
      { "columnName": "o_status_on_ar", "type": "string", "nullable": true, "description": "goalId.objId: objective status as of AR approval (from ActivityReportObjectives), per line." },
      { "columnName": "o_status_now", "type": "string", "nullable": true, "description": "goalId.objId: objective's current status (from Objectives), per line." },
      { "columnName": "objective_topics", "type": "string", "nullable": true, "description": "goalId.objId: topics, per line." },
      { "columnName": "objective_courses", "type": "string", "nullable": true, "description": "goalId.objId: courses, per line." },
      { "columnName": "objective_resource_links", "type": "string", "nullable": true, "description": "goalId.objId: resource urls, per line." },
      { "columnName": "objective_non_resource_links", "type": "string", "nullable": true, "description": "goalId.objId: attached file names, per line." },
      { "columnName": "objective_tta_short", "type": "string", "nullable": true, "description": "goalId.objId: first ~100 chars of TTA provided, HTML stripped (clean locator, not byte-exact)." },
      { "columnName": "objective_support_types", "type": "string", "nullable": true, "description": "goalId.objId: support type, per line." },
      { "columnName": "specialist_next_steps", "type": "string", "nullable": true, "description": "Specialist next steps, newline-separated." },
      { "columnName": "specialist_next_steps_dates", "type": "string", "nullable": true, "description": "Specialist next step complete dates." },
      { "columnName": "recipient_next_steps", "type": "string", "nullable": true, "description": "Recipient next steps, newline-separated." },
      { "columnName": "recipient_next_steps_dates", "type": "string", "nullable": true, "description": "Recipient next step complete dates." },
      { "columnName": "submitted_date", "type": "date", "nullable": true, "description": "Report submitted date." },
      { "columnName": "last_saved", "type": "date", "nullable": true, "description": "Report last-saved date." },
      { "columnName": "legacy_eclkc_resources", "type": "string", "nullable": true, "description": "Legacy ECLKC resources used." },
      { "columnName": "legacy_non_eclkc_resources", "type": "string", "nullable": true, "description": "Legacy non-ECLKC resources used." },
      { "columnName": "goals", "type": "string", "nullable": true, "description": "gid: full goal name, per line (bulky; kept at the end of the row)." },
      { "columnName": "obj_titles", "type": "string", "nullable": true, "description": "goalId.objId: full objective title, per line (bulky; kept at the end of the row)." },
      { "columnName": "objective_tta_provided", "type": "string", "nullable": true, "description": "goalId.objId: full TTA provided (raw HTML; strip at app layer)." },
      { "columnName": "created_at_et", "type": "timestamp", "nullable": true, "description": "Full report creation timestamp, US Eastern (for fine-grained comparison; also the precise sort key behind create_date)." },
      { "columnName": "approved_at_et", "type": "timestamp", "nullable": true, "description": "Full report approval timestamp, US Eastern (also the precise sort key behind approved_date)." },
      { "columnName": "approved_at_local", "type": "timestamp", "nullable": true, "description": "Full report approval timestamp in the report's own approval timezone (approvedAtTimezone); blank when not recorded." }
    ],
    "sorting": {
      "default": [ { "name": "region", "order": "ASC" } ],
      "supportsCustomSorting": true,
      "columns": [
        "region", "report_id", "activity_recipient_name", "creator", "collaborators",
        "start_date", "create_date", "last_saved", "approved_date"
      ]
    }
  },
  "filters": [
    {
      "name": "activityReportIds",
      "type": "integer[]",
      "display": "Activity Report IDs",
      "description": "The set of Activity Report ids to export. Resolved upstream from the AR Landing filters; when omitted the query returns all approved reports (subject to region policy)."
    },
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "Region ids (1-12). Always injected from the user's region policy; enforced here as defense in depth."
    }
  ]
}
*/
-- Activity Report flat export: one row per approved AR, scoped to the AR id list
-- (ssdi.activityReportIds) resolved upstream from the AR Landing filters. Each objective's
-- child relations (topics/courses/resources/files) are pre-aggregated per
-- ActivityReportObjective id before joining, so the per-objective rollup does not fan out
-- across those tables. objective_tta_short strips HTML over LEFT(ttaProvided, 250) with a
-- trailing partial-tag strip; objective_tta_provided and context are raw HTML, stripped at
-- the app layer.
-- Dates/timestamps are rendered in US Eastern (a reasonable default — there's no per-user
-- timezone). The session tz is set here so ::date / ::timestamp casts come out Eastern.
SET LOCAL TIME ZONE 'America/New_York';

-- @stream-final-select
-- Marks the setup/final-SELECT split for the streaming executor; inert for manual runs.
WITH ars AS MATERIALIZED (
SELECT
  ar.id arid,
  'R' || LPAD("regionId"::text, 2, '0') || '-AR-' || ar.id report_id,
  ar."regionId" region,
  ar."calculatedStatus" ar_status,
  u.name creator,
  ar.requester,
  ar."activityRecipientType" recipient_type,
  ARRAY_TO_STRING(ar."ttaType", E'\n') tta_type,
  ARRAY_TO_STRING(ar.reason, E'\n') reason,
  ARRAY_TO_STRING(ar."targetPopulations", E'\n') target_populations,
  ARRAY_TO_STRING(ar.language, E'\n') language,
  ar."deliveryMethod" delivery_method,
  ar."virtualDeliveryType" virtual_delivery_type,
  ar.duration,
  ARRAY_TO_STRING(ar.participants, E'\n') participant_roles,
  ar."numberOfParticipants" num_participants,
  ar.context,
  ARRAY_TO_STRING(ar."ECLKCResourcesUsed", E'\n') legacy_eclkc_resources,
  ARRAY_TO_STRING(ar."nonECLKCResourcesUsed", E'\n') legacy_non_eclkc_resources,
  ar."startDate" start_date,
  ar."endDate" end_date,
  ar."createdAt"::date create_date,
  ar."submittedDate" submitted_date,
  ar."approvedAt"::date approved_date,
  ar."updatedAt"::date last_saved,
  ar."createdAt"::timestamp created_at_et,
  ar."approvedAt"::timestamp approved_at_et,
  ar."approvedAt" AT TIME ZONE ar."approvedAtTimezone" approved_at_local,
  -- precise updatedAt, used only as the sort key for last_saved (not output)
  ar."updatedAt"::timestamp updated_at_et
FROM "ActivityReports" ar
JOIN "Users" u
  ON ar."userId" = u.id
WHERE ar."calculatedStatus" = 'approved'
  -- Narrowing point: AR id list resolved upstream from the Landing filters.
  AND (NULLIF(current_setting('ssdi.activityReportIds', true), '') IS NULL
    OR ar.id IN (
      SELECT value::integer
      FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.activityReportIds', true), ''), '[]')::json) AS value
    ))
  -- Region policy is always injected by SSDI; enforce here as defense in depth.
  AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
    OR ar."regionId" IN (
      SELECT value::integer
      FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''), '[]')::json) AS value
    ))
),
grants AS MATERIALIZED (
-- per-grant rollup; broken out in case we want to drill into grants later
SELECT
  gr.id grid,
  r.name gr_recipient,
  gr.number gr_number,
  gr."programSpecialistName" gr_program_specialist,
  COALESCE(r.name || ' - ', '') || gr.number || ' - ' || gr."recipientId" gr_recipient_info,
  gr."stateCode" gr_state_code,
  STRING_AGG(DISTINCT p."programType", ', ') gr_programs
FROM ars
JOIN "ActivityRecipients" are ON arid = are."activityReportId"
JOIN "Grants" gr ON are."grantId" = gr.id
LEFT JOIN "Recipients" r ON gr."recipientId" = r.id
LEFT JOIN "Programs" p ON gr.id = p."grantId"
GROUP BY 1,2,3,4,5,6
),
recipients AS MATERIALIZED (
-- one row per ar covering grant recipients and other entities
SELECT
  arid r_arid,
  STRING_AGG(DISTINCT COALESCE(gr_recipient, oe.name), ', ') activity_recipient_name,
  STRING_AGG(DISTINCT gr_number, ', ') grant_numbers,
  COUNT(DISTINCT are."grantId") grant_cnt,
  STRING_AGG(DISTINCT gr_programs, ', ') programs,
  STRING_AGG(DISTINCT gr_program_specialist, ', ') program_specialists,
  STRING_AGG(DISTINCT gr_recipient_info, E'\n') recipient_info,
  STRING_AGG(DISTINCT gr_state_code, ', ') state_codes
FROM ars
JOIN "ActivityRecipients" are ON arid = are."activityReportId"
LEFT JOIN grants ON are."grantId" = grid
LEFT JOIN "OtherEntities" oe ON are."otherEntityId" = oe.id
GROUP BY 1
),
collaborators AS MATERIALIZED (
SELECT
  arc."activityReportId" c_arid,
  STRING_AGG(u.name, E'\n' ORDER BY u.name) collaborators
FROM ars
JOIN "ActivityReportCollaborators" arc ON arid = arc."activityReportId"
JOIN "Users" u ON arc."userId" = u.id
GROUP BY 1
),
approvers AS MATERIALIZED (
SELECT
  ara."activityReportId" a_arid,
  STRING_AGG(u.name, E'\n' ORDER BY u.name) approvers
FROM ars
JOIN "ActivityReportApprovers" ara ON arid = ara."activityReportId"
JOIN "Users" u ON ara."userId" = u.id
GROUP BY 1
),
ar_attachments AS MATERIALIZED (
SELECT
  arf."activityReportId" att_arid,
  STRING_AGG(f."originalFileName", E'\n' ORDER BY f."originalFileName") attachments
FROM ars
JOIN "ActivityReportFiles" arf ON arid = arf."activityReportId"
JOIN "Files" f ON arf."fileId" = f.id
GROUP BY 1
),
next_steps AS MATERIALIZED (
SELECT
  ns."activityReportId" ns_arid,
  STRING_AGG(ns.note, E'\n' ORDER BY ns.id) FILTER (WHERE ns."noteType" = 'SPECIALIST') specialist_next_steps,
  STRING_AGG(ns."completeDate"::text, E'\n' ORDER BY ns.id) FILTER (WHERE ns."noteType" = 'SPECIALIST') specialist_next_steps_dates,
  STRING_AGG(ns.note, E'\n' ORDER BY ns.id) FILTER (WHERE ns."noteType" = 'RECIPIENT') recipient_next_steps,
  STRING_AGG(ns."completeDate"::text, E'\n' ORDER BY ns.id) FILTER (WHERE ns."noteType" = 'RECIPIENT') recipient_next_steps_dates
FROM ars
JOIN "NextSteps" ns ON arid = ns."activityReportId"
GROUP BY 1
),
goal_detail AS MATERIALIZED (
-- one row per ar per goal; status from ActivityReportGoals reflects the state
-- at ar-write time rather than the goal's current status
SELECT
  arid g_arid,
  arg."goalId" gid,
  arg.name goal,
  arg.status g_status,
  g.status g_status_now,
  gt."creationMethod" = 'Curated' g_is_curated,
  gt.standard g_standard,
  g.source::text g_source,
  g."createdVia"::text g_created_via,
  STRING_AGG(root_cause, ', ' ORDER BY root_cause) fei_root_causes
FROM ars
LEFT JOIN "ActivityReportGoals" arg ON arid = arg."activityReportId"
LEFT JOIN "Goals" g ON arg."goalId" = g.id
LEFT JOIN "GoalTemplates" gt ON g."goalTemplateId" = gt.id
JOIN "GoalTemplateFieldPrompts" gtfp ON gtfp.title = 'FEI root cause'
LEFT JOIN "ActivityReportGoalFieldResponses" argfr
  ON argfr."activityReportGoalId" = arg.id AND argfr."goalTemplateFieldPromptId" = gtfp.id
LEFT JOIN LATERAL UNNEST(argfr.response) root_cause ON TRUE
GROUP BY 1,2,3,4,5,6,7,8,9
),
goals AS MATERIALIZED (
-- pre-aggregate to one row per ar; each line prefixed with gid so columns correlate.
-- goal_uniq_cnt dedupes by name (same standard goal reused across grants).
SELECT
  g_arid,
  COUNT(DISTINCT gid) goal_cnt,
  COUNT(DISTINCT goal) goal_uniq_cnt,
  STRING_AGG(gid::text || ': ' || COALESCE(g_standard, ''), E'\n' ORDER BY gid) goal_standards,
  STRING_AGG(gid::text, E'\n' ORDER BY gid) goal_ids,
  STRING_AGG(gid::text || ': ' || COALESCE(goal, ''), E'\n' ORDER BY gid) goals,
  STRING_AGG(gid::text || ': ' || COALESCE(g_status, ''), E'\n' ORDER BY gid) g_status_on_ar,
  STRING_AGG(gid::text || ': ' || COALESCE(g_status_now, ''), E'\n' ORDER BY gid) g_status_now,
  STRING_AGG(gid::text || ': ' || CASE g_is_curated WHEN TRUE THEN 'Yes' ELSE 'No' END, E'\n' ORDER BY gid) goal_standard_ohs,
  STRING_AGG(gid::text || ': ' || fei_root_causes, E'\n' ORDER BY gid) fei_root_causes,
  STRING_AGG(gid::text || ': ' || g_source, E'\n' ORDER BY gid) goal_sources,
  STRING_AGG(gid::text || ': ' || COALESCE(g_created_via, ''), E'\n' ORDER BY gid) goal_created_via
FROM goal_detail
GROUP BY 1
),
-- Pre-aggregate each objective child relation per ActivityReportObjective id, so
-- objective_detail joins single-row-per-ARO results instead of fanning out across tables.
obj_topics AS MATERIALIZED (
  SELECT arot."activityReportObjectiveId" aroid, STRING_AGG(DISTINCT t.name, '; ' ORDER BY t.name) v
  FROM "ActivityReportObjectiveTopics" arot JOIN "Topics" t ON arot."topicId" = t.id GROUP BY 1
),
obj_courses AS MATERIALIZED (
  SELECT aroc."activityReportObjectiveId" aroid, STRING_AGG(DISTINCT c.name, ', ') v
  FROM "ActivityReportObjectiveCourses" aroc JOIN "Courses" c ON aroc."courseId" = c.id GROUP BY 1
),
obj_resources AS MATERIALIZED (
  SELECT aror."activityReportObjectiveId" aroid, STRING_AGG(DISTINCT res.url, E'\n') v
  FROM "ActivityReportObjectiveResources" aror JOIN "Resources" res ON aror."resourceId" = res.id GROUP BY 1
),
obj_files AS MATERIALIZED (
  SELECT arof."activityReportObjectiveId" aroid, STRING_AGG(DISTINCT f."originalFileName", E'\n') v
  FROM "ActivityReportObjectiveFiles" arof JOIN "Files" f ON arof."fileId" = f.id GROUP BY 1
),
objective_detail AS MATERIALIZED (
-- one row per ar per objective; goalId comes from Objectives (ARO does not carry it).
-- status/title/ttaProvided reflect the cached state at ar-write time.
SELECT
  aro."activityReportId" o_arid,
  o."goalId" o_gid,
  aro.id oid,
  aro.title obj_title,
  aro.status obj_status,
  o.status obj_status_now,
  aro."ttaProvided" obj_tta_provided,
  aro."supportType" obj_support_type,
  tp.v obj_topics,
  cs.v obj_courses,
  rl.v obj_resource_links,
  fl.v obj_non_resource_links
FROM ars
JOIN "ActivityReportObjectives" aro ON arid = aro."activityReportId"
LEFT JOIN "Objectives" o ON aro."objectiveId" = o.id
LEFT JOIN obj_topics tp ON aro.id = tp.aroid
LEFT JOIN obj_courses cs ON aro.id = cs.aroid
LEFT JOIN obj_resources rl ON aro.id = rl.aroid
LEFT JOIN obj_files fl ON aro.id = fl.aroid
),
objectives AS MATERIALIZED (
-- pre-aggregate to one row per ar; each line prefixed with goalId.objId so objectives
-- trace to their parent goal. Objectives with no goal (other-entity) use 'other-entity'.
-- objective_tta_short strips HTML over LEFT(obj_tta_provided, 250) plus a trailing
-- partial-tag strip, so the preview stays clean without regexing the full HTML.
SELECT
  o_arid,
  COUNT(DISTINCT oid) obj_cnt,
  COUNT(DISTINCT obj_title) obj_uniq_cnt,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || LEFT(TRIM(regexp_replace(regexp_replace(regexp_replace(LEFT(obj_title, 250), '<[^>]+>', '', 'g'), '<[^>]*$', '', 'g'), '\s+', ' ', 'g')), 100), E'\n' ORDER BY o_gid, oid) obj_titles_short,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || COALESCE(obj_title, ''), E'\n' ORDER BY o_gid, oid) obj_titles,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || COALESCE(obj_status, ''), E'\n' ORDER BY o_gid, oid) o_status_on_ar,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || COALESCE(obj_status_now, ''), E'\n' ORDER BY o_gid, oid) o_status_now,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || obj_topics, E'\n' ORDER BY o_gid, oid) objective_topics,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || obj_courses, E'\n' ORDER BY o_gid, oid) objective_courses,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || obj_resource_links, E'\n' ORDER BY o_gid, oid) objective_resource_links,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || obj_non_resource_links, E'\n' ORDER BY o_gid, oid) objective_non_resource_links,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || LEFT(TRIM(regexp_replace(regexp_replace(regexp_replace(LEFT(obj_tta_provided, 250), '<[^>]+>', '', 'g'), '<[^>]*$', '', 'g'), '\s+', ' ', 'g')), 100), E'\n' ORDER BY o_gid, oid) objective_tta_short,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || obj_support_type, E'\n' ORDER BY o_gid, oid) objective_support_types,
  STRING_AGG(COALESCE(o_gid::text, 'other-entity') || '.' || oid::text || ': ' || obj_tta_provided, E'\n' ORDER BY o_gid, oid) objective_tta_provided
FROM objective_detail
GROUP BY 1
)
SELECT
  report_id,
  region,
  ar_status,
  start_date,
  end_date,
  create_date,
  approved_date,
  creator,
  collaborators,
  approvers,
  requester,
  program_specialists,
  recipient_type,
  activity_recipient_name,
  grant_numbers,
  grant_cnt,
  programs,
  state_codes,
  reason,
  target_populations,
  tta_type,
  language,
  delivery_method,
  virtual_delivery_type,
  duration,
  participant_roles,
  num_participants,
  attachments,
  context,
  goal_cnt,
  goal_uniq_cnt,
  goal_standards,
  goal_ids,
  g_status_on_ar,
  g_status_now,
  goal_standard_ohs,
  fei_root_causes,
  goal_sources,
  goal_created_via,
  obj_cnt,
  obj_uniq_cnt,
  obj_titles_short,
  o_status_on_ar,
  o_status_now,
  objective_topics,
  objective_courses,
  objective_resource_links,
  objective_non_resource_links,
  objective_tta_short,
  objective_support_types,
  specialist_next_steps,
  specialist_next_steps_dates,
  recipient_next_steps,
  recipient_next_steps_dates,
  submitted_date,
  last_saved,
  legacy_eclkc_resources,
  legacy_non_eclkc_resources,
  -- Full free-text columns kept at the end; the short handles above cover common use
  goals,
  obj_titles,
  objective_tta_provided,
  -- Full ET timestamps for fine-grained comparison
  created_at_et,
  approved_at_et,
  approved_at_local
FROM ars
JOIN recipients ON arid = r_arid
LEFT JOIN collaborators ON arid = c_arid
LEFT JOIN approvers ON arid = a_arid
LEFT JOIN ar_attachments ON arid = att_arid
LEFT JOIN next_steps ON arid = ns_arid
LEFT JOIN goals ON arid = g_arid
LEFT JOIN objectives ON arid = o_arid
-- Dynamic sort, applied in SQL from ssdi.sortOrder.* (set by the export handler) so the
-- app only passes a column + direction. Each sortable column gets an ASC and a DESC key;
-- only the selected one is non-null, the rest are no-ops. Defaults to region ASC; arid is
-- the stable tiebreaker. Keep this list in sync with the handler's allowed sort columns.
-- Date-labeled sorts key on the precise *_at_et timestamps for reliable ordering.
CROSS JOIN (
  SELECT
    COALESCE(NULLIF(current_setting('ssdi.sortOrder.column', true), ''), '["region"]')::json ->> 0 AS col,
    UPPER(COALESCE(NULLIF(current_setting('ssdi.sortOrder.direction', true), ''), '["ASC"]')::json ->> 0) AS dir
) sp
ORDER BY
  CASE WHEN sp.col = 'region'                  AND sp.dir <> 'DESC' THEN region                  END ASC  NULLS LAST,
  CASE WHEN sp.col = 'region'                  AND sp.dir =  'DESC' THEN region                  END DESC NULLS LAST,
  CASE WHEN sp.col = 'report_id'               AND sp.dir <> 'DESC' THEN report_id               END ASC  NULLS LAST,
  CASE WHEN sp.col = 'report_id'               AND sp.dir =  'DESC' THEN report_id               END DESC NULLS LAST,
  CASE WHEN sp.col = 'activity_recipient_name' AND sp.dir <> 'DESC' THEN activity_recipient_name END ASC  NULLS LAST,
  CASE WHEN sp.col = 'activity_recipient_name' AND sp.dir =  'DESC' THEN activity_recipient_name END DESC NULLS LAST,
  CASE WHEN sp.col = 'start_date'              AND sp.dir <> 'DESC' THEN start_date              END ASC  NULLS LAST,
  CASE WHEN sp.col = 'start_date'              AND sp.dir =  'DESC' THEN start_date              END DESC NULLS LAST,
  CASE WHEN sp.col = 'creator'                 AND sp.dir <> 'DESC' THEN creator                 END ASC  NULLS LAST,
  CASE WHEN sp.col = 'creator'                 AND sp.dir =  'DESC' THEN creator                 END DESC NULLS LAST,
  CASE WHEN sp.col = 'create_date'             AND sp.dir <> 'DESC' THEN created_at_et            END ASC  NULLS LAST,
  CASE WHEN sp.col = 'create_date'             AND sp.dir =  'DESC' THEN created_at_et            END DESC NULLS LAST,
  CASE WHEN sp.col = 'collaborators'           AND sp.dir <> 'DESC' THEN collaborators           END ASC  NULLS LAST,
  CASE WHEN sp.col = 'collaborators'           AND sp.dir =  'DESC' THEN collaborators           END DESC NULLS LAST,
  CASE WHEN sp.col = 'last_saved'              AND sp.dir <> 'DESC' THEN updated_at_et            END ASC  NULLS LAST,
  CASE WHEN sp.col = 'last_saved'              AND sp.dir =  'DESC' THEN updated_at_et            END DESC NULLS LAST,
  CASE WHEN sp.col = 'approved_date'           AND sp.dir <> 'DESC' THEN approved_at_et           END ASC  NULLS LAST,
  CASE WHEN sp.col = 'approved_date'           AND sp.dir =  'DESC' THEN approved_at_et           END DESC NULLS LAST,
  arid;
