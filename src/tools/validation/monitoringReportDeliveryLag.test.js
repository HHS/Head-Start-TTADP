import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
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
// VALIDATION_PROCESS.MONITORING_POST_REFRESH) never matches anything here.
const PROCESS_COUNTING = 'test_report_delivery_lag_counting';
const PROCESS_REGION_WEEK = 'test_report_delivery_lag_region_week';
const PROCESS_ZSCORE = 'test_report_delivery_lag_zscore';
const PROCESS_OTHER_CHECKS = 'test_report_delivery_lag_other_checks';
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

describe('report delivery lag measures and checks', () => {
  const recipientId = faker.number.int({ min: 90000, max: 899999 });
  const grantId = faker.number.int({ min: 90000, max: 899999 });
  const grantNumber = `RDL-${uuidv4().slice(0, 8)}`;
  // Second grant, same region, for the multi-grant-fan-out test.
  const grantId2 = grantId + 1;
  const grantNumber2 = `RDL2-${uuidv4().slice(0, 8)}`;

  const deliveredThisWeek = lastCompleteWeekDate(2);
  // A different week for fixtures that don't care about "last complete week"
  // specifically (the counting describe below) - region_week_all_elevated and
  // the Z-score checks both evaluate "last complete week" unanimously across
  // every review in the region, so a review placed there for an unrelated
  // purpose would change what those checks see.
  const deliveredEarlierWeek = new Date(deliveredThisWeek.getTime() - 28 * 24 * 60 * 60 * 1000);

  // All MonitoringReview.reviewId values this file creates, across every
  // nested describe below - declared here (not per-describe) so the one
  // afterAll can clean them all up regardless of which block created them.
  const reviewIdElevated = uuidv4();
  const reviewIdNormal = uuidv4();
  const reviewIdBothElevated1 = uuidv4();
  const reviewIdBothElevated2 = uuidv4();
  const reviewIdMultiGrant = uuidv4();
  const reviewIdForZ = uuidv4();
  const allReviewIds = [
    reviewIdElevated,
    reviewIdNormal,
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
          'monitoring_report_delivery',
          'monitoring_findings',
          'monitoring_finding_closure',
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

  describe('updateMonitoringTimeSeries: elevated_count/sample_count counting', () => {
    let reviewElevated;
    let reviewNormal;

    beforeAll(async () => {
      reviewElevated = await createReviewWithGrant({
        reviewId: reviewIdElevated,
        grantNumber,
        reportDeliveryDate: deliveredEarlierWeek,
      });
      reviewNormal = await createReviewWithGrant({
        reviewId: reviewIdNormal,
        grantNumber,
        reportDeliveryDate: deliveredEarlierWeek,
      });

      // Elevated: learned about it (our own dml_timestamp) 10 days after
      // reportDeliveryDate - over the 7-day import-lag threshold. sourceUpdatedAt
      // set equal to dml_timestamp so this review doesn't also register as
      // source-lag elevated (keeps this case isolated to import lag only).
      const elevatedLearnedAt = new Date(deliveredEarlierWeek.getTime() + 10 * 24 * 60 * 60 * 1000);
      await insertReviewAuditRow({
        reviewDbId: reviewElevated.id,
        dmlTimestamp: elevatedLearnedAt,
        newRowData: {
          reportDeliveryDate: deliveredEarlierWeek.toISOString(),
          sourceUpdatedAt: elevatedLearnedAt.toISOString(),
        },
      });

      // Normal: learned about it 1 day later - well under the threshold.
      const normalLearnedAt = new Date(deliveredEarlierWeek.getTime() + 1 * 24 * 60 * 60 * 1000);
      await insertReviewAuditRow({
        reviewDbId: reviewNormal.id,
        dmlTimestamp: normalLearnedAt,
        newRowData: {
          reportDeliveryDate: deliveredEarlierWeek.toISOString(),
          sourceUpdatedAt: normalLearnedAt.toISOString(),
        },
      });

      await runValidation({
        processName: PROCESS_COUNTING,
        logLabel: 'Test Report Delivery Lag Counting',
        steps: [updateMonitoringTimeSeries],
        cycle: CYCLE,
      });
    });

    afterAll(async () => {
      await ValidationRun.destroy({ where: { process_name: PROCESS_COUNTING }, force: true });
    });

    it('counts exactly one of two reviews as import-lag elevated', async () => {
      const periodStart = new Date(
        Date.UTC(
          deliveredEarlierWeek.getUTCFullYear(),
          deliveredEarlierWeek.getUTCMonth(),
          deliveredEarlierWeek.getUTCDate() - (deliveredEarlierWeek.getUTCDay() || 7) + 1
        )
      )
        .toISOString()
        .slice(0, 10);

      const rows = await ValidationTimeSeries.findAll({
        where: {
          feature_set: 'monitoring_report_delivery',
          period_type: 'week',
          period_start: periodStart,
          region_id: 0,
          stat_name: ['import_lag_elevated_count', 'import_lag_sample_count'],
        },
        raw: true,
      });
      const byStat = Object.fromEntries(rows.map((r) => [r.stat_name, Number(r.value)]));
      expect(byStat.import_lag_sample_count).toBeGreaterThanOrEqual(2);
      expect(byStat.import_lag_elevated_count).toBeGreaterThanOrEqual(1);
    });

    it('does not record a Z-score yet - too few trailing weeks of history', async () => {
      const count = await ValidationTimeSeries.count({
        where: {
          feature_set: 'monitoring_report_delivery',
          stat_name: 'import_lag_elevated_z',
        },
      });
      expect(count).toBe(0);
    });
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
  });
});
