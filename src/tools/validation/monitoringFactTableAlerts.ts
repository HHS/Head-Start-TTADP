import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Rebuilds ValidationAlerts derived from monitoringFactTableObservations.ts's
 * observations. See docs/monitoring-validation-checks.md and monitoringAlerts.ts
 * (the raw-data equivalent) for conventions.
 */
const refreshMonitoringFactTableAlerts = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
    -- citation_ar_linked: findings (via their Citation) actually cited on a
    -- real (non-deleted) Activity Report - a real temp table since it's used
    -- by both alert statements below (a CTE only scopes to one statement).
    -- DISTINCT ON picks one representative AR per finding (the earliest by
    -- id) so the on-AR alert below can point at a concrete report.
    DROP TABLE IF EXISTS pg_temp.citation_ar_linked;
    CREATE TEMP TABLE citation_ar_linked
    ON COMMIT DROP
    AS
    SELECT DISTINCT ON (c.mfid)
      c.mfid,
      ar.id first_ar_id
    FROM "ActivityReportObjectiveCitations" aroc
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
      AND ar."calculatedStatus" <> 'deleted'
    JOIN "Citations" c
      ON c.id = aroc."citationId"
    ORDER BY c.mfid, ar.id
    ;

    -- citation_reopened_on_activity_report. Citation/review identification
    -- comes from Citations/DeliveredReviews - see docs/monitoring-fact-tables.md.
    WITH flagged AS (
      SELECT vr.entity_id, al.first_ar_id
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      JOIN citation_ar_linked al
        ON al.mfid = vr.entity_id
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'citation_reopened'
        AND vr.category = 'reopened'
        AND (vr.context->>'reopened_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.first_ar_id,
        c.mfid,
        c.citation,
        dr.review_name
      FROM flagged f
      JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.review_uuid = c.latest_review_uuid
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'citation_reopened_on_activity_report',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' was previously considered resolved but has reopened. It is referenced on AR ' || s.first_ar_id || '.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'citation_reopened',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- citation_reopened: the same reopening, but not (yet) cited on any report.
    WITH flagged AS (
      SELECT vr.entity_id
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'citation_reopened'
        AND vr.category = 'reopened'
        AND (vr.context->>'reopened_at')::timestamptz >= (NOW() - INTERVAL '7 days')
        AND NOT EXISTS (
          SELECT 1 FROM citation_ar_linked al WHERE al.mfid = vr.entity_id
        )
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        c.mfid,
        c.citation,
        dr.review_name
      FROM flagged f
      JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.review_uuid = c.latest_review_uuid
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'citation_reopened',
      'Citation ' || COALESCE(s.citation, 'unknown') || ' (' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' was previously considered resolved but has reopened.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'citation_reopened',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- delivered_review_reopened
    WITH flagged AS (
      SELECT vr.entity_id
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'delivered_review_completion_state'
        AND vr.category = 'reopened'
        AND (vr.context->>'reopened_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'delivered_review_reopened',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' was previously considered complete but is no longer complete.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'delivered_review_completion_state',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- activity_report_citation_source_deleted / _editable. Points at the
    -- first affected report (by id) and its recipient, rather than a raw id
    -- list, so OHS staff have enough to start following up without the
    -- alert itself getting cluttered; the rest are available on request.
    DROP TABLE IF EXISTS pg_temp.aroc_source_deleted;
    CREATE TEMP TABLE aroc_source_deleted
    ON COMMIT DROP
    AS
    SELECT
      ar.id report_id,
      ar."calculatedStatus" report_status,
      rec.name recipient_name,
      c.mfid,
      c.citation
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    JOIN "Citations" c
      ON c.mfid = vr.entity_id
    JOIN "ActivityReportObjectiveCitations" aroc
      ON aroc."citationId" = c.id
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
      AND ar."calculatedStatus" <> 'deleted'
    LEFT JOIN "Grants" g
      ON g.id = aroc."grantId"
    LEFT JOIN "Recipients" rec
      ON rec.id = g."recipientId"
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'activity_report_citation_source_deleted'
      AND vr.category = 'source_deleted'
      AND (vr.context->>'source_deleted_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    ;

    WITH summary AS (
      SELECT count(DISTINCT report_id) report_count
      FROM aroc_source_deleted
      WHERE report_status = 'approved'
    ),
    first_report AS (
      SELECT report_id, recipient_name, mfid, citation
      FROM aroc_source_deleted
      WHERE report_status = 'approved'
      ORDER BY report_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'activity_report_citation_source_deleted',
      'Citation ' || COALESCE(first_report.citation, 'unknown') || ' (' || first_report.mfid
        || ') referenced by approved AR ' || first_report.report_id || ' for '
        || COALESCE(LEFT(first_report.recipient_name, 40), 'an unknown recipient')
        || ' is no longer present in the Monitoring data.'
        || CASE WHEN summary.report_count > 1
          THEN ' There are ' || summary.report_count || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'activity_report_citation_source_deleted',
        'count', summary.report_count,
        'first_activity_report_id', first_report.report_id,
        'first_recipient_name', first_report.recipient_name
      ),
      NOW(),
      NOW()
    FROM summary
    JOIN first_report ON true
    CROSS JOIN validation_run cur
    WHERE summary.report_count > 0
    ;

    WITH summary AS (
      SELECT count(DISTINCT report_id) report_count
      FROM aroc_source_deleted
      WHERE report_status <> 'approved'
    ),
    first_report AS (
      SELECT report_id, recipient_name, mfid, citation
      FROM aroc_source_deleted
      WHERE report_status <> 'approved'
      ORDER BY report_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'activity_report_citation_source_deleted_editable',
      'Citation ' || COALESCE(first_report.citation, 'unknown') || ' (' || first_report.mfid
        || ') referenced by draft/submitted AR ' || first_report.report_id || ' for '
        || COALESCE(LEFT(first_report.recipient_name, 40), 'an unknown recipient')
        || ' is no longer present in the Monitoring data.'
        || CASE WHEN summary.report_count > 1
          THEN ' There are ' || summary.report_count || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'activity_report_citation_source_deleted',
        'count', summary.report_count,
        'first_activity_report_id', first_report.report_id,
        'first_recipient_name', first_report.recipient_name
      ),
      NOW(),
      NOW()
    FROM summary
    JOIN first_report ON true
    CROSS JOIN validation_run cur
    WHERE summary.report_count > 0
    ;

    -- delivered_review_citation_no_window
    WITH flagged AS (
      SELECT vr.entity_id
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'delivered_review_citation_no_window'
        AND vr.category = 'no_authoritative_window'
        AND (vr.context->>'learned_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        c.mfid,
        c.citation,
        dr.review_name
      FROM flagged f
      JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.review_uuid = c.latest_review_uuid
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'delivered_review_citation_no_window',
      'Citation ' || COALESCE(s.citation, 'unknown') || ' (' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' has a delivered review that lost a same-day tie-break and was never authoritative for any period.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'delivered_review_citation_no_window',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringFactTableAlerts;
