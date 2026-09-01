import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import {
  Grant,
  GrantNumberLink,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingHistory,
  MonitoringFindingHistoryStatusLink,
  MonitoringFindingLink,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  MonitoringGranteeLink,
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
} from '../models';
import validateMonitoringData from './validateMonitoringData';
import { getMonitoringImportCycle } from './validation/monitoringImportCycle';

jest.mock('../logger');
// Control which import cycle each run is stamped with (resolver is exercised for
// real in monitoringImportCycle.test.js). Defaults to one cycle; the retention
// test overrides per call to simulate distinct data versions.
jest.mock('./validation/monitoringImportCycle', () => ({
  getMonitoringImportCycle: jest.fn(),
}));

const DEFAULT_CYCLE = { import_id: 90000, source_updated_at: new Date('2026-07-20T00:00:00.000Z') };

// High ids to avoid colliding with seed data (shared test database)
const REVIEW_STATUS_COMPLETE_ID = 90001;
const FINDING_STATUS_ACTIVE_ID = 90002;

const timestamps = {
  sourceCreatedAt: new Date(),
  sourceUpdatedAt: new Date(),
  sourceDeletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const linkTimestamps = {
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Monday of the last complete ISO week, plus an offset into that week
const lastCompleteWeekDate = (dayOffset = 2) => {
  const now = new Date();
  const day = now.getUTCDay() || 7; // Sunday -> 7
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1 - 7)
  );
  return new Date(monday.getTime() + dayOffset * 24 * 60 * 60 * 1000);
};

describe('validateMonitoringData', () => {
  const recipientId = faker.datatype.number({ min: 90000 });
  const grantId = faker.datatype.number({ min: 90000 });
  const grantNumber = `VMD-${uuidv4().slice(0, 8)}`;
  // A second grant in a different region on the same grantee, so the seeded
  // findings span two regions and the national total must deduplicate them.
  const grantId2 = grantId + 1;
  const grantNumber2 = `VMD2-${uuidv4().slice(0, 8)}`;
  const reviewId = uuidv4();
  const granteeId = uuidv4();
  // Active finding with a closedDate and a source -> closure_state alert, category present
  const findingIdClosed = uuidv4();
  // Finding with no source and no standard -> category NULL -> category-missing alert
  const findingIdNoCategory = uuidv4();

  const reviewSourceCreatedAt = lastCompleteWeekDate();
  // recent so the delivery_report_lag_days observation stays under the 7-day
  // alert threshold (the audit row's sourceUpdatedAt is "now")
  const reportDeliveryDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    getMonitoringImportCycle.mockResolvedValue(DEFAULT_CYCLE);
    await MonitoringReviewStatusLink.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: linkTimestamps,
    });
    await MonitoringReviewStatus.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: { statusId: REVIEW_STATUS_COMPLETE_ID, name: 'Complete', ...timestamps },
    });
    await MonitoringFindingStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      defaults: linkTimestamps,
    });
    await MonitoringFindingStatus.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      defaults: { statusId: FINDING_STATUS_ACTIVE_ID, name: 'Active', ...timestamps },
    });

    await Recipient.create({ id: recipientId, name: `Recipient VMD ${uuidv4().slice(0, 6)}` });
    await Grant.create({
      id: grantId,
      number: grantNumber,
      recipientId,
      regionId: 1,
      geographicRegionId: null, // -> geo_id 0 sentinel in the time series
      status: 'Active',
      startDate: new Date(),
      endDate: new Date('2030-01-01'),
    });
    await Grant.create({
      id: grantId2,
      number: grantNumber2,
      recipientId,
      regionId: 2,
      geographicRegionId: null,
      status: 'Active',
      startDate: new Date(),
      endDate: new Date('2030-01-01'),
    });
    await Promise.all([
      GrantNumberLink.findOrCreate({ where: { grantNumber }, defaults: { grantId } }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumber2 },
        defaults: { grantId: grantId2 },
      }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId } }),
      MonitoringFindingHistoryStatusLink.findOrCreate({
        where: { statusId: FINDING_STATUS_ACTIVE_ID },
      }),
    ]);

    await MonitoringReviewLink.findOrCreate({
      where: { reviewId },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      reviewType: 'FA-1',
      reportDeliveryDate,
      outcome: 'Complete',
      name: 'Review VMD',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: reviewSourceCreatedAt,
    });
    await MonitoringReviewGrantee.create({
      id: faker.datatype.number({ min: 99999 }),
      grantNumber,
      reviewId,
      granteeId,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'Test',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    });
    await MonitoringReviewGrantee.create({
      id: faker.datatype.number({ min: 99999 }),
      grantNumber: grantNumber2,
      reviewId,
      granteeId,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'Test',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    });

    await Promise.all(
      [findingIdClosed, findingIdNoCategory].map((findingId) =>
        MonitoringFindingLink.findOrCreate({
          where: { findingId },
          defaults: linkTimestamps,
        })
      )
    );
    await MonitoringFinding.bulkCreate([
      {
        findingId: findingIdClosed,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        closedDate: '2026-06-20',
        name: 'Finding VMD closed',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdNoCategory,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: null,
        name: 'Finding VMD no category',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
    ]);
    await MonitoringFindingHistory.bulkCreate(
      [findingIdClosed, findingIdNoCategory].map((findingId, ordinal) => ({
        reviewId,
        findingHistoryId: uuidv4(),
        findingId,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative VMD',
        ordinal,
        determination: 'Deficiency',
        name: 'History VMD',
        ...timestamps,
      }))
    );
    await MonitoringFindingGrant.bulkCreate(
      [findingIdClosed, findingIdNoCategory].map((findingId) => ({
        findingId,
        granteeId,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      }))
    );
  });

  afterAll(async () => {
    const runIds = (
      await ValidationRun.findAll({
        where: { process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
        attributes: ['id'],
        raw: true,
      })
    ).map((r) => r.id);
    await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRun.destroy({ where: { id: runIds }, force: true });
    await ValidationTimeSeries.destroy({ where: {}, force: true });

    await MonitoringFindingGrant.destroy({
      where: { findingId: [findingIdClosed, findingIdNoCategory] },
      force: true,
    });
    await MonitoringFindingHistory.destroy({
      where: { findingId: [findingIdClosed, findingIdNoCategory] },
      force: true,
    });
    await MonitoringFinding.destroy({
      where: { findingId: [findingIdClosed, findingIdNoCategory] },
      force: true,
    });
    await MonitoringFindingLink.destroy({
      where: { findingId: [findingIdClosed, findingIdNoCategory] },
      force: true,
    });
    await MonitoringReviewGrantee.destroy({ where: { reviewId }, force: true });
    await MonitoringReview.destroy({ where: { reviewId }, force: true });
    await MonitoringReviewLink.destroy({ where: { reviewId }, force: true });
    await MonitoringGranteeLink.destroy({ where: { granteeId }, force: true });
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
    await MonitoringFindingStatus.destroy({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      force: true,
    });
    await sequelize.close();
  });

  it('records a successful run with counts and produces the summary artifacts', async () => {
    await validateMonitoringData();

    const run = await ValidationRun.findOne({
      where: { process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
      order: [['id', 'DESC']],
    });
    expect(run.status).toBe(VALIDATION_RUN_STATUS.SUCCESS);
    expect(run.completed_at).not.toBeNull();
    expect(run.observation_count).toBeGreaterThan(0);
    expect(run.alert_count).toBeGreaterThan(0);
  });

  it('upserts weekly review-creation stats sliced by region with the geo_id sentinel', async () => {
    const monday = lastCompleteWeekDate(0);
    const periodStart = monday.toISOString().slice(0, 10);
    const rows = await ValidationTimeSeries.findAll({
      where: {
        feature_set: 'monitoring_reviews',
        period_type: 'week',
        period_start: periodStart,
        region_id: 1,
        geo_id: 0,
        stat_name: 'reviews_created',
      },
      raw: true,
    });
    // exactly one row per slice (the unique upsert key), counting our review
    expect(rows.length).toBe(1);
    expect(Number(rows[0].value)).toBeGreaterThanOrEqual(1);
  });

  it('upserts monthly findings-delivered stats', async () => {
    const periodStart = `${reportDeliveryDate.toISOString().slice(0, 7)}-01`;
    const rows = await ValidationTimeSeries.findAll({
      where: {
        feature_set: 'monitoring_findings',
        period_type: 'month',
        period_start: periodStart,
        region_id: 1,
        geo_id: 0,
        stat_name: 'findings_delivered',
      },
      raw: true,
    });
    expect(rows.length).toBe(1);
    expect(Number(rows[0].value)).toBeGreaterThanOrEqual(2);
  });

  it('captures per-entity observations for the seeded findings and review', async () => {
    const run = await ValidationRun.findOne({
      where: { process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
      order: [['id', 'DESC']],
    });
    const [closedFinding, noCategoryFinding] = await Promise.all([
      MonitoringFinding.findOne({ where: { findingId: findingIdClosed } }),
      MonitoringFinding.findOne({ where: { findingId: findingIdNoCategory } }),
    ]);

    const closureState = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: closedFinding.id,
        observation_name: 'closure_state',
      },
      raw: true,
    });
    expect(closureState.category).toBe('active_with_closed_date');

    const category = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: closedFinding.id,
        observation_name: 'category',
      },
      raw: true,
    });
    expect(category.category).toBe('FA-1');

    const missingCategory = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: noCategoryFinding.id,
        observation_name: 'category',
      },
      raw: true,
    });
    expect(missingCategory.category).toBeNull();

    const review = await MonitoringReview.findOne({ where: { reviewId } });
    const findingCount = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: review.id,
        observation_name: 'finding_count',
      },
      raw: true,
    });
    expect(Number(findingCount.scalar)).toBe(2);
  });

  it('raises alerts derived from the observations', async () => {
    const run = await ValidationRun.findOne({
      where: { process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
      order: [['id', 'DESC']],
    });
    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id },
      raw: true,
    });
    const checkNames = alerts.map((a) => a.check_name);
    expect(checkNames).toContain('finding_category_missing');
    expect(checkNames).toContain('finding_active_with_closed_date');
  });

  it('is idempotent for stats across runs', async () => {
    await validateMonitoringData();
    await validateMonitoringData();

    // stats: still exactly one row for our weekly slice (the unique upsert key)
    const periodStart = lastCompleteWeekDate(0).toISOString().slice(0, 10);
    const statRows = await ValidationTimeSeries.findAll({
      where: {
        feature_set: 'monitoring_reviews',
        period_type: 'week',
        period_start: periodStart,
        region_id: 1,
        geo_id: 0,
        stat_name: 'reviews_created',
      },
      raw: true,
    });
    expect(statRows.length).toBe(1);
  });

  it('retains by cycle: replaces a same-cycle re-run, keeps a different cycle, rolls off old ones', async () => {
    const latestRun = () =>
      ValidationRun.findOne({
        where: { process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
        order: [['id', 'DESC']],
      });
    const recordCount = (runId) => ValidationRecord.count({ where: { run_id: runId } });

    // Cycle A, then cycle B (distinct import ids = distinct data versions).
    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: 90001,
      source_updated_at: new Date('2026-07-20T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runA = await latestRun();

    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: 90002,
      source_updated_at: new Date('2026-07-27T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runB = await latestRun();

    // grouping: each run is stamped with its own cycle
    expect(runA.import_id).toBe(90001);
    expect(runB.import_id).toBe(90002);
    // a different cycle is never collateral damage
    expect(await recordCount(runA.id)).toBeGreaterThan(0);
    expect(await recordCount(runB.id)).toBeGreaterThan(0);

    // Re-run cycle B: replaces runB's data, leaves cycle A untouched.
    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: 90002,
      source_updated_at: new Date('2026-07-27T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runB2 = await latestRun();

    expect(await recordCount(runB2.id)).toBeGreaterThan(0);
    expect(await recordCount(runB.id)).toBe(0); // same-cycle predecessor deleted
    expect(await recordCount(runA.id)).toBeGreaterThan(0); // different cycle preserved

    // Cycle C: cycle A (now two back) rolls off; previous cycle (B2) stays.
    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: 90003,
      source_updated_at: new Date('2026-08-03T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runC = await latestRun();

    expect(await recordCount(runC.id)).toBeGreaterThan(0);
    expect(await recordCount(runB2.id)).toBeGreaterThan(0); // previous cycle kept
    expect(await recordCount(runA.id)).toBe(0); // rolled off
  });

  it('emits a national (region_id 0) findings-delivered total, deduplicated across regions', async () => {
    await validateMonitoringData();

    const periodStart = `${reportDeliveryDate.toISOString().slice(0, 7)}-01`;
    const national = await ValidationTimeSeries.findAll({
      where: {
        feature_set: 'monitoring_findings',
        period_type: 'month',
        period_start: periodStart,
        region_id: 0,
        geo_id: 0,
        stat_name: 'findings_delivered',
      },
      raw: true,
    });
    // one national row, counting the two distinct delivered findings once each
    expect(national.length).toBe(1);
    expect(Number(national[0].value)).toBe(2);

    // Each seeded finding is on grants in regions 1 and 2, so the per-region
    // rows sum to 4 - the national total (2) is a dedup, not that sum.
    const perRegion = await ValidationTimeSeries.findAll({
      where: {
        feature_set: 'monitoring_findings',
        period_type: 'month',
        period_start: periodStart,
        region_id: [1, 2],
        stat_name: 'findings_delivered',
      },
      raw: true,
    });
    const regionSum = perRegion.reduce((sum, r) => sum + Number(r.value), 0);
    expect(regionSum).toBe(4);
  });

  it('reconciles: deletes time-series keys the recompute no longer produces', async () => {
    // A findings row for a region/month with no source data. The next run
    // recomputes the full range and must drop it, since an upsert alone can't.
    await ValidationTimeSeries.create({
      feature_set: 'monitoring_findings',
      period_type: 'month',
      period_start: '2025-05-01',
      region_id: 7,
      geo_id: 0,
      stat_name: 'findings_delivered',
      value: 99,
    });

    await validateMonitoringData();

    const stale = await ValidationTimeSeries.findAll({
      where: {
        feature_set: 'monitoring_findings',
        period_type: 'month',
        period_start: '2025-05-01',
        region_id: 7,
        stat_name: 'findings_delivered',
      },
      raw: true,
    });
    expect(stale.length).toBe(0);
  });
});
