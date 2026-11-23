import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import {
  Citation,
  DeliveredReview,
  Grant,
  GrantCitation,
  GrantDeliveredReview,
  GrantNumberLink,
  GrantReplacements,
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
} from '../../models';
import updateMonitoringTimeSeries from './monitoringTimeSeries';
import refreshMonitoringValidationStaging from './monitoringValidationStaging';
import runValidation from './runValidation';

jest.mock('../../logger');

// A synthetic process name so cleanup never touches real runs.
const PROCESS = 'test_monitoring_time_series';
const CYCLE = { import_id: 96000, source_updated_at: new Date('2026-08-01T00:00:00.000Z') };

// High ids to avoid colliding with seed data (shared test database).
const REVIEW_STATUS_COMPLETE_ID = 96001;
const FINDING_STATUS_ACTIVE_ID = 96002;

const FEATURE_SETS = [
  'monitoring_reviews',
  'monitoring_findings',
  'monitoring_finding_closure',
  'monitoring_report_delivery',
  'monitoring_grants',
  'monitoring_citations',
];

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (isoDate, days) =>
  new Date(new Date(`${isoDate}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
const weekStart = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return addDays(isoDate, -((d.getUTCDay() || 7) - 1));
};
const monthStart = (isoDate) => `${isoDate.slice(0, 7)}-01`;

const timestamps = {
  sourceCreatedAt: new Date(),
  sourceUpdatedAt: new Date(),
  sourceDeletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const statKey = (featureSet, periodType, periodStart, regionId, statName, geoId = 0) =>
  `${featureSet}|${periodType}|${periodStart}|${regionId}|${geoId}|${statName}`;

const snapshot = async () => {
  const rows = await sequelize.query(
    `
    SELECT feature_set, period_type, period_start::text period_start, region_id, geo_id, stat_name, value::float value
    FROM "ValidationTimeSeries"
    WHERE feature_set IN (:featureSets)
    `,
    { type: sequelize.QueryTypes.SELECT, replacements: { featureSets: FEATURE_SETS } }
  );
  return new Map(
    rows.map((r) => [
      statKey(r.feature_set, r.period_type, r.period_start, r.region_id, r.stat_name, r.geo_id),
      r.value,
    ])
  );
};

const runMeasures = (steps = [refreshMonitoringValidationStaging, updateMonitoringTimeSeries]) =>
  runValidation({
    processName: PROCESS,
    logLabel: 'Test Monitoring Time Series',
    steps,
    cycle: CYCLE,
  });

// One fixture set covers every stat updateMonitoringTimeSeries produces. The
// shared test database holds other data feeding the same national, region 1
// and current-period rows, so beforeAll runs the step once before the fixtures
// exist and once after, and the tests assert on the difference.
describe('updateMonitoringTimeSeries', () => {
  const tag = uuidv4().replace(/-/g, '').slice(0, 10);
  const recipientId = faker.number.int({ min: 90000, max: 899999 });
  const baseGrantId = faker.number.int({ min: 90000, max: 899000 });
  // A: Active. B: Inactive, replaced by C (Active). D: Inactive, no
  // replacement. E: Active, region 2.
  const grants = {
    a: { id: baseGrantId, status: 'Active', regionId: 1 },
    b: { id: baseGrantId + 1, status: 'Inactive', regionId: 1 },
    c: { id: baseGrantId + 2, status: 'Active', regionId: 1 },
    d: { id: baseGrantId + 3, status: 'Inactive', regionId: 1 },
    e: { id: baseGrantId + 4, status: 'Active', regionId: 2 },
  };
  const grantNumbers = Object.fromEntries(Object.keys(grants).map((k) => [k, `TSM-${k}-${tag}`]));
  const granteeId = uuidv4();
  const category = `Validation Test ${tag}`;
  const categorySlug = `validation_test_${tag}`;
  const reusedValue = `TEST-${tag}-x`;
  const newValues = [`1302.${tag}(a)`, `75.${tag}(b)`, `642(${tag}-1)`, `642(${tag}-2)`];

  // Raw Monitoring review delivered last complete week, on grants A and E,
  // with two findings; and two reviews delivered three weeks earlier for the
  // lag counts.
  const reviewId = uuidv4();
  const lagReviewIds = [uuidv4(), uuidv4()];
  const findingIds = [uuidv4(), uuidv4()];

  const citationIds = [];
  const deliveredReviewIds = [];

  let dates;
  let before;
  let after;

  const createCitation = async ({ grantKey, ...fields }) => {
    const citation = await Citation.create({
      mfid: faker.number.int({ min: 900000, max: 89999999 }),
      finding_uuid: uuidv4(),
      calculated_status: 'Active',
      ...fields,
    });
    citationIds.push(citation.id);
    if (grantKey) {
      await GrantCitation.create({
        grantId: grants[grantKey].id,
        citationId: citation.id,
        recipient_id: recipientId,
        region_id: grants[grantKey].regionId,
      });
    }
    return citation;
  };

  const createDeliveredReview = async ({ grantKey, outcome }) => {
    const review = await DeliveredReview.create({
      mrid: faker.number.int({ min: 900000, max: 89999999 }),
      review_uuid: uuidv4(),
      review_type: 'FA-1',
      review_name: `Review TSM ${tag}`,
      report_delivery_date: dates.today,
      outcome,
    });
    deliveredReviewIds.push(review.id);
    await GrantDeliveredReview.create({
      grantId: grants[grantKey].id,
      deliveredReviewId: review.id,
      recipient_id: recipientId,
      region_id: grants[grantKey].regionId,
    });
  };

  const createRawMonitoringData = async () => {
    await MonitoringReviewStatusLink.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
    });
    await MonitoringReviewStatus.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: { statusId: REVIEW_STATUS_COMPLETE_ID, name: 'Complete', ...timestamps },
    });
    await MonitoringFindingStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
    });
    await MonitoringFindingStatus.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      defaults: { statusId: FINDING_STATUS_ACTIVE_ID, name: 'Active', ...timestamps },
    });
    await MonitoringFindingHistoryStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
    });
    await MonitoringGranteeLink.findOrCreate({ where: { granteeId } });

    const createReview = async (id, deliveredOn) => {
      await MonitoringReviewLink.findOrCreate({ where: { reviewId: id } });
      return MonitoringReview.create({
        reviewId: id,
        contentId: uuidv4(),
        statusId: REVIEW_STATUS_COMPLETE_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        reviewType: 'FA-1',
        reportDeliveryDate: new Date(`${deliveredOn}T12:00:00.000Z`),
        outcome: 'Complete',
        name: `Review TSM ${tag}`,
        hash: `hash-${uuidv4()}`,
        ...timestamps,
        sourceCreatedAt: new Date(`${deliveredOn}T12:00:00.000Z`),
      });
    };

    await createReview(reviewId, dates.deliveredLastWeek);
    await Promise.all(
      ['a', 'e'].map((key, i) =>
        MonitoringReviewGrantee.create({
          id: faker.number.int({ min: 900000, max: 89999999 }) + i,
          grantNumber: grantNumbers[key],
          reviewId,
          granteeId,
          createTime: new Date(),
          updateTime: new Date(),
          updateBy: 'Test',
          sourceCreatedAt: new Date(),
          sourceUpdatedAt: new Date(),
        })
      )
    );

    await Promise.all(
      findingIds.map((findingId) => MonitoringFindingLink.findOrCreate({ where: { findingId } }))
    );
    await MonitoringFinding.bulkCreate(
      findingIds.map((findingId) => ({
        findingId,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: `Finding TSM ${tag}`,
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      }))
    );
    await MonitoringFindingHistory.bulkCreate(
      findingIds.map((findingId, ordinal) => ({
        reviewId,
        findingHistoryId: uuidv4(),
        findingId,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative TSM',
        ordinal,
        determination: 'Deficiency',
        name: 'History TSM',
        ...timestamps,
      }))
    );
    await MonitoringFindingGrant.bulkCreate(
      findingIds.map((findingId) => ({
        findingId,
        granteeId,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      }))
    );

    // Backdated audit rows: the first learned of one review 10 days after
    // delivery (import-lag elevated), the other 1 day after.
    const lagReviews = await Promise.all(
      lagReviewIds.map((id) => createReview(id, dates.deliveredLagWeek))
    );
    await Promise.all(
      lagReviews.map((review, i) => {
        const learnedAt = new Date(
          new Date(`${dates.deliveredLagWeek}T12:00:00.000Z`).getTime() +
            (i === 0 ? 10 : 1) * DAY_MS
        );
        return sequelize.query(
          `
          INSERT INTO "ZALMonitoringReviews"
            (data_id, dml_type, new_row_data, dml_timestamp, dml_by, dml_as, dml_txid)
          VALUES
            (:dataId, 'INSERT', :newRowData::jsonb, :dmlTimestamp, -1, -1, :dmlTxid)
          `,
          {
            replacements: {
              dataId: review.id,
              newRowData: JSON.stringify({
                reportDeliveryDate: review.reportDeliveryDate.toISOString(),
                sourceUpdatedAt: learnedAt.toISOString(),
              }),
              dmlTimestamp: learnedAt,
              dmlTxid: uuidv4(),
            },
          }
        );
      })
    );
  };

  beforeAll(async () => {
    // runValidation sets the transaction time zone to UTC, so these match the
    // period starts the step computes.
    [dates] = await sequelize.query(
      `
      SELECT
        (NOW() AT TIME ZONE 'UTC')::date::text today,
        date_trunc('month', NOW() AT TIME ZONE 'UTC')::date::text current_month,
        date_trunc('week', NOW() AT TIME ZONE 'UTC')::date::text current_week,
        (date_trunc('week', NOW() AT TIME ZONE 'UTC') - INTERVAL '1 week')::date::text last_complete_week
      `,
      { type: sequelize.QueryTypes.SELECT }
    );
    // Wednesday of the last complete week. The earlier citations are ten weeks
    // before it, so citations_with_new_value has started by the last complete
    // week even if these are the only delivered citations in the database.
    dates.deliveredLastWeek = addDays(dates.last_complete_week, 2);
    dates.deliveredEarlier = addDays(dates.deliveredLastWeek, -70);
    dates.deliveredLagWeek = addDays(dates.deliveredLastWeek, -21);
    dates.lastWeekMonth = monthStart(dates.deliveredLastWeek);
    dates.lagWeek = weekStart(dates.deliveredLagWeek);

    await runMeasures();
    before = await snapshot();

    await Recipient.create({ id: recipientId, name: `Recipient TSM ${tag}` });
    // Sequential: each Grant create refreshes GrantRelationshipToActive.
    for (const [key, g] of Object.entries(grants)) {
      await Grant.create({
        id: g.id,
        number: grantNumbers[key],
        recipientId,
        regionId: g.regionId,
        geographicRegionId: null,
        status: g.status,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2030-01-01'),
      });
    }
    await GrantReplacements.create({
      replacedGrantId: grants.b.id,
      replacingGrantId: grants.c.id,
      replacementDate: '2025-01-01',
    });

    await createRawMonitoringData();

    // Delivered last complete week: the four newValues and one reuse of
    // reusedValue. Open Noncompliance on A is overdue; Deficiency on B is open
    // and counts through C; Noncompliance on D is dropped; Area of Concern on A
    // and the closed Noncompliance on C are out of scope for the open counts.
    const defOnB = await createCitation({
      grantKey: 'b',
      citation: newValues[1],
      calculated_finding_type: 'Deficiency',
      calculated_category: category,
      active: true,
      finding_deadline: '2030-01-01',
      initial_report_delivery_date: dates.deliveredLastWeek,
    });
    await createCitation({
      grantKey: 'a',
      citation: newValues[0],
      calculated_finding_type: 'Noncompliance',
      calculated_category: category,
      active: true,
      finding_deadline: '2025-06-01',
      initial_report_delivery_date: dates.deliveredLastWeek,
    });
    await createCitation({
      grantKey: 'a',
      citation: reusedValue,
      calculated_finding_type: 'Area of Concern',
      active: true,
      initial_report_delivery_date: dates.deliveredLastWeek,
    });
    await createCitation({
      grantKey: 'd',
      citation: reusedValue,
      calculated_finding_type: 'Noncompliance',
      active: true,
      finding_deadline: '2025-06-01',
      initial_report_delivery_date: dates.deliveredEarlier,
    });
    await createCitation({
      grantKey: 'c',
      citation: `TEST-${tag}-y`,
      calculated_finding_type: 'Noncompliance',
      active: false,
      closed_date: dates.deliveredLastWeek,
      initial_report_delivery_date: dates.deliveredEarlier,
    });
    await createCitation({
      citation: newValues[2],
      initial_report_delivery_date: dates.deliveredLastWeek,
    });
    await createCitation({
      citation: newValues[3],
      initial_report_delivery_date: dates.deliveredLastWeek,
    });

    // One status change this week, on a citation linked to a region 1 grant.
    await defOnB.update({ calculated_status: 'Corrected' });

    // Non Compliant on B counts through C; Deficient on D is dropped;
    // Compliant on A is out of scope.
    await createDeliveredReview({ grantKey: 'b', outcome: 'Non Compliant' });
    await createDeliveredReview({ grantKey: 'd', outcome: 'Deficient' });
    await createDeliveredReview({ grantKey: 'a', outcome: 'Compliant' });

    // A key the recompute no longer produces, for the reconcile test.
    await ValidationTimeSeries.create({
      feature_set: 'monitoring_findings',
      period_type: 'month',
      period_start: '2025-05-01',
      region_id: 7,
      geo_id: 0,
      stat_name: 'findings_delivered',
      value: 99,
    });

    await runMeasures();
    after = await snapshot();
  });

  afterAll(async () => {
    const runIds = (
      await ValidationRun.findAll({
        where: { process_name: PROCESS },
        attributes: ['id'],
        raw: true,
      })
    ).map((r) => r.id);
    await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRun.destroy({ where: { id: runIds }, force: true });
    await ValidationTimeSeries.destroy({ where: { feature_set: FEATURE_SETS }, force: true });

    await GrantCitation.destroy({ where: { citationId: citationIds } });
    await Citation.destroy({ where: { id: citationIds }, force: true });
    await GrantDeliveredReview.destroy({ where: { deliveredReviewId: deliveredReviewIds } });
    await DeliveredReview.destroy({ where: { id: deliveredReviewIds }, force: true });

    // ZAL rows are append-only audit history and intentionally left in place.
    await MonitoringFindingGrant.destroy({ where: { findingId: findingIds }, force: true });
    await MonitoringFindingHistory.destroy({ where: { findingId: findingIds }, force: true });
    await MonitoringFinding.destroy({ where: { findingId: findingIds }, force: true });
    await MonitoringFindingLink.destroy({ where: { findingId: findingIds }, force: true });
    const allReviewIds = [reviewId, ...lagReviewIds];
    await MonitoringReviewGrantee.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringReview.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringReviewLink.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringGranteeLink.destroy({ where: { granteeId }, force: true });
    await MonitoringFindingHistoryStatusLink.destroy({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      force: true,
    });
    await MonitoringFindingStatus.destroy({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      force: true,
    });
    await MonitoringFindingStatusLink.destroy({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      force: true,
    });
    await MonitoringReviewStatus.destroy({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      force: true,
    });
    await MonitoringReviewStatusLink.destroy({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      force: true,
    });

    await GrantReplacements.destroy({ where: { replacedGrantId: grants.b.id } });
    await GrantNumberLink.destroy({
      where: { grantNumber: Object.values(grantNumbers) },
      force: true,
    });
    await Grant.destroy({ where: { id: Object.values(grants).map((g) => g.id) }, force: true });
    await Recipient.destroy({ where: { id: recipientId }, force: true });
    await sequelize.close();
  });

  const delta = (...keyParts) => {
    const key = statKey(...keyParts);
    return (after.get(key) ?? 0) - (before.get(key) ?? 0);
  };

  describe('monitoring_reviews and monitoring_findings', () => {
    it.each([1, 2])('counts the review created last complete week (region %i)', (regionId) => {
      expect(
        delta('monitoring_reviews', 'week', dates.last_complete_week, regionId, 'reviews_created')
      ).toBe(1);
    });

    it('counts delivered findings per region and once nationally', () => {
      const findingsDelta = (regionId) =>
        delta('monitoring_findings', 'month', dates.lastWeekMonth, regionId, 'findings_delivered');
      expect(findingsDelta(1)).toBe(2);
      expect(findingsDelta(2)).toBe(2);
      expect(findingsDelta(0)).toBe(2);
    });

    it.each([0, 1])('counts delivered citations by finding type (region %i)', (regionId) => {
      ['noncompliance', 'deficiency', 'area_of_concern'].forEach((type) => {
        expect(
          delta(
            'monitoring_findings',
            'month',
            dates.lastWeekMonth,
            regionId,
            `findings_delivered_${type}`
          )
        ).toBe(1);
      });
    });

    it.each([0, 1])('counts closed citations by closed date (region %i)', (regionId) => {
      expect(
        delta('monitoring_finding_closure', 'month', dates.lastWeekMonth, regionId, 'closure_count')
      ).toBe(1);
    });
  });

  describe('monitoring_report_delivery', () => {
    it('counts one of two reviews as import-lag elevated', () => {
      const lagDelta = (statName) =>
        delta('monitoring_report_delivery', 'week', dates.lagWeek, 0, statName);
      expect(lagDelta('import_lag_sample_count')).toBe(2);
      expect(lagDelta('import_lag_elevated_count')).toBe(1);
    });
  });

  describe('monitoring_grants (current month)', () => {
    const grantsDelta = (regionId, statName) =>
      delta('monitoring_grants', 'month', dates.current_month, regionId, statName);

    it('counts Active grants only in the denominator', () => {
      expect(grantsDelta(1, 'active_grant_count')).toBe(2);
      expect(grantsDelta(0, 'active_grant_count')).toBe(3);
    });

    it.each([0, 1])(
      'counts only Active grants with an open Noncompliance/Deficiency finding (region %i)',
      (regionId) => {
        expect(grantsDelta(regionId, 'grants_with_open_ncdef_finding')).toBe(1);
      }
    );

    it.each([0, 1])(
      'counts open and overdue findings through an Active successor, dropping the rest (region %i)',
      (regionId) => {
        expect(grantsDelta(regionId, 'open_ncdef_findings')).toBe(2);
        expect(grantsDelta(regionId, 'overdue_ncdef_findings')).toBe(1);
      }
    );

    it.each([0, 1])(
      'counts Non Compliant/Deficient reviews through an Active successor (region %i)',
      (regionId) => {
        expect(grantsDelta(regionId, 'noncompliant_reviews_delivered')).toBe(1);
      }
    );

    it('derives each ratio from its stored count and denominator', () => {
      const value = (statName) =>
        after.get(statKey('monitoring_grants', 'month', dates.current_month, 1, statName));
      const active = value('active_grant_count');
      expect(value('grants_with_open_ncdef_finding_fraction')).toBeCloseTo(
        value('grants_with_open_ncdef_finding') / active,
        4
      );
      expect(value('open_ncdef_findings_per_active_grant')).toBeCloseTo(
        value('open_ncdef_findings') / active,
        4
      );
      expect(value('noncompliant_reviews_per_active_grant')).toBeCloseTo(
        value('noncompliant_reviews_delivered') / active,
        4
      );
    });
  });

  describe('monitoring_citations', () => {
    const weekDelta = (statName) =>
      delta('monitoring_citations', 'week', dates.last_complete_week, 0, statName);

    it('counts citations delivered, by category, and with a never-before-seen value', () => {
      expect(weekDelta('citations_delivered')).toBe(5);
      expect(weekDelta(`citations_delivered_${categorySlug}`)).toBe(2);
      expect(weekDelta('citations_with_new_value')).toBe(4);
    });

    it.each([0, 1])('counts status changes in the current week (region %i)', (regionId) => {
      expect(
        delta('monitoring_citations', 'week', dates.current_week, regionId, 'status_changes')
      ).toBe(1);
    });

    it('stores no Z-score for the current partial week', () => {
      const zRows = [...after.keys()].filter(
        (k) => k.startsWith(`monitoring_citations|week|${dates.current_week}|`) && k.endsWith('_z')
      );
      expect(zRows).toHaveLength(0);
    });

    it('stores source shares that sum to 1 for a month with citations', () => {
      const shares = ['hspps', 'cfr_75', 'head_start_act', 'other'].map((source) =>
        after.get(
          statKey('monitoring_citations', 'month', dates.lastWeekMonth, 0, `source_share_${source}`)
        )
      );
      expect(shares.every((share) => share !== undefined)).toBe(true);
      expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 3);
    });
  });

  describe('reconcile and recomputeFloor', () => {
    const sentinelOld = { period_start: '2025-02-03', stat_name: 'citations_delivered' };

    afterAll(async () => {
      await ValidationTimeSeries.destroy({
        where: { feature_set: 'monitoring_citations', period_type: 'week', ...sentinelOld },
        force: true,
      });
    });

    it('a full recompute deletes keys it no longer produces', () => {
      expect(
        after.get(statKey('monitoring_findings', 'month', '2025-05-01', 7, 'findings_delivered'))
      ).toBeUndefined();
    });

    it('a floored run leaves rows below the floor alone and reconciles rows at or above it', async () => {
      await sequelize.query(
        `
        INSERT INTO "ValidationTimeSeries"
          (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
        VALUES
          ('monitoring_citations', 'week', :oldWeek::date, 0, 0, 'citations_delivered', 999999, NOW(), NOW()),
          ('monitoring_grants', 'month', :currentMonth::date, 1, 0, 'sentinel_stale', 1, NOW(), NOW())
        ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
        DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
        `,
        { replacements: { oldWeek: sentinelOld.period_start, currentMonth: dates.current_month } }
      );

      await runMeasures([
        refreshMonitoringValidationStaging,
        (transaction) =>
          updateMonitoringTimeSeries(transaction, { recomputeFloor: dates.current_month }),
      ]);

      const rows = await snapshot();
      expect(
        rows.get(
          statKey(
            'monitoring_citations',
            'week',
            sentinelOld.period_start,
            0,
            'citations_delivered'
          )
        )
      ).toBe(999999);
      expect(
        rows.get(statKey('monitoring_grants', 'month', dates.current_month, 1, 'sentinel_stale'))
      ).toBeUndefined();
      const activeKey = statKey(
        'monitoring_grants',
        'month',
        dates.current_month,
        1,
        'active_grant_count'
      );
      expect(rows.get(activeKey)).toBe(after.get(activeKey));
    });
  });
});
