/*
JSON: {
  "name": "Goal Export",
  "description": {
    "standard": "One row per goal appearing on the selected Activity Reports, with objectives, topics, resources, collaborators, and status-duration metrics aggregated across those reports.",
    "technical": "One row per goal on the selected approved Activity Reports, including merged-away goals. Objectives, topics, resources, collaborators, and per-status day counts are aggregated across those reports; FEI root causes reflect current values. Some columns contain large raw HTML fields, and some contain correlated data for multiple ARs or objectives. Also includes 47 per-topic AR-count columns not listed individually in the schema below."
  },
  "output": {
    "defaultName": "goal_export",
    "schema": [
      { "columnName": "goal_id", "type": "integer", "nullable": false, "description": "Goal id." },
      { "columnName": "standard", "type": "string", "nullable": true, "description": "Standard/curated goal template name, if any." },
      { "columnName": "goal_status", "type": "string", "nullable": true, "description": "Current goal status." },
      { "columnName": "source", "type": "string", "nullable": true, "description": "Goal source." },
      { "columnName": "created_via", "type": "string", "nullable": true, "description": "How the goal was created." },
      { "columnName": "prestandard", "type": "boolean", "nullable": true, "description": "Whether the goal predates standardization." },
      { "columnName": "created_date", "type": "date", "nullable": true, "description": "Goal created date." },
      { "columnName": "suspend_reason", "type": "string", "nullable": true, "description": "Reason from the latest suspend." },
      { "columnName": "close_reason", "type": "string", "nullable": true, "description": "Reason from the latest close." },
      { "columnName": "region", "type": "integer", "nullable": true, "description": "Region id." },
      { "columnName": "recipient", "type": "string", "nullable": true, "description": "Recipient name." },
      { "columnName": "grant_number", "type": "string", "nullable": true, "description": "Grant number." },
      { "columnName": "programs", "type": "string", "nullable": true, "description": "Program types on the grant." },
      { "columnName": "state_code", "type": "string", "nullable": true, "description": "Grant state code." },
      { "columnName": "program_specialist", "type": "string", "nullable": true, "description": "Program specialist name." },
      { "columnName": "fei_root_causes", "type": "string", "nullable": true, "description": "Current FEI root causes." },
      { "columnName": "creator", "type": "string", "nullable": true, "description": "Goal creator name." },
      { "columnName": "collaborators", "type": "string", "nullable": true, "description": "Goal collaborators by type." },
      { "columnName": "ar_cnt", "type": "integer", "nullable": true, "description": "Distinct approved ARs the goal appears on (within scope)." },
      { "columnName": "activity_reports", "type": "string", "nullable": true, "description": "Report ids, newline-separated." },
      { "columnName": "ar_statuses", "type": "string", "nullable": true, "description": "arid: goal status at AR-write time, per line." },
      { "columnName": "ar_start_dates", "type": "string", "nullable": true, "description": "arid: AR start date, per line." },
      { "columnName": "ar_end_dates", "type": "string", "nullable": true, "description": "arid: AR end date, per line." },
      { "columnName": "ar_create_dates", "type": "string", "nullable": true, "description": "arid: AR created date (US Eastern), per line." },
      { "columnName": "ar_approved_dates", "type": "string", "nullable": true, "description": "arid: AR approved date (US Eastern), per line." },
      { "columnName": "obj_cnt", "type": "integer", "nullable": true, "description": "Distinct objectives under the goal (within scope)." },
      { "columnName": "short_objective_titles", "type": "string", "nullable": true, "description": "objId: status | first ~100 chars of title, HTML stripped (locator)." },
      { "columnName": "topics", "type": "string", "nullable": true, "description": "arid: topic name, per line." },
      { "columnName": "courses", "type": "string", "nullable": true, "description": "arid: course name, per line." },
      { "columnName": "resource_links", "type": "string", "nullable": true, "description": "arid: resource url, per line." },
      { "columnName": "non_resource_links", "type": "string", "nullable": true, "description": "arid: attached file name, per line." },
      { "columnName": "goal_resource_links", "type": "string", "nullable": true, "description": "Resources attached directly to the goal." },
      { "columnName": "expected_end_date", "type": "date", "nullable": true, "description": "Expected goal end date (deprecated; retained for continuity)." },
      { "columnName": "days_draft", "type": "integer", "nullable": true, "description": "Days spent in Draft." },
      { "columnName": "last_draft", "type": "date", "nullable": true, "description": "Most recent day in Draft." },
      { "columnName": "days_not_started", "type": "integer", "nullable": true, "description": "Days spent Not Started." },
      { "columnName": "last_not_started", "type": "date", "nullable": true, "description": "Most recent day Not Started." },
      { "columnName": "days_in_progress", "type": "integer", "nullable": true, "description": "Days spent In Progress." },
      { "columnName": "last_in_progress", "type": "date", "nullable": true, "description": "Most recent day In Progress." },
      { "columnName": "days_suspended", "type": "integer", "nullable": true, "description": "Days spent Suspended." },
      { "columnName": "last_suspended", "type": "date", "nullable": true, "description": "Most recent day Suspended." },
      { "columnName": "days_closed", "type": "integer", "nullable": true, "description": "Days spent Closed." },
      { "columnName": "last_closed", "type": "date", "nullable": true, "description": "Most recent day Closed." },
      { "columnName": "name", "type": "string", "nullable": true, "description": "Full goal name (raw)." },
      { "columnName": "full_objective_titles", "type": "string", "nullable": true, "description": "objId: status | full title (raw HTML; strip at app layer)." }
    ],
    "sorting": {
      "default": [ { "name": "goal_id", "order": "DESC" } ],
      "supportsCustomSorting": true,
      "columns": [
        "goal_id", "goal_status", "region", "recipient", "grant_number",
        "creator", "collaborators", "created_date"
      ]
    }
  },
  "filters": [
    {
      "name": "activityReportIds",
      "type": "integer[]",
      "display": "Activity Report IDs",
      "description": "The set of Activity Report ids to scope goals to. Resolved upstream from the AR Landing filters; when omitted all approved reports are used (subject to region policy)."
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
-- One row per goal appearing on the in-scope approved ARs. Goals are scoped to the AR id
-- list (ssdi.activityReportIds) resolved upstream from the AR Landing filters. Objectives,
-- topics, courses, resources, and files are unioned across those ARs. AR status is verified
-- via ActivityReports.calculatedStatus = 'approved', not via flag columns like onApprovedAR.
-- Merged-away goals (mapsToParentGoalId set) ARE included: if they were on an approved AR
-- they are FOIA-able information. FEI root causes come from
-- GoalFieldResponses (current values), not the per-AR snapshots in
-- ActivityReportGoalFieldResponses. Status time-in/last-in columns are derived from
-- GoalStatusChanges spans (plus a synthetic span from goal creation to the first recorded
-- change), summed via range_agg over those spans.
-- Intermediate results are built as CTAS temp tables (DROP TABLE IF EXISTS precedes each
-- CREATE, since temp tables are session-scoped and connections are pooled) so the planner
-- has real cardinality and chooses hash/merge joins over the id-list narrowing.
-- short_objective_titles is an HTML-stripped preview; name/full_objective_titles are raw.
-- Excludes: onAR, onApprovedAR, mapsToParentGoalId, rtrOrder, and legacy columns
-- timeframe, isFromSmartsheetTtaPlan, isRttapa.
-- TODO: wire ORDER BY to ssdi.sortOrder.* once dynamic sorting is added.
-- All dates are US Eastern (a reasonable default — there's no per-user timezone).
SET LOCAL TIME ZONE 'America/New_York';
DROP TABLE IF EXISTS approved_ars;
CREATE TEMP TABLE approved_ars
AS
-- approved ARs limited to ssdi.activityReportIds; drives which goals qualify and
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
  -- narrowing point: AR id list resolved upstream from the Landing filters
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
DROP TABLE IF EXISTS goal_ars;
CREATE TEMP TABLE goal_ars
AS
-- one row per (goal, ar) pair on an approved ar;
-- arg.status reflects the goal's state at ar-write time, not its current status
SELECT
  arg."goalId" gid,
  arg.id argid,
  aa.arid,
  aa.report_id,
  aa.start_date,
  aa.end_date,
  aa.create_date,
  aa.approved_date,
  arg.status ar_goal_status
FROM "ActivityReportGoals" arg
JOIN approved_ars aa
  ON arg."activityReportId" = aa.arid
;
DROP TABLE IF EXISTS qualifying_goals;
CREATE TEMP TABLE qualifying_goals
AS
-- distinct goal ids appearing on at least one approved ar; joined (rather
-- than IN (SELECT ...)) into goal-scoped ctes below to keep them readable
-- and to avoid re-running the goal_ars scan per filter
SELECT DISTINCT gid
FROM goal_ars
;
DROP TABLE IF EXISTS grant_context;
CREATE TEMP TABLE grant_context
AS
-- grant and recipient info; one row per goal since each goal has exactly one grant
SELECT
  g.id gid,
  gr."regionId" region,
  r.name recipient,
  gr.number grant_number,
  gr."stateCode" state_code,
  gr."programSpecialistName" program_specialist,
  STRING_AGG(DISTINCT p."programType", ', ') programs
FROM "Goals" g
JOIN goal_ars ga
  ON g.id = ga.gid
JOIN "Grants" gr
  ON g."grantId" = gr.id
LEFT JOIN "Recipients" r
  ON gr."recipientId" = r.id
LEFT JOIN "Programs" p
  ON gr.id = p."grantId"
WHERE g."deletedAt" IS NULL
GROUP BY 1,2,3,4,5,6
;
DROP TABLE IF EXISTS ar_data;
CREATE TEMP TABLE ar_data
AS
-- aggregated ar-level data across all approved ar appearances of each goal;
-- statuses are prefixed with arid so multi-ar values stay traceable
SELECT
  gid,
  COUNT(DISTINCT arid) ar_cnt,
  STRING_AGG(report_id, E'\n' ORDER BY arid) activity_reports,
  STRING_AGG(arid::text || ': ' || COALESCE(ar_goal_status, ''), E'\n' ORDER BY arid) ar_statuses,
  STRING_AGG(arid::text || ': ' || COALESCE(start_date::text, ''), E'\n' ORDER BY arid) ar_start_dates,
  STRING_AGG(arid::text || ': ' || COALESCE(end_date::text, ''), E'\n' ORDER BY arid) ar_end_dates,
  STRING_AGG(arid::text || ': ' || COALESCE(create_date::text, ''), E'\n' ORDER BY arid) ar_create_dates,
  STRING_AGG(arid::text || ': ' || COALESCE(approved_date::text, ''), E'\n' ORDER BY arid) ar_approved_dates
FROM goal_ars
GROUP BY 1
;
DROP TABLE IF EXISTS objective_ars;
CREATE TEMP TABLE objective_ars
AS
-- one row per (goal, ar, objective) for this goal's objectives on approved ars;
-- titles/statuses come from ActivityReportObjectives (state at ar-write time)
SELECT
  o."goalId" gid,
  o.id obj_id,
  aro.id aroid,
  aro."activityReportId" arid,
  aro.title obj_title,
  aro.status obj_status
FROM "ActivityReportObjectives" aro
JOIN "Objectives" o
  ON aro."objectiveId" = o.id
JOIN approved_ars aa
  ON aro."activityReportId" = aa.arid
WHERE o."goalId" IS NOT NULL
  AND o."deletedAt" IS NULL
;
DROP TABLE IF EXISTS objectives;
CREATE TEMP TABLE objectives
AS
-- rollup of this goal's objectives; DISTINCT collapses repeat ar appearances
-- when title and status match, otherwise each variant gets its own line
SELECT
  gid,
  COUNT(DISTINCT obj_id) obj_cnt,
  STRING_AGG(DISTINCT obj_id::text || ': ' || COALESCE(obj_status, '') || ' | ' || LEFT(TRIM(regexp_replace(regexp_replace(regexp_replace(LEFT(obj_title, 250), '<[^>]+>', '', 'g'), '<[^>]*$', '', 'g'), '\s+', ' ', 'g')), 100), E'\n' ORDER BY obj_id::text || ': ' || COALESCE(obj_status, '') || ' | ' || LEFT(TRIM(regexp_replace(regexp_replace(regexp_replace(LEFT(obj_title, 250), '<[^>]+>', '', 'g'), '<[^>]*$', '', 'g'), '\s+', ' ', 'g')), 100)) short_objective_titles,
  STRING_AGG(DISTINCT obj_id::text || ': ' || COALESCE(obj_status, '') || ' | ' || obj_title, E'\n' ORDER BY obj_id::text || ': ' || COALESCE(obj_status, '') || ' | ' || obj_title) full_objective_titles
FROM objective_ars
GROUP BY 1
;
DROP TABLE IF EXISTS topic_by_obj;
CREATE TEMP TABLE topic_by_obj
AS
-- each objective's '; '-joined topic list (one row per goal per objective)
SELECT
  oa.gid,
  oa.obj_id,
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
-- per-topic AR counts + the visually-aligned topic list (one labeled line per objective)
SELECT
  oa.gid,
  STRING_AGG(DISTINCT oa.obj_id::text || ': ' || tbo.topic_list, E'\n' ORDER BY oa.obj_id::text || ': ' || tbo.topic_list) topics,
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
LEFT JOIN topic_by_obj tbo
  ON tbo.gid = oa.gid AND tbo.obj_id = oa.obj_id
GROUP BY 1
;
DROP TABLE IF EXISTS courses;
CREATE TEMP TABLE courses
AS
SELECT
  oa.gid,
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
  oa.gid,
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
  oa.gid,
  STRING_AGG(DISTINCT oa.arid::text || ': ' || f."originalFileName", E'\n' ORDER BY oa.arid::text || ': ' || f."originalFileName") non_resource_links
FROM objective_ars oa
JOIN "ActivityReportObjectiveFiles" arof
  ON oa.aroid = arof."activityReportObjectiveId"
JOIN "Files" f
  ON arof."fileId" = f.id
GROUP BY 1
;
DROP TABLE IF EXISTS goal_resource_links;
CREATE TEMP TABLE goal_resource_links
AS
-- resources attached directly to the goal, as opposed to via objectives on ars
SELECT
  grs."goalId" gid,
  STRING_AGG(DISTINCT res.url, E'\n' ORDER BY res.url) goal_resource_links
FROM qualifying_goals qg
JOIN "GoalResources" grs
  ON qg.gid = grs."goalId"
JOIN "Resources" res
  ON grs."resourceId" = res.id
GROUP BY 1
;
DROP TABLE IF EXISTS fei;
CREATE TEMP TABLE fei
AS
-- current goal-level FEI root causes
SELECT
  gfr."goalId" gid,
  STRING_AGG(DISTINCT root_cause, ', ' ORDER BY root_cause) fei_root_causes
FROM qualifying_goals qg
JOIN "GoalFieldResponses" gfr
  ON qg.gid = gfr."goalId"
JOIN "GoalTemplateFieldPrompts" gtfp
  ON gfr."goalTemplateFieldPromptId" = gtfp.id
  AND gtfp.title = 'FEI root cause'
CROSS JOIN LATERAL UNNEST(gfr.response) root_cause
GROUP BY 1
;
DROP TABLE IF EXISTS numbered_status_changes;
CREATE TEMP TABLE numbered_status_changes
AS
-- raw changes ordered by effective date (performedAt); AR-driven changes are
-- backdated (approval records performedAt as of the AR start date, expressing
-- when the activity happened), while manual RTR changes use the actual time.
-- This can push the goal-creation record (null oldStatus) out of first
-- position. Rarely (2 of ~3300 in prod), approving an AR that started before
-- a later manual suspension inserts an un-suspend "before" that suspension,
-- so the replayed trail ends in a status other than the goal's current one;
-- days_*/last_* columns reflect the recorded effective-date history and are
-- left as-is rather than papered over
SELECT
  gsc."goalId" gid,
  gsc.id gscid,
  gsc."oldStatus" old_status,
  gsc."newStatus" status,
  gsc.reason,
  gsc."performedAt" performed_at,
  ROW_NUMBER() OVER (PARTITION BY gsc."goalId" ORDER BY gsc."performedAt", gsc.id) rn
FROM qualifying_goals qg
JOIN "GoalStatusChanges" gsc
  ON qg.gid = gsc."goalId"
;
DROP TABLE IF EXISTS status_change_rows;
CREATE TEMP TABLE status_change_rows
AS
-- creation records displaced from first position by backdated changes are
-- dropped as noise; they would otherwise read as the goal's latest status
SELECT gid, gscid, old_status, status, reason, performed_at
FROM numbered_status_changes
WHERE old_status IS NOT NULL
  OR rn = 1
;
DROP TABLE IF EXISTS status_changes;
CREATE TEMP TABLE status_changes
AS
-- each status change with the time of the following change; the gap between
-- them is the time spent in that status, open-ended spans run through today
SELECT
  gid,
  gscid,
  status,
  reason,
  performed_at span_start,
  COALESCE(LEAD(performed_at) OVER (PARTITION BY gid ORDER BY performed_at, gscid), NOW()) span_end
FROM status_change_rows
;
DROP TABLE IF EXISTS first_changes;
CREATE TEMP TABLE first_changes
AS
-- the earliest recorded change per goal, used to synthesize the initial span
SELECT DISTINCT ON (gid)
  gid,
  old_status,
  performed_at first_change_at
FROM status_change_rows
ORDER BY gid, performed_at, gscid
;
DROP TABLE IF EXISTS status_spans;
CREATE TEMP TABLE status_spans
AS
SELECT gid, gscid, status, reason, span_start, span_end
FROM status_changes
UNION ALL
-- synthetic initial span from goal creation:
-- to the first recorded change when that change has an oldStatus,
-- or through today in the current status when no changes are recorded at all;
-- skipped when the first change is itself the creation record (null oldStatus);
-- GREATEST clamps backdated first changes so the span cannot run backwards
SELECT
  g.id,
  NULL,
  COALESCE(fc.old_status, g.status),
  NULL,
  g."createdAt",
  GREATEST(COALESCE(fc.first_change_at, NOW()), g."createdAt")
FROM qualifying_goals qg
JOIN "Goals" g
  ON qg.gid = g.id
LEFT JOIN first_changes fc
  ON g.id = fc.gid
WHERE fc.gid IS NULL OR fc.old_status IS NOT NULL
;
-- Time-in-status requirements: (1) inclusive day granularity - a partial day counts;
-- (2) a change-day counts for both the outgoing and incoming status; (3) same-day
-- churn and overlapping same-status spans collapse to one day; (4) the open/current
-- span runs through today. Merging each status's spans into a union of date ranges
-- gives the same answer as joining every span to a per-day date spine, but daterange
-- + range_agg do it directly instead of materializing one row per goal/status/day.
DROP TABLE IF EXISTS status_ranges;
CREATE TEMP TABLE status_ranges
AS
-- one row per (goal, status, merged range). daterange upper is exclusive, so +1 makes
-- span_end inclusive; LEAST(span_end, NOW()) clamps future ends and the WHERE drops the
-- rare backdated span_start > span_end (a raw daterange with lower > upper would error).
SELECT
  gid,
  status,
  UNNEST(RANGE_AGG(DATERANGE(span_start::date, (LEAST(span_end, NOW())::date + 1)))) r
FROM status_spans
WHERE span_start::date <= LEAST(span_end, NOW())::date
GROUP BY gid, status
;
DROP TABLE IF EXISTS status_derived;
CREATE TEMP TABLE status_derived
AS
-- per-status day counts (sum of merged range lengths) and most-recent day (max range end)
SELECT
  gid,
  COALESCE(SUM(UPPER(r) - LOWER(r)) FILTER (WHERE status = 'Draft'), 0)::int days_draft,
  MAX(UPPER(r) - 1) FILTER (WHERE status = 'Draft') last_draft,
  COALESCE(SUM(UPPER(r) - LOWER(r)) FILTER (WHERE status = 'Not Started'), 0)::int days_not_started,
  MAX(UPPER(r) - 1) FILTER (WHERE status = 'Not Started') last_not_started,
  COALESCE(SUM(UPPER(r) - LOWER(r)) FILTER (WHERE status = 'In Progress'), 0)::int days_in_progress,
  MAX(UPPER(r) - 1) FILTER (WHERE status = 'In Progress') last_in_progress,
  COALESCE(SUM(UPPER(r) - LOWER(r)) FILTER (WHERE status = 'Suspended'), 0)::int days_suspended,
  MAX(UPPER(r) - 1) FILTER (WHERE status = 'Suspended') last_suspended,
  COALESCE(SUM(UPPER(r) - LOWER(r)) FILTER (WHERE status = 'Closed'), 0)::int days_closed,
  MAX(UPPER(r) - 1) FILTER (WHERE status = 'Closed') last_closed
FROM status_ranges
GROUP BY gid
;
DROP TABLE IF EXISTS status_reasons;
CREATE TEMP TABLE status_reasons
AS
-- reason from the latest change into each of suspended/closed;
-- null when that change recorded no reason, even if an earlier change did
SELECT
  gid,
  (ARRAY_AGG(reason ORDER BY performed_at DESC, gscid DESC) FILTER (WHERE status = 'Suspended'))[1] suspend_reason,
  (ARRAY_AGG(reason ORDER BY performed_at DESC, gscid DESC) FILTER (WHERE status = 'Closed'))[1] close_reason
FROM status_change_rows
GROUP BY 1
;
DROP TABLE IF EXISTS collaborators;
CREATE TEMP TABLE collaborators
AS
SELECT
  gc."goalId" gid,
  STRING_AGG(DISTINCT u.name, ', ') FILTER (WHERE ct.name = 'Creator') creator,
  STRING_AGG(DISTINCT ct.name || ': ' || u.name, E'\n' ORDER BY ct.name || ': ' || u.name) collaborators
FROM qualifying_goals qg
JOIN "GoalCollaborators" gc
  ON qg.gid = gc."goalId"
JOIN "CollaboratorTypes" ct
  ON gc."collaboratorTypeId" = ct.id
JOIN "Users" u
  ON gc."userId" = u.id
WHERE gc."deletedAt" IS NULL
GROUP BY 1
;

-- @stream-final-select
-- Marks the setup/final-SELECT split for the streaming executor; inert for manual runs.
SELECT
  g.id goal_id,
  gt.standard,
  -- short_name kept for now; may become a short_or_standard_name column after feedback
  -- LEFT(TRIM(regexp_replace(regexp_replace(g.name, '<[^>]+>', '', 'g'), '\s+', ' ', 'g')), 100) short_name,
  g.status goal_status,
  g.source,
  g."createdVia" created_via,
  g.prestandard,
  g."createdAt"::date created_date,
  sr.suspend_reason,
  sr.close_reason,
  gc.region,
  gc.recipient,
  gc.grant_number,
  gc.programs,
  gc.state_code,
  gc.program_specialist,
  f.fei_root_causes,
  col.creator,
  col.collaborators,
  ad.ar_cnt,
  ad.activity_reports,
  ad.ar_statuses,
  ad.ar_start_dates,
  ad.ar_end_dates,
  ad.ar_create_dates,
  ad.ar_approved_dates,
  ob.obj_cnt,
  ob.short_objective_titles,
  t.topics,
  c.courses,
  rl.resource_links,
  fa.non_resource_links,
  grl.goal_resource_links,
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
  g."endDate" expected_end_date,
  sd.days_draft,
  sd.last_draft,
  sd.days_not_started,
  sd.last_not_started,
  sd.days_in_progress,
  sd.last_in_progress,
  sd.days_suspended,
  sd.last_suspended,
  sd.days_closed,
  sd.last_closed,
  g.name,
  ob.full_objective_titles
FROM "Goals" g
JOIN ar_data ad
  ON g.id = ad.gid
LEFT JOIN "GoalTemplates" gt
  ON g."goalTemplateId" = gt.id
LEFT JOIN grant_context gc
  ON g.id = gc.gid
LEFT JOIN status_derived sd
  ON g.id = sd.gid
LEFT JOIN status_reasons sr
  ON g.id = sr.gid
LEFT JOIN fei f
  ON g.id = f.gid
LEFT JOIN collaborators col
  ON g.id = col.gid
LEFT JOIN objectives ob
  ON g.id = ob.gid
LEFT JOIN topics t
  ON g.id = t.gid
LEFT JOIN courses c
  ON g.id = c.gid
LEFT JOIN resource_links rl
  ON g.id = rl.gid
LEFT JOIN file_attachments fa
  ON g.id = fa.gid
LEFT JOIN goal_resource_links grl
  ON g.id = grl.gid
-- Dynamic sort from ssdi.sortOrder.* (same pattern as activity-reports.sql). Defaults to
-- goal_id DESC; g.id is the stable tiebreaker. sp.col holds the output column name; each
-- CASE arm references the matching input column (output aliases are not usable inside an
-- ORDER BY expression). Keep in sync with the handler's allowed sort columns.
CROSS JOIN (
  SELECT
    COALESCE(NULLIF(current_setting('ssdi.sortOrder.column', true), ''), '["goal_id"]')::json ->> 0 AS col,
    UPPER(COALESCE(NULLIF(current_setting('ssdi.sortOrder.direction', true), ''), '["DESC"]')::json ->> 0) AS dir
) sp
WHERE g."deletedAt" IS NULL
ORDER BY
  CASE WHEN sp.col = 'goal_id'       AND sp.dir <> 'DESC' THEN g.id              END ASC  NULLS LAST,
  CASE WHEN sp.col = 'goal_id'       AND sp.dir =  'DESC' THEN g.id              END DESC NULLS LAST,
  CASE WHEN sp.col = 'goal_status'   AND sp.dir <> 'DESC' THEN g.status          END ASC  NULLS LAST,
  CASE WHEN sp.col = 'goal_status'   AND sp.dir =  'DESC' THEN g.status          END DESC NULLS LAST,
  CASE WHEN sp.col = 'region'        AND sp.dir <> 'DESC' THEN gc.region         END ASC  NULLS LAST,
  CASE WHEN sp.col = 'region'        AND sp.dir =  'DESC' THEN gc.region         END DESC NULLS LAST,
  CASE WHEN sp.col = 'recipient'     AND sp.dir <> 'DESC' THEN gc.recipient      END ASC  NULLS LAST,
  CASE WHEN sp.col = 'recipient'     AND sp.dir =  'DESC' THEN gc.recipient      END DESC NULLS LAST,
  CASE WHEN sp.col = 'grant_number'  AND sp.dir <> 'DESC' THEN gc.grant_number   END ASC  NULLS LAST,
  CASE WHEN sp.col = 'grant_number'  AND sp.dir =  'DESC' THEN gc.grant_number   END DESC NULLS LAST,
  CASE WHEN sp.col = 'creator'       AND sp.dir <> 'DESC' THEN col.creator       END ASC  NULLS LAST,
  CASE WHEN sp.col = 'creator'       AND sp.dir =  'DESC' THEN col.creator       END DESC NULLS LAST,
  CASE WHEN sp.col = 'collaborators' AND sp.dir <> 'DESC' THEN col.collaborators END ASC  NULLS LAST,
  CASE WHEN sp.col = 'collaborators' AND sp.dir =  'DESC' THEN col.collaborators END DESC NULLS LAST,
  CASE WHEN sp.col = 'created_date'  AND sp.dir <> 'DESC' THEN g."createdAt"     END ASC  NULLS LAST,
  CASE WHEN sp.col = 'created_date'  AND sp.dir =  'DESC' THEN g."createdAt"     END DESC NULLS LAST,
  g.id DESC
