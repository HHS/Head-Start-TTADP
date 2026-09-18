import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { VALIDATION_ALERT_SEVERITY, VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import { prepMigration, setAuditLoggingState } from '../lib/migration';
import {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  Citation,
  DeliveredReview,
  Grant,
  GrantNumberLink,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingHistory,
  MonitoringFindingHistoryStatus,
  MonitoringFindingHistoryStatusLink,
  MonitoringFindingLink,
  MonitoringFindingStandard,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  MonitoringGranteeLink,
  MonitoringReview,
  MonitoringReviewGrantee,
  MonitoringReviewLink,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  MonitoringStandard,
  MonitoringStandardLink,
  Objective,
  Recipient,
  sequelize,
  User,
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

// The cycles the retention test rotates through, below.
const CYCLE_A_ID = 90001;
const CYCLE_B_ID = 90002;
const CYCLE_C_ID = 90003;
// Every import_id this file's validateMonitoringData() calls use - distinct from
// other suites sharing the monitoring_post_refresh process_name (e.g.
// checkMonitoringValidationRan.test.js) - so cleanup below can scope to exactly
// the runs this file created instead of every run for the process. (The
// programmatic-transaction snapshot/rollback helper doesn't apply here: these
// tables have auditing removed, so there's no audit log for it to revert.)
const OWN_IMPORT_IDS = [DEFAULT_CYCLE.import_id, CYCLE_A_ID, CYCLE_B_ID, CYCLE_C_ID];

// High ids to avoid colliding with seed data (shared test database)
const REVIEW_STATUS_COMPLETE_ID = 90001;
const FINDING_STATUS_ACTIVE_ID = 90002;
// Deliberately unresolvable statusIds - no *Statuses row is ever created for
// these - for review_status_resolvable / finding_status_resolvable /
// history_status_resolvable.
const REVIEW_STATUS_BOGUS_ID = 90101;
const FINDING_STATUS_BOGUS_ID = 90102;
const HISTORY_STATUS_BOGUS_ID = 90103;
// Named history statuses for history_vs_finding_status / history_vs_outcome.
const HISTORY_STATUS_CORRECTED_ID = 90104;
const HISTORY_STATUS_NEW_ID = 90105;
// A second live row sharing FINDING_STATUS_ACTIVE_ID's statusId, for
// statuses_table_integrity.
const FINDING_STATUS_DUPLICATE_NAME = 'Active (duplicate, for statuses_table_integrity)';
// Two standards with disagreeing citation text, and two with the same
// citation but disagreeing guidance, for standard_consistency.
const STANDARD_ID_CITATION_A = 90110;
const STANDARD_ID_CITATION_B = 90111;
const STANDARD_ID_GUIDANCE_A = 90112;
const STANDARD_ID_GUIDANCE_B = 90113;

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
  const recipientId = faker.number.int({ min: 90000, max: 899999 });
  const recipientName = `Recipient VMD ${uuidv4().slice(0, 6)}`;
  const grantId = faker.number.int({ min: 90000, max: 899999 });
  const grantNumber = `VMD-${uuidv4().slice(0, 8)}`;
  // A second grant in a different region on the same grantee, so the seeded
  // findings span two regions and the national total must deduplicate them.
  const grantId2 = grantId + 1;
  const grantNumber2 = `VMD2-${uuidv4().slice(0, 8)}`;
  const reviewId = uuidv4();
  const granteeId = uuidv4();
  // Active finding with a closedDate and a source -> closure_state observation, category present
  const findingIdClosed = uuidv4();
  // Finding with no source and no standard -> category NULL -> category-missing alert
  const findingIdNoCategory = uuidv4();

  const reviewSourceCreatedAt = lastCompleteWeekDate();
  // recent so the delivery_report_lag_days observation stays under the 7-day
  // alert threshold (the audit row's sourceUpdatedAt is "now")
  const reportDeliveryDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Three more reviews exercising review_delivery_report_lag's freshness gate
  // and monitoring_validation_window's date cutoff.
  const reviewIdLagStale = uuidv4();
  const reviewIdLagFresh = uuidv4();
  const reviewIdTooOld = uuidv4();
  const reportDeliveryDateLagStale = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const reportDeliveryDateLagFresh = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const reportDeliveryDateTooOld = new Date('2024-06-01');
  // The audit row for reviewIdLagStale is backdated to this (outside the
  // alert's 3-day freshness window, but a real learned-date well after
  // reportDeliveryDateLagStale, giving a genuine ~60 day lag).
  const lagStaleLearnedDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // A review with an unresolvable statusId -> review_status_resolvable and
  // review_status_vs_delivery (an unresolvable status can't be "Complete").
  const reviewIdBadStatus = uuidv4();
  // A Compliant-outcome, delivered review hosting most of the findings below.
  // Kept separate from the main `reviewId` so none of this affects its
  // finding_count assertion.
  const reviewIdCompliant = uuidv4();
  // A CLASS review with a linked finding, for review_type_shape. No
  // reportDeliveryDate, so it can't also trip delivery-based checks.
  const reviewIdClassWithFindings = uuidv4();
  const reportDeliveryDateBadStatus = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const reportDeliveryDateCompliant = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  // Findings exercising the checks added after the first pass of tests. Each
  // is named for the one thing it's built to trip.
  const findingIdGrantMismatch = uuidv4(); // finding_grant_on_own_review
  const findingIdDupHistory = uuidv4(); // finding_review_history_duplicated
  const findingIdBadDetermination = uuidv4(); // history_determination_recognized
  const findingIdHistCorrectedDisagree = uuidv4(); // history_vs_finding_status
  const findingIdOpenOnCompliant = uuidv4(); // history_vs_outcome
  const findingIdConcernOnCompliant = uuidv4(); // history_vs_outcome's Area of Concern exclusion
  const findingIdStandardVariance = uuidv4(); // standard_consistency: citation_text_disagrees
  const findingIdCategoryVariance = uuidv4(); // standard_consistency: category_disagrees_no_source
  const findingIdBadFindingStatus = uuidv4(); // finding_status_resolvable
  const findingIdBadHistoryStatus = uuidv4(); // history_status_resolvable
  // A grantNumber with a GrantNumberLinks row but no grantId -> never
  // resolves to a Grant -> review_grantee_orphaned_grant.
  const orphanedGrantNumber = `VMD-orphan-${uuidv4().slice(0, 8)}`;
  const orphanedGranteeId = uuidv4();
  // A granteeId with two distinct grantNumbers -> review_grantee_multi_grant.
  // Isolated on reviewIdCompliant, not the main `reviewId` - that review's
  // `granteeId` deliberately spans two regions already (see the national
  // dedup test), which the real-world 1:1 granteeId->grantNumber assumption
  // this check makes doesn't hold for.
  const multiGrantGranteeId = uuidv4();
  const multiGrantNumberA = `VMD-multiA-${uuidv4().slice(0, 8)}`;
  const multiGrantNumberB = `VMD-multiB-${uuidv4().slice(0, 8)}`;

  // Fact-table checks (Citations/DeliveredReviews, not raw IT-AMS tables).
  // No FK ties these rows to real MonitoringFindings/MonitoringReviews rows,
  // so arbitrary ids are fine - randomly generated (not fixed constants),
  // matching recipientId/grantId above, since ZAL rows are never cleaned up:
  // a fixed id would accumulate audit history across every past run of this
  // file and confuse "latest transition" on a re-run.
  const citationIdFreshLinked = faker.number.int({ min: 900000, max: 89999999 }); // reopened recently, cited on a real AR -> alert
  const citationIdFreshUnlinked = faker.number.int({ min: 900000, max: 89999999 }); // reopened recently, not cited anywhere -> team_notification
  const citationIdStale = faker.number.int({ min: 900000, max: 89999999 }); // reopened a while ago -> recorded, not alerted
  const deliveredReviewIdFresh = faker.number.int({ min: 900000, max: 89999999 }); // complete -> not complete, recently -> team_notification
  const deliveredReviewIdStale = faker.number.int({ min: 900000, max: 89999999 }); // same, but a while ago -> recorded, not alerted
  const citationReopenedFreshAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const citationReopenedStaleAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Soft-deleted Citations cited on a real report ->
  // activity_report_citation_source_deleted(_editable). deletedAt is read
  // directly off the row (see monitoringFactTableObservations.ts), so no ZAL
  // backdating is needed here - just set it at creation.
  const citationIdOrphanedApproved = faker.number.int({ min: 900000, max: 89999999 });
  const citationIdOrphanedEditable = faker.number.int({ min: 900000, max: 89999999 });
  const citationSourceDeletedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  // Assigned in beforeAll (need generated ids), read in afterAll for cleanup.
  let factTableUser;
  let factTableReport;
  let factTableObjective;
  let editableReport;
  let editableObjective;

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

    await Recipient.create({ id: recipientId, name: recipientName });
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
    const reviewGranteeId = faker.number.int({ min: 99999, max: 899999 });
    await MonitoringReviewGrantee.create({
      id: reviewGranteeId,
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
      id: reviewGranteeId + 1,
      grantNumber: grantNumber2,
      reviewId,
      granteeId,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'Test',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    });

    // reviewIdLagFresh's audit row is the naturally auto-generated one (its
    // sourceUpdatedAt is "now", so it's within the alert's freshness window).
    const lagReviewSeeds = [
      [reviewIdLagStale, reportDeliveryDateLagStale, 'Review VMD lag (stale)'],
      [reviewIdLagFresh, reportDeliveryDateLagFresh, 'Review VMD lag (fresh)'],
      [reviewIdTooOld, reportDeliveryDateTooOld, 'Review VMD too old'],
    ];
    await Promise.all(
      lagReviewSeeds.map(([id]) =>
        MonitoringReviewLink.findOrCreate({ where: { reviewId: id }, defaults: linkTimestamps })
      )
    );
    const [reviewLagStale] = await Promise.all(
      lagReviewSeeds.map(([id, deliveryDate, name]) =>
        MonitoringReview.create({
          reviewId: id,
          contentId: uuidv4(),
          statusId: REVIEW_STATUS_COMPLETE_ID,
          startDate: '2026-06-01',
          endDate: '2026-06-15',
          reviewType: 'FA-1',
          reportDeliveryDate: deliveryDate,
          outcome: 'Complete',
          name,
          hash: `hash-${uuidv4()}`,
          ...timestamps,
          sourceCreatedAt: reviewSourceCreatedAt,
        })
      )
    );

    // Backdate reviewIdLagStale's earliest audit row so the observation still
    // records a large lag, but the alert's freshness filter excludes it.
    await sequelize.query(
      `
      INSERT INTO "ZALMonitoringReviews"
        (data_id, dml_type, new_row_data, dml_timestamp, dml_by, dml_as, dml_txid)
      VALUES
        (:dataId, 'INSERT', :newRowData::jsonb, :dmlTimestamp, -1, -1, :dmlTxid)
      `,
      {
        replacements: {
          dataId: reviewLagStale.id,
          newRowData: JSON.stringify({
            reportDeliveryDate: reportDeliveryDateLagStale.toISOString(),
            sourceUpdatedAt: lagStaleLearnedDate.toISOString(),
          }),
          dmlTimestamp: lagStaleLearnedDate,
          dmlTxid: uuidv4(),
        },
      }
    );

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

    // The *_BOGUS_ID statusIds need their *StatusLinks row created (that's
    // what MonitoringReviews/MonitoringFindings/MonitoringFindingHistories
    // actually FK to - the real-world mechanism behind "unresolvable"), but
    // deliberately no matching *Statuses row with a name, so they stay
    // unresolvable -> review_status_resolvable / finding_status_resolvable /
    // history_status_resolvable.
    await Promise.all([
      MonitoringReviewStatusLink.findOrCreate({ where: { statusId: REVIEW_STATUS_BOGUS_ID } }),
      MonitoringFindingStatusLink.findOrCreate({ where: { statusId: FINDING_STATUS_BOGUS_ID } }),
      MonitoringFindingHistoryStatusLink.findOrCreate({
        where: { statusId: HISTORY_STATUS_BOGUS_ID },
      }),
    ]);

    // A second live MonitoringFindingStatus row sharing FINDING_STATUS_ACTIVE_ID's
    // statusId -> statuses_table_integrity.
    await MonitoringFindingStatus.create({
      statusId: FINDING_STATUS_ACTIVE_ID,
      name: FINDING_STATUS_DUPLICATE_NAME,
      ...timestamps,
    });

    // Named history statuses for history_vs_finding_status / history_vs_outcome.
    await Promise.all(
      [
        [HISTORY_STATUS_CORRECTED_ID, 'Corrected'],
        [HISTORY_STATUS_NEW_ID, 'New'],
      ].map(([statusId]) =>
        MonitoringFindingHistoryStatusLink.findOrCreate({ where: { statusId } })
      )
    );
    await Promise.all(
      [
        [HISTORY_STATUS_CORRECTED_ID, 'Corrected'],
        [HISTORY_STATUS_NEW_ID, 'New'],
      ].map(([statusId, name]) =>
        MonitoringFindingHistoryStatus.findOrCreate({
          where: { statusId },
          defaults: { statusId, name, ...timestamps },
        })
      )
    );

    // Standards for standard_consistency: A/B disagree on citation text; C/D
    // share a citation but disagree on guidance.
    await Promise.all(
      [
        STANDARD_ID_CITATION_A,
        STANDARD_ID_CITATION_B,
        STANDARD_ID_GUIDANCE_A,
        STANDARD_ID_GUIDANCE_B,
      ].map((standardId) =>
        MonitoringStandardLink.findOrCreate({ where: { standardId }, defaults: linkTimestamps })
      )
    );
    await Promise.all([
      MonitoringStandard.findOrCreate({
        where: { standardId: STANDARD_ID_CITATION_A },
        defaults: {
          standardId: STANDARD_ID_CITATION_A,
          contentId: `content-${uuidv4()}`,
          citation: 'Citation A',
          guidance: 'Fiscal',
          citable: 1,
          hash: `hash-${uuidv4()}`,
          ...timestamps,
        },
      }),
      MonitoringStandard.findOrCreate({
        where: { standardId: STANDARD_ID_CITATION_B },
        defaults: {
          standardId: STANDARD_ID_CITATION_B,
          contentId: `content-${uuidv4()}`,
          citation: 'Citation B',
          guidance: 'Fiscal',
          citable: 1,
          hash: `hash-${uuidv4()}`,
          ...timestamps,
        },
      }),
      MonitoringStandard.findOrCreate({
        where: { standardId: STANDARD_ID_GUIDANCE_A },
        defaults: {
          standardId: STANDARD_ID_GUIDANCE_A,
          contentId: `content-${uuidv4()}`,
          citation: 'Shared Citation',
          guidance: 'Fiscal',
          citable: 1,
          hash: `hash-${uuidv4()}`,
          ...timestamps,
        },
      }),
      MonitoringStandard.findOrCreate({
        where: { standardId: STANDARD_ID_GUIDANCE_B },
        defaults: {
          standardId: STANDARD_ID_GUIDANCE_B,
          contentId: `content-${uuidv4()}`,
          citation: 'Shared Citation',
          guidance: 'Health',
          citable: 1,
          hash: `hash-${uuidv4()}`,
          ...timestamps,
        },
      }),
    ]);

    // Three more reviews: one with an unresolvable status, one Compliant
    // review hosting most of the findings below, and one CLASS review.
    await Promise.all(
      [reviewIdBadStatus, reviewIdCompliant, reviewIdClassWithFindings].map((id) =>
        MonitoringReviewLink.findOrCreate({ where: { reviewId: id }, defaults: linkTimestamps })
      )
    );
    await Promise.all([
      MonitoringReview.create({
        reviewId: reviewIdBadStatus,
        contentId: uuidv4(),
        statusId: REVIEW_STATUS_BOGUS_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        reviewType: 'FA-1',
        reportDeliveryDate: reportDeliveryDateBadStatus,
        name: 'Review VMD bad status',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
        sourceCreatedAt: reviewSourceCreatedAt,
      }),
      MonitoringReview.create({
        reviewId: reviewIdCompliant,
        contentId: uuidv4(),
        statusId: REVIEW_STATUS_COMPLETE_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        reviewType: 'FA-1',
        reportDeliveryDate: reportDeliveryDateCompliant,
        outcome: 'Compliant',
        name: 'Review VMD compliant',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
        // Outside the last complete week, so it can't land in the weekly
        // reviews_created bucket the region-1 test asserts an exact count for.
        sourceCreatedAt: new Date(),
      }),
      MonitoringReview.create({
        reviewId: reviewIdClassWithFindings,
        contentId: uuidv4(),
        statusId: REVIEW_STATUS_COMPLETE_ID,
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        reviewType: 'CLASS',
        reportDeliveryDate: null,
        name: 'Review VMD class',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
        sourceCreatedAt: new Date(),
      }),
    ]);

    // A granteeId with two distinct grantNumbers, on reviewIdCompliant ->
    // review_grantee_multi_grant. Both grantNumbers need a GrantNumberLinks
    // row (Sequelize plumbing, not part of the check under test); doesn't
    // matter which Grant they resolve to.
    await Promise.all([
      GrantNumberLink.findOrCreate({
        where: { grantNumber: multiGrantNumberA },
        defaults: { grantId },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: multiGrantNumberB },
        defaults: { grantId },
      }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: multiGrantGranteeId } }),
    ]);
    const multiGrantGranteeRowId = faker.number.int({ min: 900000, max: 89999999 });
    await MonitoringReviewGrantee.bulkCreate(
      [multiGrantNumberA, multiGrantNumberB].map((grantNumberForMulti, i) => ({
        id: multiGrantGranteeRowId + i,
        grantNumber: grantNumberForMulti,
        reviewId: reviewIdCompliant,
        granteeId: multiGrantGranteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      }))
    );

    // A duplicated MonitoringReviewGrantees row (same grantNumber as the
    // first one above) and an orphaned one, both on the main `reviewId` ->
    // review_grantee_duplicated / review_grantee_orphaned_grant. The orphaned
    // grantNumber still needs a GrantNumberLinks row (MonitoringReviewGrantees
    // FKs to it - that table is Sequelize plumbing, not part of the check
    // under test), just one with no grantId, so it never resolves to a Grant.
    await GrantNumberLink.findOrCreate({
      where: { grantNumber: orphanedGrantNumber },
      defaults: { grantId: null },
    });
    // Not `granteeId` - reusing it here would give it two distinct
    // grantNumbers (grantNumber and orphanedGrantNumber), tripping
    // review_grantee_multi_grant unintentionally.
    await MonitoringGranteeLink.findOrCreate({ where: { granteeId: orphanedGranteeId } });
    await MonitoringReviewGrantee.bulkCreate([
      {
        id: reviewGranteeId + 2,
        grantNumber,
        reviewId,
        granteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        id: reviewGranteeId + 3,
        grantNumber: orphanedGrantNumber,
        reviewId,
        granteeId: orphanedGranteeId,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Test',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ]);

    // An extra history row linking the (already-clean) findingIdClosed to the
    // CLASS review -> review_type_shape's class_review_has_findings. Doesn't
    // touch the main reviewId's finding_count (that's scoped per-reviewId).
    await MonitoringFindingHistory.create({
      reviewId: reviewIdClassWithFindings,
      findingHistoryId: uuidv4(),
      findingId: findingIdClosed,
      statusId: FINDING_STATUS_ACTIVE_ID,
      narrative: 'Narrative VMD class',
      ordinal: 5,
      determination: 'Deficiency',
      name: 'History VMD class',
      ...timestamps,
    });

    // The remaining findings below all live on reviewIdCompliant so as not to
    // disturb the main reviewId's finding_count assertion. None carry a
    // MonitoringFindingGrant unless the test needs one, so they default to
    // 'consistent' for finding_grant_on_own_review.
    const newFindingIds = [
      findingIdGrantMismatch,
      findingIdDupHistory,
      findingIdBadDetermination,
      findingIdHistCorrectedDisagree,
      findingIdOpenOnCompliant,
      findingIdConcernOnCompliant,
      findingIdStandardVariance,
      findingIdCategoryVariance,
      findingIdBadFindingStatus,
      findingIdBadHistoryStatus,
    ];
    await Promise.all(
      newFindingIds.map((findingId) =>
        MonitoringFindingLink.findOrCreate({ where: { findingId }, defaults: linkTimestamps })
      )
    );
    await MonitoringFinding.bulkCreate([
      {
        findingId: findingIdGrantMismatch,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD grant mismatch',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdDupHistory,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD dup history',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdBadDetermination,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD bad determination',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdHistCorrectedDisagree,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD corrected disagree',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdOpenOnCompliant,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD open on compliant',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdConcernOnCompliant,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Area of Concern',
        source: 'FA-1',
        name: 'Finding VMD concern on compliant',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdStandardVariance,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: null,
        name: 'Finding VMD standard variance',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdCategoryVariance,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: null,
        name: 'Finding VMD category variance',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdBadFindingStatus,
        statusId: FINDING_STATUS_BOGUS_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD bad finding status',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdBadHistoryStatus,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Finding VMD bad history status',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
    ]);

    await MonitoringFindingHistory.bulkCreate([
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdGrantMismatch,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative VMD',
        ordinal: 0,
        determination: 'Deficiency',
        name: 'History VMD',
        ...timestamps,
      },
      // Two disagreeing history rows for the same (findingId, reviewId) pair.
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdDupHistory,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative VMD dup 1',
        ordinal: 0,
        determination: 'Deficiency',
        name: 'History VMD dup 1',
        ...timestamps,
      },
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdDupHistory,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative VMD dup 2',
        ordinal: 1,
        determination: 'Noncompliance',
        name: 'History VMD dup 2',
        ...timestamps,
      },
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdBadDetermination,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative VMD',
        ordinal: 0,
        determination: 'Some Bogus Determination',
        name: 'History VMD',
        ...timestamps,
      },
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdHistCorrectedDisagree,
        statusId: HISTORY_STATUS_CORRECTED_ID,
        narrative: 'Narrative VMD',
        ordinal: 0,
        determination: 'Deficiency',
        name: 'History VMD',
        ...timestamps,
      },
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdOpenOnCompliant,
        statusId: HISTORY_STATUS_NEW_ID,
        narrative: 'Narrative VMD',
        ordinal: 0,
        determination: 'Deficiency',
        name: 'History VMD',
        ...timestamps,
      },
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdConcernOnCompliant,
        statusId: HISTORY_STATUS_NEW_ID,
        narrative: 'Narrative VMD',
        ordinal: 0,
        determination: 'Concern',
        name: 'History VMD',
        ...timestamps,
      },
      {
        reviewId: reviewIdCompliant,
        findingHistoryId: uuidv4(),
        findingId: findingIdBadHistoryStatus,
        statusId: HISTORY_STATUS_BOGUS_ID,
        narrative: 'Narrative VMD',
        ordinal: 0,
        determination: 'Deficiency',
        name: 'History VMD',
        ...timestamps,
      },
    ]);

    // findingIdGrantMismatch's own grant belongs to a granteeId that appears
    // in no MonitoringReviewGrantees row anywhere, so it can't be "on" any
    // review it's linked to -> finding_grant_on_own_review.
    await MonitoringFindingGrant.create({
      findingId: findingIdGrantMismatch,
      granteeId: uuidv4(),
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    await MonitoringFindingStandard.bulkCreate([
      {
        findingId: findingIdStandardVariance,
        standardId: STANDARD_ID_CITATION_A,
        name: 'Standard VMD A',
        ...timestamps,
      },
      {
        findingId: findingIdStandardVariance,
        standardId: STANDARD_ID_CITATION_B,
        name: 'Standard VMD B',
        ...timestamps,
      },
      {
        findingId: findingIdCategoryVariance,
        standardId: STANDARD_ID_GUIDANCE_A,
        name: 'Standard VMD C',
        ...timestamps,
      },
      {
        findingId: findingIdCategoryVariance,
        standardId: STANDARD_ID_GUIDANCE_B,
        name: 'Standard VMD D',
        ...timestamps,
      },
    ]);

    // Fact-table checks: Citations.active / DeliveredReviews.complete
    // reopening, detected from their own ZAL audit history. No FK ties these
    // to real MonitoringFindings/MonitoringReviews rows, so arbitrary
    // mfid/finding_uuid/mrid values are fine.
    //
    // A real create-then-update naturally produces a genuine false->true (or
    // true->false) audit transition at "now" - the trigger stamps
    // dml_timestamp itself, so it can't be backdated in the INSERT/UPDATE
    // call. For the "stale" cases, the real transition is backdated
    // afterwards by updating its own ZAL row's dml_timestamp directly (a
    // controlled edit to a real transition, not a fabricated one).
    await Citation.bulkCreate(
      [citationIdFreshLinked, citationIdFreshUnlinked, citationIdStale].map((id) => ({
        id,
        mfid: faker.number.int({ min: 900000, max: 89999999 }),
        finding_uuid: uuidv4(),
        active: false,
        calculated_status: 'Corrected',
      }))
    );
    await DeliveredReview.bulkCreate([
      {
        id: deliveredReviewIdFresh,
        mrid: faker.number.int({ min: 900000, max: 89999999 }),
        complete: true,
      },
      {
        id: deliveredReviewIdStale,
        mrid: faker.number.int({ min: 900000, max: 89999999 }),
        complete: true,
      },
    ]);
    await Promise.all([
      Citation.update(
        { active: true, calculated_status: 'Active' },
        { where: { id: [citationIdFreshLinked, citationIdFreshUnlinked, citationIdStale] } }
      ),
      DeliveredReview.update(
        { complete: false },
        { where: { id: [deliveredReviewIdFresh, deliveredReviewIdStale] } }
      ),
    ]);
    // ZAL* tables block plain UPDATEs; ZAFSetTriggerState brackets a
    // sanctioned edit (see maintainMonitoringData.js), and needs
    // audit.auditDescriptor set first via prepMigration - both in one
    // explicit transaction, since that config is transaction-local. Distinct
    // timestamps for the INSERT vs. UPDATE row avoid tying LAG's ORDER BY.
    await sequelize.transaction(async (auditTransaction) => {
      await prepMigration(
        sequelize.getQueryInterface(),
        auditTransaction,
        `VMD-${uuidv4()}`,
        'VMD test backdate'
      );
      await setAuditLoggingState(sequelize.getQueryInterface(), auditTransaction, false);
      await sequelize.query(
        `
        UPDATE "ZALCitations" SET dml_timestamp = CASE WHEN dml_type = 'INSERT' THEN :staleInsertTs::timestamptz ELSE :staleTs::timestamptz END
        WHERE data_id = :idStale AND new_row_data ? 'active';
        UPDATE "ZALDeliveredReviews" SET dml_timestamp = CASE WHEN dml_type = 'INSERT' THEN :staleInsertTs::timestamptz ELSE :staleTs::timestamptz END
        WHERE data_id = :drStale AND new_row_data ? 'complete';
        `,
        {
          transaction: auditTransaction,
          replacements: {
            idStale: citationIdStale,
            drStale: deliveredReviewIdStale,
            staleInsertTs: new Date(citationReopenedStaleAt.getTime() - 24 * 60 * 60 * 1000),
            staleTs: citationReopenedStaleAt,
          },
        }
      );
      await setAuditLoggingState(sequelize.getQueryInterface(), auditTransaction, true);
    });

    // A real (non-deleted) Activity Report citing citationIdFreshLinked, so
    // its reopening should be an alert, not just a team_notification.
    factTableUser = await User.create({
      homeRegionId: 1,
      hsesUsername: `user-vmd-${uuidv4().slice(0, 8)}`,
      hsesUserId: `user-vmd-${uuidv4().slice(0, 8)}`,
      lastLogin: new Date(),
    });
    factTableReport = await ActivityReport.create({
      userId: factTableUser.id,
      regionId: 1,
      submissionStatus: 'submitted',
      calculatedStatus: 'approved',
      endDate: '2026-01-15',
      startDate: '2026-01-10',
      numberOfParticipants: 1,
      deliveryMethod: 'method',
      duration: 1,
      activityRecipientType: 'recipient',
      requester: 'requester',
      targetPopulations: ['pop'],
      reason: ['reason'],
      participants: ['participants'],
      topics: ['topics'],
      ttaType: ['type'],
      language: ['English'],
      activityReason: 'reason',
      version: 2,
      creatorRole: 'TTAC',
    });
    factTableObjective = await Objective.create({
      title: 'VMD fact-table objective',
      status: 'Not Started',
    });
    const factTableReportObjective = await ActivityReportObjective.create({
      activityReportId: factTableReport.id,
      objectiveId: factTableObjective.id,
    });
    await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: factTableReportObjective.id,
      citationId: citationIdFreshLinked,
      citation: 'VMD citation text',
      grantNumber,
      findingId: findingIdClosed,
      grantId,
      reviewName: 'Review VMD',
      standardId: STANDARD_ID_CITATION_A,
      findingType: 'Deficiency',
      findingSource: null,
      acro: 'FA-1',
      name: 'VMD fact-table citation',
      severity: 1,
      reportDeliveryDate: '2026-01-01',
      monitoringFindingStatusName: 'Active',
    });

    // A second, still-editable (submitted) report, for
    // activity_report_citation_source_deleted_editable.
    editableReport = await ActivityReport.create({
      userId: factTableUser.id,
      regionId: 1,
      submissionStatus: 'submitted',
      calculatedStatus: 'submitted',
      endDate: '2026-01-15',
      startDate: '2026-01-10',
      numberOfParticipants: 1,
      deliveryMethod: 'method',
      duration: 1,
      activityRecipientType: 'recipient',
      requester: 'requester',
      targetPopulations: ['pop'],
      reason: ['reason'],
      participants: ['participants'],
      topics: ['topics'],
      ttaType: ['type'],
      language: ['English'],
      activityReason: 'reason',
      version: 2,
      creatorRole: 'TTAC',
    });
    editableObjective = await Objective.create({
      title: 'VMD editable fact-table objective',
      status: 'Not Started',
    });
    const editableReportObjective = await ActivityReportObjective.create({
      activityReportId: editableReport.id,
      objectiveId: editableObjective.id,
    });

    // Two Citations, already soft-deleted (recently, so within the alert's
    // freshness window) - one cited on the approved report above, one on the
    // editable one.
    await Citation.bulkCreate([
      {
        id: citationIdOrphanedApproved,
        mfid: faker.number.int({ min: 900000, max: 89999999 }),
        finding_uuid: uuidv4(),
        active: false,
        calculated_status: 'Corrected',
        deletedAt: citationSourceDeletedAt,
      },
      {
        id: citationIdOrphanedEditable,
        mfid: faker.number.int({ min: 900000, max: 89999999 }),
        finding_uuid: uuidv4(),
        active: false,
        calculated_status: 'Corrected',
        deletedAt: citationSourceDeletedAt,
      },
    ]);
    await ActivityReportObjectiveCitation.bulkCreate([
      {
        activityReportObjectiveId: factTableReportObjective.id,
        citationId: citationIdOrphanedApproved,
        citation: 'VMD orphaned citation text',
        grantNumber,
        findingId: findingIdClosed,
        grantId,
        reviewName: 'Review VMD',
        standardId: STANDARD_ID_CITATION_A,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FA-1',
        name: 'VMD orphaned citation (approved)',
        severity: 1,
        reportDeliveryDate: '2026-01-01',
        monitoringFindingStatusName: 'Active',
      },
      {
        activityReportObjectiveId: editableReportObjective.id,
        citationId: citationIdOrphanedEditable,
        citation: 'VMD orphaned citation text',
        grantNumber,
        findingId: findingIdClosed,
        grantId,
        reviewName: 'Review VMD',
        standardId: STANDARD_ID_CITATION_A,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FA-1',
        name: 'VMD orphaned citation (editable)',
        severity: 1,
        reportDeliveryDate: '2026-01-01',
        monitoringFindingStatusName: 'Active',
      },
    ]);
  });

  afterAll(async () => {
    const runIds = (
      await ValidationRun.findAll({
        where: {
          process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
          import_id: OWN_IMPORT_IDS,
        },
        attributes: ['id'],
        raw: true,
      })
    ).map((r) => r.id);
    await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRecord.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRun.destroy({ where: { id: runIds }, force: true });
    // ValidationTimeSeries has no run/import column - it's recomputed globally,
    // not scoped per run - so narrow to the feature_set/region keys this file's
    // own fixtures (regions 1 and 2, plus their region_id 0 national dedup) can
    // produce, rather than wiping the shared table.
    await ValidationTimeSeries.destroy({
      where: { feature_set: ['monitoring_reviews', 'monitoring_findings'], region_id: [0, 1, 2] },
      force: true,
    });

    const allFindingIds = [
      findingIdClosed,
      findingIdNoCategory,
      findingIdGrantMismatch,
      findingIdDupHistory,
      findingIdBadDetermination,
      findingIdHistCorrectedDisagree,
      findingIdOpenOnCompliant,
      findingIdConcernOnCompliant,
      findingIdStandardVariance,
      findingIdCategoryVariance,
      findingIdBadFindingStatus,
      findingIdBadHistoryStatus,
    ];
    await MonitoringFindingGrant.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingStandard.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingHistory.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFinding.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingLink.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringReviewGrantee.destroy({
      where: { reviewId: [reviewId, reviewIdCompliant] },
      force: true,
    });
    const lagReviewIds = [reviewIdLagStale, reviewIdLagFresh, reviewIdTooOld];
    const otherReviewIds = [reviewIdBadStatus, reviewIdCompliant, reviewIdClassWithFindings];
    await MonitoringReview.destroy({
      where: { reviewId: [reviewId, ...lagReviewIds, ...otherReviewIds] },
      force: true,
    });
    await MonitoringReviewLink.destroy({
      where: { reviewId: [reviewId, ...lagReviewIds, ...otherReviewIds] },
      force: true,
    });
    // ZALMonitoringReviews rows (including the synthetic one for
    // reviewIdLagStale) are append-only audit history and intentionally left
    // in place - not cleaned up here, matching how reviewId's own
    // auto-generated audit rows are already left alone.
    await MonitoringGranteeLink.destroy({
      where: { granteeId: [granteeId, orphanedGranteeId, multiGrantGranteeId] },
      force: true,
    });
    await GrantNumberLink.destroy({
      where: {
        grantNumber: [
          grantNumber,
          grantNumber2,
          orphanedGrantNumber,
          multiGrantNumberA,
          multiGrantNumberB,
        ],
      },
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
    await MonitoringFindingHistoryStatus.destroy({
      where: { statusId: [HISTORY_STATUS_CORRECTED_ID, HISTORY_STATUS_NEW_ID] },
      force: true,
    });
    // MonitoringStandard/MonitoringStandardLink and the *StatusLink tables use
    // findOrCreate on fixed, reserved ids (like REVIEW_STATUS_COMPLETE_ID
    // above) and are intentionally left in place across runs, same as the
    // existing status links.

    await ActivityReportObjectiveCitation.destroy({
      where: {
        citationId: [citationIdFreshLinked, citationIdOrphanedApproved, citationIdOrphanedEditable],
      },
      force: true,
    });
    await ActivityReportObjective.destroy({
      where: { activityReportId: [factTableReport.id, editableReport.id] },
      force: true,
    });
    await Objective.destroy({
      where: { id: [factTableObjective.id, editableObjective.id] },
      force: true,
    });
    await ActivityReport.destroy({
      where: { id: [factTableReport.id, editableReport.id] },
      force: true,
    });
    await User.destroy({ where: { id: factTableUser.id }, force: true });
    await Citation.destroy({
      where: {
        id: [
          citationIdFreshLinked,
          citationIdFreshUnlinked,
          citationIdStale,
          citationIdOrphanedApproved,
          citationIdOrphanedEditable,
        ],
      },
      force: true,
    });
    await DeliveredReview.destroy({
      where: { id: [deliveredReviewIdFresh, deliveredReviewIdStale] },
      force: true,
    });
    // ZALCitations/ZALDeliveredReviews rows are append-only audit history and
    // intentionally left in place, same as the raw-data ZAL rows above.

    await sequelize.close();
  });

  it('records a successful run with counts and produces the summary artifacts', async () => {
    await validateMonitoringData();

    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
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
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
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

    // noCategoryFinding also has zero MonitoringFindingStandard rows.
    const noStandard = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: noCategoryFinding.id,
        observation_name: 'finding_standard_missing',
      },
      raw: true,
    });
    expect(noStandard.category).toBe('no_live_standard');

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
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id },
      raw: true,
    });
    const checkNames = alerts.map((a) => a.check_name);
    expect(checkNames).toContain('finding_category_missing');
    // observation-only now - no ops alert for a closedDate on an Active finding
    expect(checkNames).not.toContain('finding_active_with_closed_date');

    const categoryMissing = alerts.find((a) => a.check_name === 'finding_category_missing');
    expect(categoryMissing.severity).toBe(VALIDATION_ALERT_SEVERITY.TEAM_NOTIFICATION);

    const noCategoryFinding = await MonitoringFinding.findOne({
      where: { findingId: findingIdNoCategory },
    });
    const standardMissing = alerts.find((a) => a.check_name === 'finding_standard_missing');
    expect(standardMissing.severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(standardMissing.context.sample_entity_ids).toContain(noCategoryFinding.id);
  });

  it('records delivery_report_lag_days for every in-window review but only alerts on freshly-learned lag', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const [reviewLagStale, reviewLagFresh, reviewTooOld] = await Promise.all([
      MonitoringReview.findOne({ where: { reviewId: reviewIdLagStale } }),
      MonitoringReview.findOne({ where: { reviewId: reviewIdLagFresh } }),
      MonitoringReview.findOne({ where: { reviewId: reviewIdTooOld } }),
    ]);

    const [staleRecord, freshRecord, tooOldRecord] = await Promise.all([
      ValidationRecord.findOne({
        where: {
          run_id: run.id,
          entity_type: 'MonitoringReviews',
          entity_id: reviewLagStale.id,
          observation_name: 'delivery_report_lag_days',
        },
        raw: true,
      }),
      ValidationRecord.findOne({
        where: {
          run_id: run.id,
          entity_type: 'MonitoringReviews',
          entity_id: reviewLagFresh.id,
          observation_name: 'delivery_report_lag_days',
        },
        raw: true,
      }),
      ValidationRecord.findOne({
        where: {
          run_id: run.id,
          entity_type: 'MonitoringReviews',
          entity_id: reviewTooOld.id,
          observation_name: 'delivery_report_lag_days',
        },
        raw: true,
      }),
    ]);

    // Both in-window reviews are recorded, with the learned_date each read from.
    expect(Number(staleRecord.scalar)).toBeGreaterThan(7);
    expect(staleRecord.context.learned_date).toBe(lagStaleLearnedDate.toISOString().slice(0, 10));
    expect(Number(freshRecord.scalar)).toBeGreaterThan(7);

    // Before monitoring_validation_window's start_date -> no observation at all.
    expect(tooOldRecord).toBeNull();

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'review_delivery_report_lag' },
      raw: true,
    });
    expect(alerts).toHaveLength(1);
    const sampleIds = alerts[0].context.sample_entity_ids;
    // The stale (long-known-about) lag is recorded but not alerted; the
    // freshly-learned one is.
    expect(sampleIds).not.toContain(reviewLagStale.id);
    expect(sampleIds).toContain(reviewLagFresh.id);
  });

  it('flags a review with an unresolvable statusId as unresolvable and not-Complete-despite-delivery', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const badStatusReview = await MonitoringReview.findOne({
      where: { reviewId: reviewIdBadStatus },
    });

    const resolvable = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: badStatusReview.id,
        observation_name: 'review_status_resolvable',
      },
      raw: true,
    });
    expect(resolvable.category).toBe('unresolvable');

    const vsDelivery = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: badStatusReview.id,
        observation_name: 'review_status_vs_delivery',
      },
      raw: true,
    });
    expect(vsDelivery.category).toBe('delivered_not_complete');

    const alerts = await ValidationAlert.findAll({ where: { run_id: run.id }, raw: true });
    const unresolvableAlert = alerts.find((a) => a.check_name === 'review_status_unresolvable');
    expect(unresolvableAlert.context.sample_entity_ids).toContain(badStatusReview.id);
    const vsDeliveryAlert = alerts.find(
      (a) => a.check_name === 'review_status_vs_delivery_mismatch'
    );
    expect(vsDeliveryAlert.context.sample_entity_ids).toContain(badStatusReview.id);
  });

  it('flags duplicated and orphaned review-grantee links', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const review = await MonitoringReview.findOne({ where: { reviewId } });

    const duplicated = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: review.id,
        observation_name: 'review_grantee_duplicated',
      },
      raw: true,
    });
    expect(duplicated.category).toBe('duplicated');

    const orphaned = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: review.id,
        observation_name: 'review_grantee_orphaned_grant',
      },
      raw: true,
    });
    expect(orphaned.category).toBe('orphaned_grant_number');

    const alerts = await ValidationAlert.findAll({ where: { run_id: run.id }, raw: true });
    expect(
      alerts.find((a) => a.check_name === 'review_grantee_duplicated').context.sample_entity_ids
    ).toContain(review.id);
    expect(
      alerts.find((a) => a.check_name === 'review_grantee_orphaned_grant').context.sample_entity_ids
    ).toContain(review.id);
  });

  it('flags a review whose granteeId resolves to more than one grant', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const compliantReview = await MonitoringReview.findOne({
      where: { reviewId: reviewIdCompliant },
    });

    const multiGrant = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: compliantReview.id,
        observation_name: 'review_grantee_multi_grant',
      },
      raw: true,
    });
    expect(multiGrant.category).toBe('grantee_multi_grant');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'review_grantee_multi_grant' },
      raw: true,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(alerts[0].context.sample_entity_ids).toContain(compliantReview.id);
  });

  it('flags a CLASS review with a linked finding', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const classReview = await MonitoringReview.findOne({
      where: { reviewId: reviewIdClassWithFindings },
    });

    const shape = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringReviews',
        entity_id: classReview.id,
        observation_name: 'review_type_shape',
      },
      raw: true,
    });
    expect(shape.category).toBe('class_review_has_findings');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'review_type_shape_violation' },
      raw: true,
    });
    expect(alerts[0].context.sample_entity_ids).toContain(classReview.id);
  });

  it('flags a finding whose own grant is not on any of its linked reviews', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const finding = await MonitoringFinding.findOne({
      where: { findingId: findingIdGrantMismatch },
    });

    const record = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: finding.id,
        observation_name: 'finding_grant_on_own_review',
      },
      raw: true,
    });
    expect(record.category).toBe('grant_not_on_own_review');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'finding_grant_not_on_own_review' },
      raw: true,
    });
    expect(alerts[0].context.sample_entity_ids).toContain(finding.id);
  });

  it('flags a finding with disagreeing duplicate history rows on the same review', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const finding = await MonitoringFinding.findOne({ where: { findingId: findingIdDupHistory } });

    const record = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: finding.id,
        observation_name: 'finding_review_history_duplicated',
      },
      raw: true,
    });
    expect(record.category).toBe('duplicated_disagreeing');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'finding_review_history_duplicated' },
      raw: true,
    });
    expect(alerts[0].context.sample_entity_ids).toContain(finding.id);
  });

  it('flags an unrecognized history determination value', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const finding = await MonitoringFinding.findOne({
      where: { findingId: findingIdBadDetermination },
    });

    const record = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: finding.id,
        observation_name: 'history_determination_recognized',
      },
      raw: true,
    });
    expect(record.category).toBe('Some Bogus Determination');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'history_determination_unrecognized' },
      raw: true,
    });
    expect(alerts[0].context.sample_entity_ids).toContain(finding.id);
  });

  it('flags unresolvable finding and history statusIds', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const [badFindingStatus, badHistoryStatus] = await Promise.all([
      MonitoringFinding.findOne({ where: { findingId: findingIdBadFindingStatus } }),
      MonitoringFinding.findOne({ where: { findingId: findingIdBadHistoryStatus } }),
    ]);

    const findingStatusRecord = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: badFindingStatus.id,
        observation_name: 'finding_status_resolvable',
      },
      raw: true,
    });
    expect(findingStatusRecord.category).toBe('unresolvable');

    const historyStatusRecord = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: badHistoryStatus.id,
        observation_name: 'history_status_resolvable',
      },
      raw: true,
    });
    expect(historyStatusRecord.category).toBe('unresolvable');

    const alerts = await ValidationAlert.findAll({ where: { run_id: run.id }, raw: true });
    expect(
      alerts.find((a) => a.check_name === 'finding_status_unresolvable').context.sample_entity_ids
    ).toContain(badFindingStatus.id);
    expect(
      alerts.find((a) => a.check_name === 'history_status_unresolvable').context.sample_entity_ids
    ).toContain(badHistoryStatus.id);
  });

  it('flags a duplicated live status row in a *Statuses table', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const duplicateStatusRow = await MonitoringFindingStatus.findOne({
      where: { statusId: FINDING_STATUS_ACTIVE_ID, name: FINDING_STATUS_DUPLICATE_NAME },
    });

    const record = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindingStatuses',
        entity_id: duplicateStatusRow.id,
        observation_name: 'statuses_table_integrity',
      },
      raw: true,
    });
    expect(record.category).toBe('duplicate_live_status');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'statuses_table_integrity_violated' },
      raw: true,
    });
    // Not asserting our row is in context.sample_entity_ids: this check scans
    // the whole *Statuses tables, not just our fixtures, so on a database
    // with enough other duplicates already in it, the sample (truncated to
    // 20) could legitimately not include ours. count and severity are the
    // reliable signals here.
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(alerts[0].context.count).toBeGreaterThanOrEqual(1);
  });

  it('flags standards that disagree on citation text or (with no source) guidance', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const [citationFinding, categoryFinding] = await Promise.all([
      MonitoringFinding.findOne({ where: { findingId: findingIdStandardVariance } }),
      MonitoringFinding.findOne({ where: { findingId: findingIdCategoryVariance } }),
    ]);

    const citationRecord = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: citationFinding.id,
        observation_name: 'standard_consistency',
      },
      raw: true,
    });
    expect(citationRecord.category).toBe('citation_text_disagrees');

    const categoryRecord = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: categoryFinding.id,
        observation_name: 'standard_consistency',
      },
      raw: true,
    });
    expect(categoryRecord.category).toBe('category_disagrees_no_source');

    const alerts = await ValidationAlert.findAll({ where: { run_id: run.id }, raw: true });
    expect(
      alerts.find((a) => a.check_name === 'finding_standard_citation_text_disagrees').context
        .sample_entity_ids
    ).toContain(citationFinding.id);
    expect(
      alerts.find((a) => a.check_name === 'finding_standard_category_disagrees').context
        .sample_entity_ids
    ).toContain(categoryFinding.id);
  });

  it('flags a finding whose latest-delivered history says Corrected but the finding-level status disagrees', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const finding = await MonitoringFinding.findOne({
      where: { findingId: findingIdHistCorrectedDisagree },
    });

    const record = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: finding.id,
        observation_name: 'history_vs_finding_status',
      },
      raw: true,
    });
    expect(record.category).toBe('history_corrected_finding_disagrees');
    // The history row was just created, so it's freshly learned about.
    expect(record.context.learned_at).not.toBeNull();

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'history_vs_finding_status_disagrees' },
      raw: true,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(VALIDATION_ALERT_SEVERITY.TEAM_NOTIFICATION);
    expect(alerts[0].context.sample_entity_ids).toContain(finding.id);
  });

  it('flags an open history status on a Compliant-outcome review, excluding Area of Concern findings', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });
    const [openFinding, concernFinding] = await Promise.all([
      MonitoringFinding.findOne({ where: { findingId: findingIdOpenOnCompliant } }),
      MonitoringFinding.findOne({ where: { findingId: findingIdConcernOnCompliant } }),
    ]);

    const openRecord = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: openFinding.id,
        observation_name: 'history_vs_outcome',
      },
      raw: true,
    });
    expect(openRecord.category).toBe('open_status_on_compliant_review');

    // Same shape (New history status on a Compliant review), but an Area of
    // Concern finding is resolved through goal closure, not this cycle.
    const concernRecord = await ValidationRecord.findOne({
      where: {
        run_id: run.id,
        entity_type: 'MonitoringFindings',
        entity_id: concernFinding.id,
        observation_name: 'history_vs_outcome',
      },
      raw: true,
    });
    expect(concernRecord.category).toBe('consistent');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'history_vs_outcome_disagrees' },
      raw: true,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(alerts[0].context.sample_entity_ids).toContain(openFinding.id);
    expect(alerts[0].context.sample_entity_ids).not.toContain(concernFinding.id);
  });

  it('flags a reopened Citation, split by whether it is cited on a real activity report', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });

    const [linkedRecord, unlinkedRecord, staleRecord] = await Promise.all(
      [citationIdFreshLinked, citationIdFreshUnlinked, citationIdStale].map((entity_id) =>
        ValidationRecord.findOne({
          where: {
            run_id: run.id,
            entity_type: 'Citations',
            entity_id,
            observation_name: 'citation_reopened',
          },
          raw: true,
        })
      )
    );
    // All three really did reopen - only freshness/AR-linkage differ.
    expect(linkedRecord.category).toBe('reopened');
    expect(unlinkedRecord.category).toBe('reopened');
    expect(staleRecord.category).toBe('reopened');

    const alerts = await ValidationAlert.findAll({ where: { run_id: run.id }, raw: true });
    const onAr = alerts.find((a) => a.check_name === 'citation_reopened_on_activity_report');
    expect(onAr.severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(onAr.context.sample_entity_ids).toContain(citationIdFreshLinked);
    expect(onAr.context.sample_entity_ids).not.toContain(citationIdFreshUnlinked);

    const notOnAr = alerts.find((a) => a.check_name === 'citation_reopened');
    expect(notOnAr.severity).toBe(VALIDATION_ALERT_SEVERITY.TEAM_NOTIFICATION);
    expect(notOnAr.context.sample_entity_ids).toContain(citationIdFreshUnlinked);
    expect(notOnAr.context.sample_entity_ids).not.toContain(citationIdFreshLinked);

    // The stale reopening is recorded but too old to be in either alert.
    expect(onAr.context.sample_entity_ids).not.toContain(citationIdStale);
    expect(notOnAr.context.sample_entity_ids).not.toContain(citationIdStale);
  });

  it('flags a DeliveredReview that is no longer complete', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });

    const [freshRecord, staleRecord] = await Promise.all(
      [deliveredReviewIdFresh, deliveredReviewIdStale].map((entity_id) =>
        ValidationRecord.findOne({
          where: {
            run_id: run.id,
            entity_type: 'DeliveredReviews',
            entity_id,
            observation_name: 'delivered_review_completion_state',
          },
          raw: true,
        })
      )
    );
    expect(freshRecord.category).toBe('reopened');
    expect(staleRecord.category).toBe('reopened');

    const alerts = await ValidationAlert.findAll({
      where: { run_id: run.id, check_name: 'delivered_review_reopened' },
      raw: true,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe(VALIDATION_ALERT_SEVERITY.TEAM_NOTIFICATION);
    expect(alerts[0].context.sample_entity_ids).toContain(deliveredReviewIdFresh);
    expect(alerts[0].context.sample_entity_ids).not.toContain(deliveredReviewIdStale);
  });

  it('flags approved and editable reports that cite a since-deleted Citation, split by severity', async () => {
    const run = await ValidationRun.findOne({
      where: {
        process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
        import_id: DEFAULT_CYCLE.import_id,
      },
      order: [['id', 'DESC']],
    });

    const [approvedAroc, editableAroc] = await Promise.all([
      ActivityReportObjectiveCitation.findOne({
        where: { citationId: citationIdOrphanedApproved },
      }),
      ActivityReportObjectiveCitation.findOne({
        where: { citationId: citationIdOrphanedEditable },
      }),
    ]);

    const [approvedRecord, editableRecord] = await Promise.all(
      [approvedAroc, editableAroc].map(({ id: entity_id }) =>
        ValidationRecord.findOne({
          where: {
            run_id: run.id,
            entity_type: 'ActivityReportObjectiveCitations',
            entity_id,
            observation_name: 'activity_report_citation_source_deleted',
          },
          raw: true,
        })
      )
    );
    expect(approvedRecord.category).toBe('source_deleted');
    expect(editableRecord.category).toBe('source_deleted');

    const alerts = await ValidationAlert.findAll({ where: { run_id: run.id }, raw: true });

    // Not asserting first_activity_report_id is specifically ours: "first" is
    // ordered by report id table-wide, and a shared, not-guaranteed-clean
    // database could have an older, unrelated match that legitimately wins
    // (same reasoning as the statuses_table_integrity sample check above).
    // count and severity, and that the pointer is populated at all, are the
    // reliable signals.
    const approvedAlert = alerts.find(
      (a) => a.check_name === 'activity_report_citation_source_deleted'
    );
    expect(approvedAlert.severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(approvedAlert.context.count).toBeGreaterThanOrEqual(1);
    expect(approvedAlert.context.first_activity_report_id).not.toBeNull();
    expect(approvedAlert.context.first_recipient_name).not.toBeNull();

    const editableAlert = alerts.find(
      (a) => a.check_name === 'activity_report_citation_source_deleted_editable'
    );
    expect(editableAlert.severity).toBe(VALIDATION_ALERT_SEVERITY.ALERT);
    expect(editableAlert.context.count).toBeGreaterThanOrEqual(1);
    expect(editableAlert.context.first_activity_report_id).not.toBeNull();
    expect(editableAlert.context.first_recipient_name).not.toBeNull();
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
    const latestRun = (importId) =>
      ValidationRun.findOne({
        where: { process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH, import_id: importId },
        order: [['id', 'DESC']],
      });
    const recordCount = (runId) => ValidationRecord.count({ where: { run_id: runId } });

    // Cycle A, then cycle B (distinct import ids = distinct data versions).
    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: CYCLE_A_ID,
      source_updated_at: new Date('2026-07-20T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runA = await latestRun(CYCLE_A_ID);

    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: CYCLE_B_ID,
      source_updated_at: new Date('2026-07-27T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runB = await latestRun(CYCLE_B_ID);

    // grouping: each run is stamped with its own cycle
    expect(runA.import_id).toBe(CYCLE_A_ID);
    expect(runB.import_id).toBe(CYCLE_B_ID);
    // a different cycle is never collateral damage
    expect(await recordCount(runA.id)).toBeGreaterThan(0);
    expect(await recordCount(runB.id)).toBeGreaterThan(0);

    // Re-run cycle B: replaces runB's data, leaves cycle A untouched.
    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: CYCLE_B_ID,
      source_updated_at: new Date('2026-07-27T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runB2 = await latestRun(CYCLE_B_ID);

    expect(await recordCount(runB2.id)).toBeGreaterThan(0);
    expect(await recordCount(runB.id)).toBe(0); // same-cycle predecessor deleted
    expect(await recordCount(runA.id)).toBeGreaterThan(0); // different cycle preserved

    // Cycle C: cycle A (now two back) rolls off; previous cycle (B2) stays.
    getMonitoringImportCycle.mockResolvedValueOnce({
      import_id: CYCLE_C_ID,
      source_updated_at: new Date('2026-08-03T00:00:00.000Z'),
    });
    await validateMonitoringData();
    const runC = await latestRun(CYCLE_C_ID);

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
