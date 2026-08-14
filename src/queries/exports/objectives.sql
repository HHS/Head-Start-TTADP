/*
JSON: {
  "name": "Objective Export",
  "description": {
    "standard": "One row per objective appearing on the selected Activity Reports, with topics, courses, resources, files, and per-AR TTA aggregated across those reports.",
    "technical": "One row per objective on the selected approved Activity Reports. Topics, courses, resources, files, and per-AR TTA are aggregated across those reports. Some columns contain large raw HTML fields, and some contain correlated data for multiple ARs. Also includes 47 per-topic AR-count columns not listed individually in the schema below."
  },
  "output": {
    "defaultName": "objective_export",
    "schema": [
      { "columnName": "objective_id", "type": "integer", "nullable": false, "description": "Objective id." },
      { "columnName": "short_title", "type": "string", "nullable": true, "description": "First ~100 chars of the title, HTML stripped (locator, not byte-exact)." },
      { "columnName": "objective_status", "type": "string", "nullable": true, "description": "Current objective status." },
      { "columnName": "created_via", "type": "string", "nullable": true, "description": "How the objective was created." },
      { "columnName": "close_suspend_reason", "type": "string", "nullable": true, "description": "Reason on close/suspend." },
      { "columnName": "close_suspend_context", "type": "string", "nullable": true, "description": "Context on close/suspend." },
      { "columnName": "goal_id", "type": "integer", "nullable": true, "description": "Parent goal id (null for other-entity objectives)." },
      { "columnName": "goal_standard", "type": "string", "nullable": true, "description": "Parent goal's standard template name (short goal handle); blank for legacy goals." },
      { "columnName": "goal_status", "type": "string", "nullable": true, "description": "Parent goal status." },
      { "columnName": "recipient", "type": "string", "nullable": true, "description": "Recipient name." },
      { "columnName": "grant_number", "type": "string", "nullable": true, "description": "Grant number." },
      { "columnName": "programs", "type": "string", "nullable": true, "description": "Program types on the grant." },
      { "columnName": "state_code", "type": "string", "nullable": true, "description": "Grant state code." },
      { "columnName": "program_specialist", "type": "string", "nullable": true, "description": "Program specialist name." },
      { "columnName": "other_entity", "type": "string", "nullable": true, "description": "Other-entity name (for non-grant objectives)." },
      { "columnName": "ar_cnt", "type": "integer", "nullable": true, "description": "Distinct approved ARs this objective appears on (within scope)." },
      { "columnName": "report_ids", "type": "string", "nullable": true, "description": "Report ids, newline-separated." },
      { "columnName": "regions", "type": "string", "nullable": true, "description": "arid: region, per line." },
      { "columnName": "ar_start_dates", "type": "string", "nullable": true, "description": "arid: AR start date, per line." },
      { "columnName": "ar_end_dates", "type": "string", "nullable": true, "description": "arid: AR end date, per line." },
      { "columnName": "ar_create_dates", "type": "string", "nullable": true, "description": "arid: AR created date (US Eastern), per line." },
      { "columnName": "ar_approved_dates", "type": "string", "nullable": true, "description": "arid: AR approved date (US Eastern), per line." },
      { "columnName": "tta_short", "type": "string", "nullable": true, "description": "arid: first ~100 chars of TTA provided, HTML stripped (locator)." },
      { "columnName": "support_types", "type": "string", "nullable": true, "description": "arid: support type, per line." },
      { "columnName": "topics", "type": "string", "nullable": true, "description": "arid: topic name, per line." },
      { "columnName": "courses", "type": "string", "nullable": true, "description": "arid: course name, per line." },
      { "columnName": "resource_links", "type": "string", "nullable": true, "description": "arid: resource url, per line." },
      { "columnName": "non_resource_links", "type": "string", "nullable": true, "description": "arid: attached file name, per line." },
      { "columnName": "first_not_started_at", "type": "date", "nullable": true, "description": "Date first entered Not Started (US Eastern)." },
      { "columnName": "last_not_started_at", "type": "date", "nullable": true, "description": "Most recent Not Started." },
      { "columnName": "first_in_progress_at", "type": "date", "nullable": true, "description": "First time entered In Progress." },
      { "columnName": "last_in_progress_at", "type": "date", "nullable": true, "description": "Most recent In Progress." },
      { "columnName": "first_suspended_at", "type": "date", "nullable": true, "description": "First time suspended." },
      { "columnName": "last_suspended_at", "type": "date", "nullable": true, "description": "Most recent suspended." },
      { "columnName": "first_complete_at", "type": "date", "nullable": true, "description": "First time completed." },
      { "columnName": "last_complete_at", "type": "date", "nullable": true, "description": "Most recent completed." },
      { "columnName": "full_title", "type": "string", "nullable": true, "description": "Full objective title (raw HTML; strip at app layer)." },
      { "columnName": "tta_provided", "type": "string", "nullable": true, "description": "arid: full TTA provided (raw HTML; strip at app layer)." },
      { "columnName": "goal", "type": "string", "nullable": true, "description": "Full parent goal name (bulky; kept at the end of the row)." }
    ],
    "sorting": {
      "default": [ { "name": "objective_id", "order": "DESC" } ],
      "supportsCustomSorting": true,
      "columns": [ "objective_id", "objective_status", "recipient", "grant_number" ]
    }
  },
  "filters": [
    {
      "name": "activityReportIds",
      "type": "integer[]",
      "display": "Activity Report IDs",
      "description": "The set of Activity Report ids to scope objectives to. Resolved upstream from the AR Landing filters; when omitted all approved reports are used (subject to region policy)."
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
-- One row per objective appearing on the in-scope approved ARs. Objectives are scoped to
-- the AR id list (ssdi.activityReportIds) resolved upstream from the AR Landing filters.
-- Topics, courses, resources, and files are unioned across those ARs. AR status is
-- verified via ActivityReports.calculatedStatus = 'approved', not via flag columns like
-- onApprovedAR.
-- Intermediate results are built as CTAS temp tables (DROP TABLE IF EXISTS precedes each
-- CREATE, since temp tables are session-scoped and connections are pooled) so the planner
-- has real cardinality and chooses hash/merge joins over the id-list narrowing.
-- short_title/tta_short are HTML-stripped previews; full_title/tta_provided are raw HTML,
-- stripped at the app layer.
-- Excludes: onAR, onApprovedAR, mapsToParentObjectiveId, createdViaActivityReportId.
-- TODO: wire ORDER BY to ssdi.sortOrder.* once dynamic sorting is added.
-- All dates are US Eastern (a reasonable default — there's no per-user timezone).
SET LOCAL TIME ZONE 'America/New_York';
DROP TABLE IF EXISTS approved_ars;
CREATE TEMP TABLE approved_ars
AS
-- approved ARs limited to ssdi.activityReportIds; drives which objectives qualify and
-- feeds every downstream temp table.
SELECT
  ar.id arid,
  'R' || LPAD("regionId"::text, 2, '0') || '-AR-' || ar.id report_id,
  ar."regionId" region,
  ar."startDate" start_date,
  ar."endDate" end_date,
  ar."createdAt"::date create_date,
  ar."approvedAt"::date approved_date
FROM "ActivityReports" ar
WHERE ar."calculatedStatus" = 'approved'
  -- narrowing: AR id list resolved upstream from the Landing filters
  AND (NULLIF(current_setting('ssdi.activityReportIds', true), '') IS NULL
    OR ar.id IN (
      SELECT value::integer
      FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.activityReportIds', true), ''), '[]')::json) AS value
    ))
  -- region policy is always injected by SSDI; enforce here as defense in depth
  AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
    OR ar."regionId" IN (
      SELECT value::integer
      FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''), '[]')::json) AS value
    ))
;
DROP TABLE IF EXISTS objective_ars;
CREATE TEMP TABLE objective_ars
AS
-- one row per (objective, ar) pair on an approved ar
SELECT
  aro."objectiveId" obj_id,
  aro.id aroid,
  aa.arid,
  aa.report_id,
  aa.region,
  aa.start_date,
  aa.end_date,
  aa.create_date,
  aa.approved_date,
  aro."ttaProvided" tta_provided,
  aro."supportType" support_type
FROM "ActivityReportObjectives" aro
JOIN approved_ars aa
  ON aro."activityReportId" = aa.arid
;
DROP TABLE IF EXISTS goal_context;
CREATE TEMP TABLE goal_context
AS
-- goal, grant, and recipient info for objectives that have a goal;
-- produces one row per objective since each objective has at most one goal
SELECT
  o.id obj_id,
  g.id gid,
  g.name goal,
  gt.standard goal_standard,
  g.status goal_status,
  r.name recipient,
  gr.number grant_number,
  gr."stateCode" state_code,
  gr."programSpecialistName" program_specialist,
  STRING_AGG(DISTINCT p."programType", ', ') programs
FROM "Objectives" o
JOIN objective_ars oa
  ON o.id = oa.obj_id
JOIN "Goals" g
  ON o."goalId" = g.id
LEFT JOIN "GoalTemplates" gt
  ON g."goalTemplateId" = gt.id
JOIN "Grants" gr
  ON g."grantId" = gr.id
LEFT JOIN "Recipients" r
  ON gr."recipientId" = r.id
LEFT JOIN "Programs" p
  ON gr.id = p."grantId"
WHERE o."deletedAt" IS NULL
GROUP BY 1,2,3,4,5,6,7,8,9
;
DROP TABLE IF EXISTS ar_data;
CREATE TEMP TABLE ar_data
AS
-- aggregated ar-level data across all approved ar appearances of each objective;
-- tta_provided is prefixed with report_id so multi-ar values stay traceable
SELECT
  obj_id,
  COUNT(DISTINCT arid) ar_cnt,
  STRING_AGG(report_id, E'\n' ORDER BY arid) report_ids,
  STRING_AGG(arid::text || ': ' || region::text, E'\n' ORDER BY arid) regions,
  STRING_AGG(arid::text || ': ' || LEFT(TRIM(regexp_replace(regexp_replace(regexp_replace(LEFT(tta_provided, 250), '<[^>]+>', '', 'g'), '<[^>]*$', '', 'g'), '\s+', ' ', 'g')), 100), E'\n' ORDER BY arid) tta_short,
  STRING_AGG(arid::text || ': ' || tta_provided, E'\n' ORDER BY arid) tta_provided,
  STRING_AGG(arid::text || ': ' || support_type, E'\n' ORDER BY arid) support_types,
  STRING_AGG(arid::text || ': ' || COALESCE(start_date::text, ''), E'\n' ORDER BY arid) ar_start_dates,
  STRING_AGG(arid::text || ': ' || COALESCE(end_date::text, ''), E'\n' ORDER BY arid) ar_end_dates,
  STRING_AGG(arid::text || ': ' || COALESCE(create_date::text, ''), E'\n' ORDER BY arid) ar_create_dates,
  STRING_AGG(arid::text || ': ' || COALESCE(approved_date::text, ''), E'\n' ORDER BY arid) ar_approved_dates
FROM objective_ars
GROUP BY 1
;
DROP TABLE IF EXISTS topic_by_ar;
CREATE TEMP TABLE topic_by_ar
AS
-- each AR's '; '-joined topic list (one row per objective per AR)
SELECT
  oa.obj_id,
  oa.arid,
  STRING_AGG(DISTINCT t.name, '; ' ORDER BY t.name) topic_list
FROM objective_ars oa
JOIN "ActivityReportObjectiveTopics" arot
  ON oa.aroid = arot."activityReportObjectiveId"
JOIN "Topics" t
  ON arot."topicId" = t.id
GROUP BY 1, 2
;
DROP TABLE IF EXISTS topics;
CREATE TEMP TABLE topics
AS
-- per-topic AR counts + the visually-aligned topic list (one labeled line per AR)
SELECT
  oa.obj_id,
  STRING_AGG(DISTINCT oa.arid::text || ': ' || tba.topic_list, E'\n' ORDER BY oa.arid::text || ': ' || tba.topic_list) topics,
  COUNT(DISTINCT CASE WHEN t.name = 'Other' THEN oa.arid END) other,
  COUNT(DISTINCT CASE WHEN t.name = 'Behavioral / Mental Health / Trauma' THEN oa.arid END) behavioral_mh_trauma,
  COUNT(DISTINCT CASE WHEN t.name = 'CLASS: Classroom Organization' THEN oa.arid END) class_classroom_org,
  COUNT(DISTINCT CASE WHEN t.name = 'CLASS: Emotional Support' THEN oa.arid END) class_emotional_support,
  COUNT(DISTINCT CASE WHEN t.name = 'CLASS: Instructional Support' THEN oa.arid END) class_instructional_support,
  COUNT(DISTINCT CASE WHEN t.name = 'Coaching' THEN oa.arid END) coaching,
  COUNT(DISTINCT CASE WHEN t.name = 'Communication' THEN oa.arid END) communication,
  COUNT(DISTINCT CASE WHEN t.name = 'Community and Self-Assessment' THEN oa.arid END) community_self_assessment,
  COUNT(DISTINCT CASE WHEN t.name = 'Culture & Language' THEN oa.arid END) culture_language,
  COUNT(DISTINCT CASE WHEN t.name = 'Curriculum (Instructional or Parenting)' THEN oa.arid END) curriculum,
  COUNT(DISTINCT CASE WHEN t.name = 'Data and Evaluation' THEN oa.arid END) data_evaluation,
  COUNT(DISTINCT CASE WHEN t.name = 'ERSEA' THEN oa.arid END) ersea,
  COUNT(DISTINCT CASE WHEN t.name = 'Facilities' THEN oa.arid END) facilities,
  COUNT(DISTINCT CASE WHEN t.name = 'Family Support Services' THEN oa.arid END) family_support_services,
  COUNT(DISTINCT CASE WHEN t.name = 'Fiscal / Budget' THEN oa.arid END) fiscal_budget,
  COUNT(DISTINCT CASE WHEN t.name = 'Five-Year Grant' THEN oa.arid END) five_year_grant,
  COUNT(DISTINCT CASE WHEN t.name = 'Home Visiting' THEN oa.arid END) home_visiting,
  COUNT(DISTINCT CASE WHEN t.name = 'Human Resources' THEN oa.arid END) human_resources,
  COUNT(DISTINCT CASE WHEN t.name = 'Leadership / Governance' THEN oa.arid END) leadership_governance,
  COUNT(DISTINCT CASE WHEN t.name = 'Learning Environments' THEN oa.arid END) learning_environments,
  COUNT(DISTINCT CASE WHEN t.name = 'Nutrition' THEN oa.arid END) nutrition,
  COUNT(DISTINCT CASE WHEN t.name = 'Oral Health' THEN oa.arid END) oral_health,
  COUNT(DISTINCT CASE WHEN t.name = 'Parent and Family Engagement' THEN oa.arid END) parent_family_engagement,
  COUNT(DISTINCT CASE WHEN t.name = 'Partnerships and Community Engagement' THEN oa.arid END) partnerships_community,
  COUNT(DISTINCT CASE WHEN t.name = 'Physical Health and Screenings' THEN oa.arid END) physical_health_screenings,
  COUNT(DISTINCT CASE WHEN t.name = 'Pregnancy Services / Expectant Families' THEN oa.arid END) pregnancy_services,
  COUNT(DISTINCT CASE WHEN t.name = 'Program Planning and Services' THEN oa.arid END) program_planning_services,
  COUNT(DISTINCT CASE WHEN t.name = 'Quality Improvement Plan / QIP' THEN oa.arid END) qip,
  COUNT(DISTINCT CASE WHEN t.name = 'Recordkeeping and Reporting' THEN oa.arid END) recordkeeping_reporting,
  COUNT(DISTINCT CASE WHEN t.name = 'Safety Practices' THEN oa.arid END) safety_practices,
  COUNT(DISTINCT CASE WHEN t.name = 'Staff Wellness' THEN oa.arid END) staff_wellness,
  COUNT(DISTINCT CASE WHEN t.name = 'Technology and Information Systems' THEN oa.arid END) technology_info_systems,
  COUNT(DISTINCT CASE WHEN t.name = 'Transition Practices' THEN oa.arid END) transition_practices,
  COUNT(DISTINCT CASE WHEN t.name = 'Transportation' THEN oa.arid END) transportation,
  COUNT(DISTINCT CASE WHEN t.name = 'Children with Disabilities' THEN oa.arid END) children_with_disabilities,
  COUNT(DISTINCT CASE WHEN t.name = 'Disabilities' THEN oa.arid END) disabilities,
  COUNT(DISTINCT CASE WHEN t.name = 'School Readiness' THEN oa.arid END) school_readiness,
  COUNT(DISTINCT CASE WHEN t.name = 'Child Screening and Assessment' THEN oa.arid END) child_screening_assessment,
  COUNT(DISTINCT CASE WHEN t.name = 'Teaching / Caregiving Practices' THEN oa.arid END) teaching_caregiving,
  COUNT(DISTINCT CASE WHEN t.name = 'Disabilities Services' THEN oa.arid END) disabilities_services,
  COUNT(DISTINCT CASE WHEN t.name = 'Training and Professional Development' THEN oa.arid END) training_prof_development,
  COUNT(DISTINCT CASE WHEN t.name = 'Fatherhood / Male Caregiving' THEN oa.arid END) fatherhood_male_caregiving,
  COUNT(DISTINCT CASE WHEN t.name = 'Ongoing Monitoring and Continuous Improvement' THEN oa.arid END) ongoing_monitoring,
  COUNT(DISTINCT CASE WHEN t.name = 'Equity' THEN oa.arid END) equity,
  COUNT(DISTINCT CASE WHEN t.name = 'Environmental Health and Safety' THEN oa.arid END) environmental_health_safety,
  COUNT(DISTINCT CASE WHEN t.name = 'Emergency Preparedness, Response, and Recovery (EPRR)' THEN oa.arid END) eprr,
  -- topic 70, the pre-split combined name, is still live in prod data
  COUNT(DISTINCT CASE WHEN t.name = 'Environmental Health and Safety / EPRR' THEN oa.arid END) environmental_health_safety_eprr
FROM objective_ars oa
JOIN "ActivityReportObjectiveTopics" arot
  ON oa.aroid = arot."activityReportObjectiveId"
JOIN "Topics" t
  ON arot."topicId" = t.id
LEFT JOIN topic_by_ar tba
  ON tba.obj_id = oa.obj_id AND tba.arid = oa.arid
GROUP BY 1
;
DROP TABLE IF EXISTS courses;
CREATE TEMP TABLE courses
AS
SELECT
  oa.obj_id,
  STRING_AGG(DISTINCT oa.arid::text || ': ' || c.name, E'\n' ORDER BY oa.arid::text || ': ' || c.name) courses
FROM objective_ars oa
JOIN "ActivityReportObjectiveCourses" aroc
  ON oa.aroid = aroc."activityReportObjectiveId"
JOIN "Courses" c
  ON aroc."courseId" = c.id
GROUP BY 1
;
DROP TABLE IF EXISTS resource_links;
CREATE TEMP TABLE resource_links
AS
SELECT
  oa.obj_id,
  STRING_AGG(DISTINCT oa.arid::text || ': ' || res.url, E'\n' ORDER BY oa.arid::text || ': ' || res.url) resource_links
FROM objective_ars oa
JOIN "ActivityReportObjectiveResources" aror
  ON oa.aroid = aror."activityReportObjectiveId"
JOIN "Resources" res
  ON aror."resourceId" = res.id
GROUP BY 1
;
DROP TABLE IF EXISTS file_attachments;
CREATE TEMP TABLE file_attachments
AS
SELECT
  oa.obj_id,
  STRING_AGG(DISTINCT oa.arid::text || ': ' || f."originalFileName", E'\n' ORDER BY oa.arid::text || ': ' || f."originalFileName") non_resource_links
FROM objective_ars oa
JOIN "ActivityReportObjectiveFiles" arof
  ON oa.aroid = arof."activityReportObjectiveId"
JOIN "Files" f
  ON arof."fileId" = f.id
GROUP BY 1
;

-- @stream-final-select
-- Marks the setup/final-SELECT split for the streaming executor; inert for manual runs.
SELECT
  o.id objective_id,
  LEFT(TRIM(regexp_replace(regexp_replace(regexp_replace(LEFT(o.title, 250), '<[^>]+>', '', 'g'), '<[^>]*$', '', 'g'), '\s+', ' ', 'g')), 100) short_title,
  o.status objective_status,
  o."createdVia" created_via,
  o."closeSuspendReason" close_suspend_reason,
  o."closeSuspendContext" close_suspend_context,
  gc.gid goal_id,
  gc.goal_standard,
  gc.goal_status,
  gc.recipient,
  gc.grant_number,
  gc.programs,
  gc.state_code,
  gc.program_specialist,
  oe.name other_entity,
  ad.ar_cnt,
  ad.report_ids,
  ad.regions,
  ad.ar_start_dates,
  ad.ar_end_dates,
  ad.ar_create_dates,
  ad.ar_approved_dates,
  ad.tta_short,
  ad.support_types,
  t.topics,
  c.courses,
  rl.resource_links,
  fa.non_resource_links,
  t.other,
  t.behavioral_mh_trauma,
  t.class_classroom_org,
  t.class_emotional_support,
  t.class_instructional_support,
  t.coaching,
  t.communication,
  t.community_self_assessment,
  t.culture_language,
  t.curriculum,
  t.data_evaluation,
  t.ersea,
  t.facilities,
  t.family_support_services,
  t.fiscal_budget,
  t.five_year_grant,
  t.home_visiting,
  t.human_resources,
  t.leadership_governance,
  t.learning_environments,
  t.nutrition,
  t.oral_health,
  t.parent_family_engagement,
  t.partnerships_community,
  t.physical_health_screenings,
  t.pregnancy_services,
  t.program_planning_services,
  t.qip,
  t.recordkeeping_reporting,
  t.safety_practices,
  t.staff_wellness,
  t.technology_info_systems,
  t.transition_practices,
  t.transportation,
  t.children_with_disabilities,
  t.disabilities,
  t.school_readiness,
  t.child_screening_assessment,
  t.teaching_caregiving,
  t.disabilities_services,
  t.training_prof_development,
  t.fatherhood_male_caregiving,
  t.ongoing_monitoring,
  t.equity,
  t.environmental_health_safety,
  t.eprr,
  t.environmental_health_safety_eprr,
  o."firstNotStartedAt"::date first_not_started_at,
  o."lastNotStartedAt"::date last_not_started_at,
  o."firstInProgressAt"::date first_in_progress_at,
  o."lastInProgressAt"::date last_in_progress_at,
  o."firstSuspendedAt"::date first_suspended_at,
  o."lastSuspendedAt"::date last_suspended_at,
  o."firstCompleteAt"::date first_complete_at,
  o."lastCompleteAt"::date last_complete_at,
  o.title full_title,
  ad.tta_provided,
  -- full parent-goal name kept at the end; goal_standard above is the short handle
  gc.goal
FROM "Objectives" o
JOIN ar_data ad
  ON o.id = ad.obj_id
LEFT JOIN goal_context gc
  ON o.id = gc.obj_id
LEFT JOIN "OtherEntities" oe
  ON o."otherEntityId" = oe.id
LEFT JOIN topics t
  ON o.id = t.obj_id
LEFT JOIN courses c
  ON o.id = c.obj_id
LEFT JOIN resource_links rl
  ON o.id = rl.obj_id
LEFT JOIN file_attachments fa
  ON o.id = fa.obj_id
-- Dynamic sort from ssdi.sortOrder.* (same pattern as activity-reports.sql). Defaults to
-- objective_id DESC; o.id is the stable tiebreaker. sp.col holds the output column name;
-- each CASE arm references the matching input column. Keep in sync with the handler's
-- allowed sort columns.
CROSS JOIN (
  SELECT
    COALESCE(NULLIF(current_setting('ssdi.sortOrder.column', true), ''), '["objective_id"]')::json ->> 0 AS col,
    UPPER(COALESCE(NULLIF(current_setting('ssdi.sortOrder.direction', true), ''), '["DESC"]')::json ->> 0) AS dir
) sp
WHERE o."deletedAt" IS NULL
ORDER BY
  CASE WHEN sp.col = 'objective_id'     AND sp.dir <> 'DESC' THEN o.id            END ASC  NULLS LAST,
  CASE WHEN sp.col = 'objective_id'     AND sp.dir =  'DESC' THEN o.id            END DESC NULLS LAST,
  CASE WHEN sp.col = 'objective_status' AND sp.dir <> 'DESC' THEN o.status        END ASC  NULLS LAST,
  CASE WHEN sp.col = 'objective_status' AND sp.dir =  'DESC' THEN o.status        END DESC NULLS LAST,
  CASE WHEN sp.col = 'recipient'        AND sp.dir <> 'DESC' THEN gc.recipient    END ASC  NULLS LAST,
  CASE WHEN sp.col = 'recipient'        AND sp.dir =  'DESC' THEN gc.recipient    END DESC NULLS LAST,
  CASE WHEN sp.col = 'grant_number'     AND sp.dir <> 'DESC' THEN gc.grant_number END ASC  NULLS LAST,
  CASE WHEN sp.col = 'grant_number'     AND sp.dir =  'DESC' THEN gc.grant_number END DESC NULLS LAST,
  o.id DESC
