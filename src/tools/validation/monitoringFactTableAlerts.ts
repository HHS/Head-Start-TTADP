import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Rebuilds ValidationAlerts derived from monitoringFactTableObservations.ts's
 * observations. See docs/monitoring-data-validation.md and
 * monitoringAlerts.ts (the raw-data equivalent) for conventions.
 */
const refreshMonitoringFactTableAlerts = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
    -- citation_ar_linked: Citations actually cited on a real (non-deleted)
    -- Activity Report - a real temp table since it's used by both alert
    -- statements below (a CTE only scopes to one statement).
    DROP TABLE IF EXISTS pg_temp.citation_ar_linked;
    CREATE TEMP TABLE citation_ar_linked
    ON COMMIT DROP
    AS
    SELECT DISTINCT aroc."citationId"
    FROM "ActivityReportObjectiveCitations" aroc
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
      AND ar."calculatedStatus" <> 'deleted'
    ;

    -- citation_reopened_on_activity_report: a reopened Citation that's
    -- actually in use on a report warrants prompt attention, not just a
    -- team_notification. Both this and citation_reopened below gate on
    -- context.reopened_at (the transition's own timestamp - see
    -- monitoringFactTableObservations.ts) so a reopening that's already been
    -- seen doesn't alert forever.
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'citation_reopened_on_activity_report',
      COUNT(*) || ' citation(s) previously considered resolved have reopened and are cited on an activity report',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'Citations',
        'observation_name', 'citation_reopened',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    JOIN citation_ar_linked al
      ON al."citationId" = vr.entity_id
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'citation_reopened'
      AND vr.category = 'reopened'
      AND (vr.context->>'reopened_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- citation_reopened: the same reopening, but not (yet) cited on any
    -- report - team_notification rather than alert.
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'citation_reopened',
      COUNT(*) || ' citation(s) previously considered resolved have reopened',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'Citations',
        'observation_name', 'citation_reopened',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'citation_reopened'
      AND vr.category = 'reopened'
      AND (vr.context->>'reopened_at')::timestamptz >= (NOW() - INTERVAL '7 days')
      AND NOT EXISTS (
        SELECT 1 FROM citation_ar_linked al WHERE al."citationId" = vr.entity_id
      )
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- delivered_review_reopened: team_notification only - ARs cite Citations,
    -- not DeliveredReviews directly, so this doesn't need the AR-linkage
    -- severity split citation_reopened above has. Same 7-day freshness gate.
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'delivered_review_reopened',
      COUNT(*) || ' delivered review(s) previously considered complete are no longer complete',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'DeliveredReviews',
        'observation_name', 'delivered_review_completion_state',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'delivered_review_completion_state'
      AND vr.category = 'reopened'
      AND (vr.context->>'reopened_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- activity_report_citation_source_deleted / _editable: a report's
    -- citation selection points at IT-AMS data that no longer exists.
    -- Split by whether the report can still be changed: an approved report
    -- is immutable by design, so this is an awareness alert for a
    -- compliance-relevant fact, not something to fix; a draft/submitted/
    -- needs_action report is still editable, so the same situation can cause
    -- real broken behavior and is something OHS staff can act on. Both are
    -- freshness-gated so a case someone's already seen doesn't alert
    -- forever. Points at the first affected report (by id) and its
    -- recipient, rather than a raw id list - enough for OHS staff to start
    -- following up, with the rest available on request rather than
    -- cluttering the alert.
    DROP TABLE IF EXISTS pg_temp.aroc_source_deleted;
    CREATE TEMP TABLE aroc_source_deleted
    ON COMMIT DROP
    AS
    SELECT
      ar.id report_id,
      ar."calculatedStatus" report_status,
      rec.name recipient_name
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    JOIN "ActivityReportObjectiveCitations" aroc
      ON aroc.id = vr.entity_id
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
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
      SELECT report_id, recipient_name
      FROM aroc_source_deleted
      WHERE report_status = 'approved'
      ORDER BY report_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'activity_report_citation_source_deleted',
      summary.report_count || ' approved AR(s) reference citation(s) no longer present in the Monitoring data',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'ActivityReports',
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
      SELECT report_id, recipient_name
      FROM aroc_source_deleted
      WHERE report_status <> 'approved'
      ORDER BY report_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'activity_report_citation_source_deleted_editable',
      summary.report_count || ' draft/submitted AR(s) reference citation(s) no longer present in the Monitoring data',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'ActivityReports',
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
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringFactTableAlerts;
