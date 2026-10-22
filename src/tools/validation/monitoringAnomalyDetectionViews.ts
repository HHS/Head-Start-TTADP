import type { Transaction } from 'sequelize';
import type { sequelize } from '../../models';

/**
 * Creates or replaces finding_observations and review_observations: a wide,
 * one-row-per-entity pivot of ValidationRecords (one column per observation).
 * Canonical definition, exported so migrations can call this directly.
 *
 * Nothing in the validation pipeline reads these views, so there's no
 * self-healing call wired into the pipeline's own run - a new migration is
 * needed any time these change. See exportAnomalyDetectionCsvs.sql for a
 * script that runs these and writes CSVs.
 *
 * WIP: no tests yet, on purpose - still actively evolving.
 */
export const recreateAnomalyDetectionViews = async (
  queryInterface: ReturnType<typeof sequelize.getQueryInterface>,
  transaction: Transaction
) => {
  await queryInterface.sequelize.query(
    `
    -- Instead of CREATE OR REPLACE, dropping for better output column schema flexibility.
    DROP VIEW IF EXISTS finding_observations;
    DROP VIEW IF EXISTS review_observations;

    CREATE VIEW finding_observations
    AS
    WITH cur_run AS (
      SELECT r.id run_id
      FROM "ValidationRuns" r
      WHERE r.process_name = 'monitoring_post_refresh'
        AND r.status = 'success'
      ORDER BY r.id DESC
      LIMIT 1
    )
    SELECT
      c.mfid entity_id,
      category.category category,
      citation_review_count.scalar citation_review_count,
      citation_grant_count.scalar citation_grant_count,
      citation_days_review_1_to_2.scalar citation_days_review_1_to_2,
      citation_days_review_1_to_2.category citation_days_review_1_to_2_status,
      citation_days_review_2_to_3.scalar citation_days_review_2_to_3,
      citation_days_review_2_to_3.category citation_days_review_2_to_3_status,
      raw_finding_type.category raw_finding_type,
      finding_deadline.category finding_deadline,
      reported_date.category reported_date,
      closed_date.category closed_date,
      reported_to_closed_days.scalar reported_to_closed_days,
      initial_determination.category initial_determination,
      latest_determination.category latest_determination,
      previous_determination.category previous_determination,
      initial_narrative_length.scalar initial_narrative_length,
      latest_narrative_length.scalar latest_narrative_length,
      initial_review_outcome.category initial_review_outcome,
      latest_review_outcome.category latest_review_outcome,
      finding_status_change_count.scalar finding_status_change_count,
      finding_correction_deadline_change_count.scalar finding_correction_deadline_change_count,
      finding_type_change_count.scalar finding_type_change_count,
      finding_source_change_count.scalar finding_source_change_count
    FROM "Citations" c
    CROSS JOIN cur_run cur
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'category'
    ) category ON category.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'citation_review_count'
    ) citation_review_count ON citation_review_count.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'citation_grant_count'
    ) citation_grant_count ON citation_grant_count.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'citation_days_review_1_to_2'
    ) citation_days_review_1_to_2 ON citation_days_review_1_to_2.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'citation_days_review_2_to_3'
    ) citation_days_review_2_to_3 ON citation_days_review_2_to_3.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'raw_finding_type'
    ) raw_finding_type ON raw_finding_type.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'finding_deadline'
    ) finding_deadline ON finding_deadline.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'reported_date'
    ) reported_date ON reported_date.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'closed_date'
    ) closed_date ON closed_date.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'reported_to_closed_days'
    ) reported_to_closed_days ON reported_to_closed_days.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'initial_determination'
    ) initial_determination ON initial_determination.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'latest_determination'
    ) latest_determination ON latest_determination.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'previous_determination'
    ) previous_determination ON previous_determination.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'initial_narrative_length'
    ) initial_narrative_length ON initial_narrative_length.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'latest_narrative_length'
    ) latest_narrative_length ON latest_narrative_length.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'initial_review_outcome'
    ) initial_review_outcome ON initial_review_outcome.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'latest_review_outcome'
    ) latest_review_outcome ON latest_review_outcome.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'finding_status_change_count'
    ) finding_status_change_count ON finding_status_change_count.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'finding_correction_deadline_change_count'
    ) finding_correction_deadline_change_count ON finding_correction_deadline_change_count.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'finding_type_change_count'
    ) finding_type_change_count ON finding_type_change_count.entity_id = c.mfid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringFindings' AND observation_name = 'finding_source_change_count'
    ) finding_source_change_count ON finding_source_change_count.entity_id = c.mfid
    WHERE c."deletedAt" IS NULL
    ;

    CREATE VIEW review_observations
    AS
    WITH cur_run AS (
      SELECT r.id run_id
      FROM "ValidationRuns" r
      WHERE r.process_name = 'monitoring_post_refresh'
        AND r.status = 'success'
      ORDER BY r.id DESC
      LIMIT 1
    )
    SELECT
      dr.mrid entity_id,
      delivery_report_lag_days.scalar delivery_report_lag_days,
      finding_count.scalar finding_count,
      review_type.category review_type,
      outcome.category outcome,
      report_delivery_date.category report_delivery_date,
      time_to_complete_days.scalar time_to_complete_days,
      total_open_days.scalar total_open_days,
      citation_count_area_of_concern.scalar citation_count_area_of_concern,
      citation_count_noncompliance.scalar citation_count_noncompliance,
      citation_count_deficiency.scalar citation_count_deficiency,
      finding_deadline_max_lag_days.scalar finding_deadline_max_lag_days,
      grantee_count.scalar grantee_count,
      grant_count.scalar grant_count,
      recipient_count.scalar recipient_count,
      linked_review_count.scalar linked_review_count,
      linked_review_latest_delivery_date.category linked_review_latest_delivery_date,
      linked_review_undelivered_count.scalar linked_review_undelivered_count,
      review_status_change_count.scalar review_status_change_count,
      review_outcome_change_count.scalar review_outcome_change_count
    FROM "DeliveredReviews" dr
    CROSS JOIN cur_run cur
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'delivery_report_lag_days'
    ) delivery_report_lag_days ON delivery_report_lag_days.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'finding_count'
    ) finding_count ON finding_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'review_type'
    ) review_type ON review_type.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'outcome'
    ) outcome ON outcome.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'report_delivery_date'
    ) report_delivery_date ON report_delivery_date.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'time_to_complete_days'
    ) time_to_complete_days ON time_to_complete_days.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'total_open_days'
    ) total_open_days ON total_open_days.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'citation_count_area_of_concern'
    ) citation_count_area_of_concern ON citation_count_area_of_concern.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'citation_count_noncompliance'
    ) citation_count_noncompliance ON citation_count_noncompliance.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'citation_count_deficiency'
    ) citation_count_deficiency ON citation_count_deficiency.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'finding_deadline_max_lag_days'
    ) finding_deadline_max_lag_days ON finding_deadline_max_lag_days.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'grantee_count'
    ) grantee_count ON grantee_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'grant_count'
    ) grant_count ON grant_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'recipient_count'
    ) recipient_count ON recipient_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'linked_review_count'
    ) linked_review_count ON linked_review_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, category FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'linked_review_latest_delivery_date'
    ) linked_review_latest_delivery_date ON linked_review_latest_delivery_date.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'linked_review_undelivered_count'
    ) linked_review_undelivered_count ON linked_review_undelivered_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'review_status_change_count'
    ) review_status_change_count ON review_status_change_count.entity_id = dr.mrid
    LEFT JOIN (
      SELECT entity_id, scalar FROM "ValidationRecords", cur_run
      WHERE "ValidationRecords".run_id = cur_run.run_id AND entity_type = 'MonitoringReviews' AND observation_name = 'review_outcome_change_count'
    ) review_outcome_change_count ON review_outcome_change_count.entity_id = dr.mrid
    WHERE dr."deletedAt" IS NULL
    ;
    `,
    { transaction }
  );
};

export default recreateAnomalyDetectionViews;
