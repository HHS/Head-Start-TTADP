import { faker } from '@faker-js/faker';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { VALIDATION_ALERT_SEVERITY, VALIDATION_PROCESS } from '../../constants';
import {
  Citation,
  Grant,
  GrantNumberLink,
  MonitoringReview,
  MonitoringReviewGrantee,
  MonitoringReviewLink,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  Recipient,
  sequelize,
  ValidationAlert,
  ValidationRecord,
  ValidationRun,
  ValidationTimeSeries,
} from '../../models';
import refreshMonitoringAlerts from './monitoringAlerts';
import updateMonitoringTimeSeries from './monitoringTimeSeries';
import refreshMonitoringValidationStaging from './monitoringValidationStaging';
import runValidation from './runValidation';

jest.mock('../../logger');

// Synthetic process names so this file's cleanup never touches real runs, and
// so previously_flagged's monitoring_validation_cycles lookup (hardcoded to
// VALIDATION_PROCESS.MONITORING_POST_REFRESH) never matches anything here -
// except the suppression test, which needs that lookup and so uses the real
// process name with its own import ids (SUPPRESSION_IMPORT_IDS).
const PROCESS_REGION_WEEK = 'test_report_delivery_lag_region_week';
const PROCESS_ZSCORE = 'test_report_delivery_lag_zscore';
const PROCESS_OTHER_CHECKS = 'test_report_delivery_lag_other_checks';
const PROCESS_CITATION_CHECKS = 'test_citation_checks';
const SUPPRESSION_IMPORT_IDS = [95101, 95102];
const CYCLE = { import_id: 95000, source_updated_at: new Date('2026-08-01T00:00:00.000Z') };

const REVIEW_STATUS_COMPLETE_ID = 95001;

const timestamps = {
  sourceCreatedAt: new Date(),
  sourceUpdatedAt: new Date(),
  sourceDeletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const linkTimestamps = { createdAt: new Date(), updatedAt: new Date() };

// Monday of the last complete ISO week, plus an offset into that week - same
// definition as the checks' own "last complete week" (vp.last_complete_week).
const lastCompleteWeekDate = (dayOffset = 2) => {
  const now = new Date();
  const day = now.getUTCDay() || 7; // Sunday -> 7
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1 - 7)
  );
  return new Date(monday.getTime() + dayOffset * 24 * 60 * 60 * 1000);
};

// Inserts a synthetic ZALMonitoringReviews row with full control over
// dml_timestamp and the new_row_data the checks read (reportDeliveryDate,
// sourceUpdatedAt, statusId) - the same technique validateMonitoringData.test.js
// uses to backdate a review's "first learned" audit row.
const insertReviewAuditRow = ({ reviewDbId, dmlTimestamp, newRowData }) =>
  sequelize.query(
    `
    INSERT INTO "ZALMonitoringReviews"
      (data_id, dml_type, new_row_data, dml_timestamp, dml_by, dml_as, dml_txid)
    VALUES
      (:dataId, 'INSERT', :newRowData::jsonb, :dmlTimestamp, -1, -1, :dmlTxid)
    `,
    {
      replacements: {
        dataId: reviewDbId,
        newRowData: JSON.stringify(newRowData),
        dmlTimestamp,
        dmlTxid: uuidv4(),
      },
    }
  );

const createReviewWithGrant = async ({ reviewId, grantNumber, reportDeliveryDate }) => {
  await MonitoringReviewLink.findOrCreate({ where: { reviewId }, defaults: linkTimestamps });
  const review = await MonitoringReview.create({
    reviewId,
    contentId: uuidv4(),
    statusId: REVIEW_STATUS_COMPLETE_ID,
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    reviewType: 'FA-1',
    reportDeliveryDate,
    outcome: 'Complete',
    name: `Review RDL ${reviewId}`,
    hash: `hash-${uuidv4()}`,
    ...timestamps,
  });
  await MonitoringReviewGrantee.create({
    id: faker.number.int({ min: 900000, max: 89999999 }),
    grantNumber,
    reviewId,
    granteeId: uuidv4(),
    createTime: new Date(),
    updateTime: new Date(),
    updateBy: 'Test',
    sourceCreatedAt: new Date(),
    sourceUpdatedAt: new Date(),
  });
  // Without this, review_complete_first_set falls back to the auto-generated
  // creation-time audit row (dated "now"), giving every review a large,
  // uncontrolled completion_gap against a reportDeliveryDate from last week.
  // Dating it at reportDeliveryDate keeps completion_gap at 0 by default.
  await insertReviewAuditRow({
    reviewDbId: review.id,
    dmlTimestamp: reportDeliveryDate,
    newRowData: { statusId: REVIEW_STATUS_COMPLETE_ID },
  });
  return review;
};

describe('monitoring time-series threshold checks', () => {
  const recipientId = faker.number.int({ min: 90000, max: 899999 });
  const grantId = faker.number.int({ min: 90000, max: 899999 });
  const grantNumber = `RDL-${uuidv4().slice(0, 8)}`;
  // Second grant, same region, for the multi-grant-fan-out test.
  const grantId2 = grantId + 1;
  const grantNumber2 = `RDL2-${uuidv4().slice(0, 8)}`;

  const deliveredThisWeek = lastCompleteWeekDate(2);
  // All MonitoringReview.reviewId values this file creates, across every
  // nested describe below - declared here (not per-describe) so the one
  // afterAll can clean them all up regardless of which block created them.
  const reviewIdBothElevated1 = uuidv4();
  const reviewIdBothElevated2 = uuidv4();
  const reviewIdMultiGrant = uuidv4();
  const reviewIdForZ = uuidv4();
  const allReviewIds = [
    reviewIdBothElevated1,
    reviewIdBothElevated2,
    reviewIdMultiGrant,
    reviewIdForZ,
  ];

  beforeAll(async () => {
    await MonitoringReviewStatusLink.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: linkTimestamps,
    });
    await MonitoringReviewStatus.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: { statusId: REVIEW_STATUS_COMPLETE_ID, name: 'Complete', ...timestamps },
    });
    await Recipient.create({ id: recipientId, name: `Recipient RDL ${uuidv4().slice(0, 6)}` });
    await Grant.create({
      id: grantId,
      number: grantNumber,
      recipientId,
      regionId: 1,
      geographicRegionId: null,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date('2030-01-01'),
    });
    await GrantNumberLink.findOrCreate({ where: { grantNumber }, defaults: { grantId } });
    await Grant.create({
      id: grantId2,
      number: grantNumber2,
      recipientId,
      regionId: 1,
      geographicRegionId: null,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date('2030-01-01'),
    });
    await GrantNumberLink.findOrCreate({
      where: { grantNumber: grantNumber2 },
      defaults: { grantId: grantId2 },
    });
  });

  afterAll(async () => {
    // ZALMonitoringReviews rows are deliberately left in place, same
    // convention as validateMonitoringData.test.js (no audit trail for the
    // audit table itself, and leftover synthetic rows don't affect anything).
    await MonitoringReviewGrantee.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringReview.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringReviewLink.destroy({ where: { reviewId: allReviewIds }, force: true });
    await ValidationTimeSeries.destroy({
      where: {
        feature_set: [
          'monitoring_reviews',
          'monitoring_report_delivery',
          'monitoring_findings',
          'monitoring_finding_closure',
          'monitoring_grants',
          'monitoring_citations',
        ],
      },
      force: true,
    });
    await GrantNumberLink.destroy({
      where: { grantNumber: [grantNumber, grantNumber2] },
      force: true,
    });
    await Grant.destroy({ where: { id: [grantId, grantId2] }, force: true });
    await Recipient.destroy({ where: { id: recipientId }, force: true });
    await MonitoringReviewStatus.destroy({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      force: true,
    });
    await MonitoringReviewStatusLink.destroy({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      force: true,
    });
    await sequelize.close();
  });

  describe('review_lag_region_week_all_elevated', () => {
    beforeAll(async () => {
      const review1 = await createReviewWithGrant({
        reviewId: reviewIdBothElevated1,
        grantNumber,
        reportDeliveryDate: deliveredThisWeek,
      });
      const review2 = await createReviewWithGrant({
        reviewId: reviewIdBothElevated2,
        grantNumber,
        reportDeliveryDate: deliveredThisWeek,
      });
      // One review attached to two grants in the same region - must still
      // count as one review, not two.
      const reviewMultiGrant = await createReviewWithGrant({
        reviewId: reviewIdMultiGrant,
        grantNumber,
        reportDeliveryDate: deliveredThisWeek,
      });
      await MonitoringReviewGrantee.create({
        id: faker.number.int({ min: 900000, max: 89999999 }),
        grantNumber: grantNumber2,
        reviewId: reviewIdMultiGrant,
        granteeId: uuidv4(),
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      });

      // All three reviews: a 10-day import lag, so every review this region
      // delivered last complete week is elevated on at least one dimension.
      const learnedAt = new Date(deliveredThisWeek.getTime() + 10 * 24 * 60 * 60 * 1000);
      await Promise.all(
        [review1, review2, reviewMultiGrant].map((review) =>
          insertReviewAuditRow({
            reviewDbId: review.id,
            dmlTimestamp: learnedAt,
            newRowData: {
              reportDeliveryDate: deliveredThisWeek.toISOString(),
              sourceUpdatedAt: learnedAt.toISOString(),
            },
          })
        )
      );

      await runValidation({
        processName: PROCESS_REGION_WEEK,
        logLabel: 'Test Region Week All Elevated',
        steps: [
          refreshMonitoringValidationStaging,
          updateMonitoringTimeSeries,
          refreshMonitoringAlerts,
        ],
        cycle: CYCLE,
      });
    });

    afterAll(async () => {
      const runIds = (
        await ValidationRun.findAll({
          where: { process_name: PROCESS_REGION_WEEK },
          attributes: ['id'],
          raw: true,
        })
      ).map((r) => r.id);
      if (runIds.length) {
        await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRun.destroy({ where: { id: runIds }, force: true });
      }
    });

    it('fires when every review a region delivered last complete week is elevated', async () => {
      const alert = await ValidationAlert.findOne({
        where: { check_name: 'review_lag_region_week_all_elevated' },
        order: [['id', 'DESC']],
        raw: true,
      });
      expect(alert).not.toBeNull();
      expect(alert.context.region_id).toBe(1);
      // 3 distinct reviews, not 4 - one of them is attached to two grants in
      // this region, so a plain row count would over-count it.
      expect(alert.context.review_count).toBe(3);
      expect(alert.message).toContain('had an elevated gap on at least one of');
    });
  });

  describe('Z-score threshold checks (import/source/completion)', () => {
    let periodStartDate;

    // Forces a known Z-score onto the week's stats after updateMonitoringTimeSeries
    // has run (and after the real elevated_count/sample_count exist), so the
    // check's +2 threshold can be exercised without constructing 20+ weeks of
    // trailing history. The real counting logic is already covered above.
    const forceZScores = (zValue) => async (transaction) => {
      await sequelize.query(
        `
        UPDATE "ValidationTimeSeries"
        SET value = :zValue
        WHERE feature_set = 'monitoring_report_delivery'
          AND period_type = 'week'
          AND region_id = 0
          AND period_start = :periodStart
          AND stat_name IN ('import_lag_elevated_z', 'source_lag_elevated_z', 'completion_gap_elevated_z')
        `,
        { transaction, replacements: { zValue, periodStart: periodStartDate } }
      );
      // The UPDATE above is a no-op if updateMonitoringTimeSeries didn't insert
      // a Z-score row at all (insufficient trailing history, the normal case in
      // this minimal fixture) - insert one directly instead so the check has
      // something to read, alongside the real elevated/sample counts.
      await sequelize.query(
        `
        INSERT INTO "ValidationTimeSeries"
          (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
        SELECT 'monitoring_report_delivery', 'week', :periodStart::date, 0, 0, stat_name, :zValue, NOW(), NOW()
        FROM (VALUES ('import_lag_elevated_z'), ('source_lag_elevated_z'), ('completion_gap_elevated_z')) v(stat_name)
        ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
        DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
        `,
        { transaction, replacements: { zValue, periodStart: periodStartDate } }
      );
    };

    beforeAll(async () => {
      const review = await createReviewWithGrant({
        reviewId: reviewIdForZ,
        grantNumber,
        reportDeliveryDate: deliveredThisWeek,
      });
      const learnedAt = new Date(deliveredThisWeek.getTime() + 1 * 24 * 60 * 60 * 1000);
      await insertReviewAuditRow({
        reviewDbId: review.id,
        dmlTimestamp: learnedAt,
        newRowData: {
          reportDeliveryDate: deliveredThisWeek.toISOString(),
          sourceUpdatedAt: learnedAt.toISOString(),
        },
      });

      const monday = new Date(
        Date.UTC(
          deliveredThisWeek.getUTCFullYear(),
          deliveredThisWeek.getUTCMonth(),
          deliveredThisWeek.getUTCDate() - (deliveredThisWeek.getUTCDay() || 7) + 1
        )
      );
      periodStartDate = monday.toISOString().slice(0, 10);
    });

    afterEach(async () => {
      const runIds = (
        await ValidationRun.findAll({
          where: { process_name: PROCESS_ZSCORE },
          attributes: ['id'],
          raw: true,
        })
      ).map((r) => r.id);
      if (runIds.length) {
        await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRun.destroy({ where: { id: runIds }, force: true });
      }
    });

    it('fires all three Z-score checks when the forced Z-score exceeds +2', async () => {
      await runValidation({
        processName: PROCESS_ZSCORE,
        logLabel: 'Test Zscore Fires',
        steps: [
          refreshMonitoringValidationStaging,
          updateMonitoringTimeSeries,
          forceZScores(3.5),
          refreshMonitoringAlerts,
        ],
        cycle: CYCLE,
      });

      const alerts = await ValidationAlert.findAll({
        where: {
          check_name: [
            'import_lag_zscore_elevated',
            'source_lag_zscore_elevated',
            'completion_gap_zscore_elevated',
          ],
        },
        raw: true,
      });
      expect(alerts).toHaveLength(3);
      const importAlert = alerts.find((a) => a.check_name === 'import_lag_zscore_elevated');
      expect(importAlert.message).toContain(
        'gap between reportDeliveryDate and arrival in TTA Hub'
      );
      expect(importAlert.context.z_score).toBe(3.5);
      expect(importAlert.context.sample_count).toBeGreaterThanOrEqual(1);
    });

    it('does not fire when the forced Z-score is at or below +2', async () => {
      await runValidation({
        processName: PROCESS_ZSCORE,
        logLabel: 'Test Zscore Quiet',
        steps: [
          refreshMonitoringValidationStaging,
          updateMonitoringTimeSeries,
          forceZScores(2.0),
          refreshMonitoringAlerts,
        ],
        cycle: CYCLE,
      });

      const alerts = await ValidationAlert.findAll({
        where: {
          check_name: [
            'import_lag_zscore_elevated',
            'source_lag_zscore_elevated',
            'completion_gap_zscore_elevated',
          ],
        },
        raw: true,
      });
      expect(alerts).toHaveLength(0);
    });
  });

  describe('findings_delivered_deficiency_month_spike / finding_closure_stalled', () => {
    const lastCompleteMonthStart = () => {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
        .toISOString()
        .slice(0, 10);
    };
    const earlierMonthStart = () => {
      const now = new Date();
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1))
        .toISOString()
        .slice(0, 10);
    };

    // updateMonitoringTimeSeries reconciles (deletes) any ValidationTimeSeries
    // row its own live recompute doesn't reproduce, so seeding these stats
    // BEFORE it runs wouldn't survive. Inject the override as its own step,
    // between updateMonitoringTimeSeries and refreshMonitoringAlerts (same
    // technique as forceZScores above) so it lands after the reconcile instead.
    const forceDeficiencySpike = async (transaction) => {
      await sequelize.query(
        `
        INSERT INTO "ValidationTimeSeries"
          (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
        VALUES
          ('monitoring_findings', 'month', :lastMonth::date, 0, 0, 'findings_delivered_deficiency', 100, NOW(), NOW()),
          ('monitoring_findings', 'month', :earlierMonth::date, 0, 0, 'findings_delivered_deficiency', 10, NOW(), NOW())
        ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
        DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
        `,
        {
          transaction,
          replacements: { lastMonth: lastCompleteMonthStart(), earlierMonth: earlierMonthStart() },
        }
      );
    };

    const forceClosureStalled = async (transaction) => {
      await sequelize.query(
        `
        INSERT INTO "ValidationTimeSeries"
          (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
        VALUES
          ('monitoring_finding_closure', 'month', :lastMonth::date, 0, 0, 'closure_count', 0, NOW(), NOW())
        ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
        DO UPDATE SET value = 0, "updatedAt" = NOW()
        `,
        { transaction, replacements: { lastMonth: lastCompleteMonthStart() } }
      );
    };

    afterEach(async () => {
      const runIds = (
        await ValidationRun.findAll({
          where: { process_name: PROCESS_OTHER_CHECKS },
          attributes: ['id'],
          raw: true,
        })
      ).map((r) => r.id);
      if (runIds.length) {
        await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRun.destroy({ where: { id: runIds }, force: true });
      }
    });

    it('fires a Deficiency-type spike when last month far exceeds the trailing year', async () => {
      await runValidation({
        processName: PROCESS_OTHER_CHECKS,
        logLabel: 'Test Deficiency Spike',
        steps: [
          refreshMonitoringValidationStaging,
          updateMonitoringTimeSeries,
          forceDeficiencySpike,
          refreshMonitoringAlerts,
        ],
        cycle: CYCLE,
      });

      const alert = await ValidationAlert.findOne({
        where: { check_name: 'findings_delivered_deficiency_month_spike' },
        order: [['id', 'DESC']],
        raw: true,
      });
      expect(alert).not.toBeNull();
      expect(alert.context.value).toBe(100);
      expect(alert.context.previous_year_total).toBe(10);
    });

    it('fires finding_closure_stalled when nothing closed and the backlog is non-trivial', async () => {
      const citations = Array.from({ length: 25 }).map(() => ({
        mfid: faker.number.int({ min: 900000, max: 89999999 }),
        finding_uuid: uuidv4(),
        active: true,
      }));
      await Citation.bulkCreate(citations);

      await runValidation({
        processName: PROCESS_OTHER_CHECKS,
        logLabel: 'Test Closure Stalled',
        steps: [
          refreshMonitoringValidationStaging,
          updateMonitoringTimeSeries,
          forceClosureStalled,
          refreshMonitoringAlerts,
        ],
        cycle: CYCLE,
      });

      const alert = await ValidationAlert.findOne({
        where: { check_name: 'finding_closure_stalled' },
        order: [['id', 'DESC']],
        raw: true,
      });
      expect(alert).not.toBeNull();
      expect(alert.context.open_backlog).toBeGreaterThan(20);

      await Citation.destroy({
        where: { finding_uuid: citations.map((c) => c.finding_uuid) },
        force: true,
      });
    });

    it('alerts in the first cycle a threshold condition holds and not in the next', async () => {
      const citations = Array.from({ length: 25 }).map(() => ({
        mfid: faker.number.int({ min: 900000, max: 89999999 }),
        finding_uuid: uuidv4(),
        active: true,
      }));
      await Citation.bulkCreate(citations);

      const runCycle = (importId) =>
        runValidation({
          processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
          logLabel: 'Test Suppression',
          steps: [
            refreshMonitoringValidationStaging,
            updateMonitoringTimeSeries,
            forceClosureStalled,
            refreshMonitoringAlerts,
          ],
          cycle: { import_id: importId, source_updated_at: null },
        });
      const stalledAlerts = (runId) =>
        ValidationAlert.findAll({
          where: { run_id: runId, check_name: 'finding_closure_stalled' },
          raw: true,
        });

      try {
        // refreshMonitoringAlerts clears this process's earlier alerts, so the
        // first cycle's alerts are read before the second cycle runs.
        const first = await runCycle(SUPPRESSION_IMPORT_IDS[0]);
        expect(await stalledAlerts(first.runId)).toHaveLength(1);

        const second = await runCycle(SUPPRESSION_IMPORT_IDS[1]);
        expect(await stalledAlerts(second.runId)).toHaveLength(0);
      } finally {
        const runIds = (
          await ValidationRun.findAll({
            where: {
              process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
              import_id: { [Op.in]: SUPPRESSION_IMPORT_IDS },
            },
            attributes: ['id'],
            raw: true,
          })
        ).map((r) => r.id);
        await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRun.destroy({ where: { id: runIds }, force: true });
        await Citation.destroy({
          where: { finding_uuid: citations.map((c) => c.finding_uuid) },
          force: true,
        });
      }
    });
  });

  describe('citation_new_values_unlikely / citation_status_changes_zscore_elevated', () => {
    const tag = uuidv4().replace(/-/g, '').slice(0, 10);
    const newValues = [`1302.${tag}(a)`, `75.${tag}(b)`];
    const lastCompleteWeekStart = lastCompleteWeekDate(0).toISOString().slice(0, 10);
    const citationUuids = [];

    beforeAll(async () => {
      const citations = newValues.map((citation) => ({
        mfid: faker.number.int({ min: 900000, max: 89999999 }),
        finding_uuid: uuidv4(),
        citation,
        initial_report_delivery_date: lastCompleteWeekDate(2).toISOString().slice(0, 10),
      }));
      citationUuids.push(...citations.map((c) => c.finding_uuid));
      await Citation.bulkCreate(citations);
    });

    afterEach(async () => {
      const runIds = (
        await ValidationRun.findAll({
          where: { process_name: PROCESS_CITATION_CHECKS },
          attributes: ['id'],
          raw: true,
        })
      ).map((r) => r.id);
      if (runIds.length) {
        await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
        await ValidationRun.destroy({ where: { id: runIds }, force: true });
      }
    });

    afterAll(async () => {
      await Citation.destroy({ where: { finding_uuid: citationUuids }, force: true });
    });

    const runWithOverride = async (override, checkName) => {
      const { runId } = await runValidation({
        processName: PROCESS_CITATION_CHECKS,
        logLabel: 'Test Citation Checks',
        steps: [
          refreshMonitoringValidationStaging,
          updateMonitoringTimeSeries,
          override,
          refreshMonitoringAlerts,
        ],
        cycle: CYCLE,
      });
      return ValidationAlert.findAll({
        where: { run_id: runId, check_name: checkName },
        raw: true,
      });
    };

    // Replaces the stored counts with one trailing week that sets the rate and
    // the last complete week itself.
    const forceNewValueCounts =
      ({ trailingN, trailingK, n, k }) =>
      async (transaction) => {
        await sequelize.query(
          `
          DELETE FROM "ValidationTimeSeries"
          WHERE feature_set = 'monitoring_citations'
            AND period_type = 'week'
            AND region_id = 0
            AND stat_name IN ('citations_delivered', 'citations_with_new_value')
            AND period_start >= (:lastWeek::date - INTERVAL '52 weeks')::date
            AND period_start <= :lastWeek::date
          ;
          INSERT INTO "ValidationTimeSeries"
            (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
          VALUES
            ('monitoring_citations', 'week', (:lastWeek::date - INTERVAL '1 week')::date, 0, 0, 'citations_delivered', :trailingN, NOW(), NOW()),
            ('monitoring_citations', 'week', (:lastWeek::date - INTERVAL '1 week')::date, 0, 0, 'citations_with_new_value', :trailingK, NOW(), NOW()),
            ('monitoring_citations', 'week', :lastWeek::date, 0, 0, 'citations_delivered', :n, NOW(), NOW()),
            ('monitoring_citations', 'week', :lastWeek::date, 0, 0, 'citations_with_new_value', :k, NOW(), NOW())
          ;
          `,
          {
            transaction,
            replacements: { lastWeek: lastCompleteWeekStart, trailingN, trailingK, n, k },
          }
        );
      };

    const newValueAlerts = (counts) =>
      runWithOverride(forceNewValueCounts(counts), 'citation_new_values_unlikely');

    it('fires with example values when the count is unlikely at the trailing rate', async () => {
      const alerts = await newValueAlerts({ trailingN: 1000, trailingK: 20, n: 10, k: 5 });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toBe(
        `5 of 10 citations delivered in the last complete week cite a value not seen before (e.g. ${newValues.join(', ')})`
      );
      expect(alerts[0].context.distinct_new_values).toBe(2);
    });

    it('does not fire below 3 new values', async () => {
      const alerts = await newValueAlerts({ trailingN: 1000, trailingK: 20, n: 10, k: 2 });
      expect(alerts).toHaveLength(0);
    });

    it('handles binomial-tail terms too small for exp() without erroring', async () => {
      // Smoothed rate (99 + 1) / (9998 + 2) = 0.01; the j = n term is e^-921.
      const alerts = await newValueAlerts({ trailingN: 9998, trailingK: 99, n: 200, k: 3 });
      expect(alerts).toHaveLength(0);
    });

    const forceStatusZ = (z) => async (transaction) => {
      await sequelize.query(
        `
        INSERT INTO "ValidationTimeSeries"
          (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
        VALUES
          ('monitoring_citations', 'week', :lastWeek::date, 0, 0, 'status_changes_z', :z, NOW(), NOW()),
          ('monitoring_citations', 'week', :lastWeek::date, 0, 0, 'status_changes', 7, NOW(), NOW())
        ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
        DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
        `,
        { transaction, replacements: { lastWeek: lastCompleteWeekStart, z } }
      );
    };

    it.each([
      [3.5, VALIDATION_ALERT_SEVERITY.ALERT],
      [2.5, VALIDATION_ALERT_SEVERITY.TEAM_NOTIFICATION],
    ])('raises a status-change spike at Z = %d with severity %s', async (z, severity) => {
      const alerts = await runWithOverride(
        forceStatusZ(z),
        'citation_status_changes_zscore_elevated'
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(severity);
      expect(alerts[0].message).toMatch(
        /^7 citations changed status in the last complete week \(e\.g\. /
      );
    });

    it('does not raise a status-change spike at Z = 2', async () => {
      const alerts = await runWithOverride(
        forceStatusZ(2),
        'citation_status_changes_zscore_elevated'
      );
      expect(alerts).toHaveLength(0);
    });
  });
});
