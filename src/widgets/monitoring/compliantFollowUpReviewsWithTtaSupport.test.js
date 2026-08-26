import { TRACE_IDS } from '@ttahub/common';
import { Op } from 'sequelize';
import { v4 as uuid } from 'uuid';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../constants';
import db from '../../models';
import {
  createGoal,
  createGrant,
  createRecipient,
  createRegion,
  createReport,
  createUser,
  destroyGoal,
  destroyReport,
  getUniqueId,
} from '../../testUtils';
import compliantFollowUpReviewsWithTtaSupport from './compliantFollowUpReviewsWithTtaSupport';
import monitoringOverview from './monitoringOverview';

const {
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantCitation,
  GrantDeliveredReview,
  Objective,
} = db;

const EMPTY_RESULT = {
  name: 'Compliant Follow-up Reviews with TTA Support',
  months: [],
  reviews: [
    { name: 'Follow-up reviews with TTA', values: [] },
    { name: 'Follow-up reviews without TTA', values: [] },
    { name: 'Total', values: [] },
  ],
  id: TRACE_IDS.COMPLIANT_FOLLOW_UP_REVIEWS_WITH_TTA_SUPPORT,
};

describe('compliantFollowUpReviewsWithTtaSupport', () => {
  let region;
  let recipient;
  let grant;
  let user;
  let report;
  let goal;
  let objective;
  let aro;
  let aroCitation;

  let citationNoncompliance;
  let citationAreaOfConcern;
  let grantCitationNoncompliance;
  let grantCitationAreaOfConcern;

  // reviewWithTta: has a scoped Noncompliance citation and an approved AR whose endDate
  //   falls after the initial review delivery date and before this follow-up review delivery date.
  // reviewWithoutTta: has the same scoped citation but the AR's endDate is after this review's
  //   delivery date, so it does not count as TTA.
  // reviewWrongFindingType: only has an Area of Concern citation — excluded from review_set
  //   when the grantCitation scope is restricted to Noncompliance
  let reviewWithTta;
  let reviewWithoutTta;
  let reviewWrongFindingType;
  let drcWithTta;
  let drcWithoutTta;
  let drcWrongType;
  let gdrWithTta;
  let gdrWithoutTta;
  let gdrWrongType;

  beforeAll(async () => {
    const userIdentifier = uuid();
    const mfidSeed = Math.floor(Math.random() * 1_000_000_000);
    const grantNumber = `19HP${mfidSeed}`;

    region = await createRegion();
    recipient = await createRecipient({ name: `Compliant Reviews Recipient ${mfidSeed}` });
    grant = await createGrant({
      recipientId: recipient.id,
      regionId: region.id,
      number: grantNumber,
      status: 'Active',
    });
    user = await createUser({
      homeRegionId: region.id,
      hsesUserId: `compliant-reviews-user-${userIdentifier}`,
      hsesUsername: `compliant-reviews-user-${userIdentifier}`,
      email: `compliant-reviews-user-${userIdentifier}@example.com`,
    });

    // Approved AR ending on 2025-02-01. Only reviewWithTta is delivered after that end date.
    report = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-02-01T12:00:00Z',
      endDate: '2025-02-01T13:00:00Z',
    });

    goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });

    objective = await Objective.create({
      goalId: goal.id,
      title: `Compliant reviews widget objective ${mfidSeed}`,
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    aro = await ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: objective.id,
    });

    citationNoncompliance = await Citation.create({
      mfid: mfidSeed,
      finding_uuid: uuid(),
      calculated_finding_type: 'Noncompliance',
      reported_date: '2025-01-15',
      initial_report_delivery_date: '2025-01-15',
    });

    citationAreaOfConcern = await Citation.create({
      mfid: mfidSeed + 1,
      finding_uuid: uuid(),
      calculated_finding_type: 'Area of Concern',
      reported_date: '2025-01-15',
      initial_report_delivery_date: '2025-01-15',
    });

    grantCitationNoncompliance = await GrantCitation.create({
      grantId: grant.id,
      citationId: citationNoncompliance.id,
      region_id: region.id,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
    });

    grantCitationAreaOfConcern = await GrantCitation.create({
      grantId: grant.id,
      citationId: citationAreaOfConcern.id,
      region_id: region.id,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
    });

    // Links the approved AR to citationNoncompliance
    aroCitation = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: aro.id,
      citationId: citationNoncompliance.id,
      citation: '1302.12(d)(1)',
      findingId: citationNoncompliance.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: 'Compliant Reviews Test Review',
      findingType: 'Noncompliance',
      findingSource: 'Monitoring',
      standardId: 1,
      acro: 'NC',
      name: 'Compliant Reviews Test Citation',
      severity: 2,
      reportDeliveryDate: '2025-01-25',
      monitoringFindingStatusName: 'Open',
    });

    reviewWithTta = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Review With TTA',
      report_delivery_date: '2025-02-10',
      complete_date: '2025-02-25',
      corrected: true,
    });

    reviewWithoutTta = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Review Without TTA',
      report_delivery_date: '2025-01-25',
      complete_date: '2025-02-20',
      corrected: true,
    });

    reviewWrongFindingType = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Review Wrong Finding Type',
      report_delivery_date: '2025-01-25',
      complete_date: '2025-02-22',
      corrected: true,
    });

    [gdrWithTta, gdrWithoutTta, gdrWrongType] = await Promise.all([
      GrantDeliveredReview.create({ grantId: grant.id, deliveredReviewId: reviewWithTta.id }),
      GrantDeliveredReview.create({ grantId: grant.id, deliveredReviewId: reviewWithoutTta.id }),
      GrantDeliveredReview.create({
        grantId: grant.id,
        deliveredReviewId: reviewWrongFindingType.id,
      }),
    ]);

    [drcWithTta, drcWithoutTta, drcWrongType] = await Promise.all([
      DeliveredReviewCitation.create({
        deliveredReviewId: reviewWithTta.id,
        citationId: citationNoncompliance.id,
      }),
      DeliveredReviewCitation.create({
        deliveredReviewId: reviewWithoutTta.id,
        citationId: citationNoncompliance.id,
      }),
      DeliveredReviewCitation.create({
        deliveredReviewId: reviewWrongFindingType.id,
        citationId: citationAreaOfConcern.id,
      }),
    ]);
  });

  afterAll(async () => {
    const drcIds = [drcWithTta?.id, drcWithoutTta?.id, drcWrongType?.id].filter(Boolean);
    if (drcIds.length) {
      await DeliveredReviewCitation.destroy({ where: { id: drcIds } });
    }

    const gdrIds = [gdrWithTta?.id, gdrWithoutTta?.id, gdrWrongType?.id].filter(Boolean);
    if (gdrIds.length) {
      await GrantDeliveredReview.destroy({ where: { id: gdrIds } });
    }

    const drIds = [reviewWithTta?.id, reviewWithoutTta?.id, reviewWrongFindingType?.id].filter(
      Boolean
    );
    if (drIds.length) {
      await DeliveredReview.destroy({ where: { id: drIds }, force: true });
    }

    if (aroCitation?.id) {
      await ActivityReportObjectiveCitation.destroy({ where: { id: aroCitation.id }, force: true });
    }

    if (aro?.id) {
      await ActivityReportObjective.destroy({
        where: { id: aro.id },
        force: true,
        individualHooks: true,
      });
    }

    if (objective?.id) {
      await Objective.destroy({
        where: { id: objective.id },
        force: true,
        individualHooks: true,
      });
    }

    if (report) {
      await destroyReport(report);
    }

    const gcIds = [grantCitationNoncompliance?.id, grantCitationAreaOfConcern?.id].filter(Boolean);
    if (gcIds.length) {
      await GrantCitation.destroy({ where: { id: gcIds } });
    }

    const cIds = [citationNoncompliance?.id, citationAreaOfConcern?.id].filter(Boolean);
    if (cIds.length) {
      await Citation.destroy({ where: { id: cIds }, force: true });
    }

    if (goal) {
      await destroyGoal(goal);
    }

    await db.sequelize.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty result when no grant citations match the scope', async () => {
    jest.spyOn(db.GrantCitation, 'findAll').mockResolvedValue([]);
    const querySpy = jest.spyOn(db.sequelize, 'query');

    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [],
      grantCitation: [],
    });

    expect(querySpy).not.toHaveBeenCalled();
    expect(data).toEqual(EMPTY_RESULT);
  });

  it('returns empty result when no delivered reviews match the scope', async () => {
    jest.spyOn(db.GrantCitation, 'findAll').mockResolvedValue([{ id: 1, grantId: 2 }]);
    jest.spyOn(db.DeliveredReview, 'findAll').mockResolvedValue([]);
    const querySpy = jest.spyOn(db.sequelize, 'query');

    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [],
      grantCitation: [],
    });

    expect(querySpy).not.toHaveBeenCalled();
    expect(data).toEqual(EMPTY_RESULT);
  });

  it('passes the correct replacements to the SQL query', async () => {
    const grantCitationFindAllSpy = jest.spyOn(db.GrantCitation, 'findAll').mockResolvedValue([
      { id: 101, grantId: 201 },
      { id: 102, grantId: 201 },
      { id: 103, grantId: 202 },
    ]);
    jest.spyOn(db.DeliveredReview, 'findAll').mockResolvedValue([{ id: 301 }, { id: 302 }]);
    const querySpy = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);

    await compliantFollowUpReviewsWithTtaSupport({ deliveredReview: [], grantCitation: [] });

    expect(grantCitationFindAllSpy).toHaveBeenCalledWith(expect.objectContaining({ raw: true }));
    expect(querySpy).toHaveBeenCalledTimes(1);
    const { replacements } = querySpy.mock.calls[0][1];
    expect(replacements.grantCitationIds).toEqual([101, 102, 103]);
    expect(replacements.deliveredReviewIds).toEqual([301, 302]);
    expect(replacements.grantIds).toEqual([201, 202]);
    expect(replacements.seriesStart).toBeUndefined();
    expect(replacements.seriesEnd).toBeUndefined();
  });

  it('uses provided scoped grant citations without querying them again', async () => {
    const grantCitationFindAllSpy = jest.spyOn(db.GrantCitation, 'findAll');
    jest.spyOn(db.DeliveredReview, 'findAll').mockResolvedValue([{ id: 301 }, { id: 302 }]);
    const querySpy = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);

    await compliantFollowUpReviewsWithTtaSupport(
      { deliveredReview: [], grantCitation: [] },
      undefined,
      [
        { id: 101, grantId: 201 },
        { id: 102, grantId: 202 },
      ]
    );

    expect(grantCitationFindAllSpy).not.toHaveBeenCalled();
    expect(querySpy).toHaveBeenCalledTimes(1);
    const { replacements } = querySpy.mock.calls[0][1];
    expect(replacements.grantCitationIds).toEqual([101, 102]);
    expect(replacements.grantIds).toEqual([201, 202]);
  });

  it('preserves the widget route call signature when query is passed as the second argument', async () => {
    const grantCitationFindAllSpy = jest
      .spyOn(db.GrantCitation, 'findAll')
      .mockResolvedValue([{ id: 101, grantId: 201 }]);
    jest.spyOn(db.DeliveredReview, 'findAll').mockResolvedValue([{ id: 301 }]);
    jest.spyOn(db.sequelize, 'query').mockResolvedValue([
      {
        month_start: '2026-01-01',
        total_reviews: 3,
        with_tta: 2,
        without_tta: 1,
      },
    ]);

    const data = await compliantFollowUpReviewsWithTtaSupport(
      { deliveredReview: [], grantCitation: [] },
      { 'region.in': ['1'] }
    );

    expect(grantCitationFindAllSpy).toHaveBeenCalled();
    expect(data.months).toEqual(['Jan 2026']);
    expect(data.reviews).toEqual([
      { name: 'Follow-up reviews with TTA', values: [2] },
      { name: 'Follow-up reviews without TTA', values: [1] },
      { name: 'Total', values: [3] },
    ]);
  });

  it('uses scoped_reviews CTE, scoped citations, and the details-page TTA date window', async () => {
    jest.spyOn(db.GrantCitation, 'findAll').mockResolvedValue([{ id: 101, grantId: 201 }]);
    jest.spyOn(db.DeliveredReview, 'findAll').mockResolvedValue([{ id: 301 }]);
    const querySpy = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);

    await compliantFollowUpReviewsWithTtaSupport({ deliveredReview: [], grantCitation: [] });

    const queryText = querySpy.mock.calls[0][0];
    expect(queryText).toContain('scoped_reviews AS');
    expect(queryText).toContain('WHERE id IN (:deliveredReviewIds)');
    expect(queryText).toContain('family_reviews AS');
    expect(queryText).toContain("DATE_TRUNC('month', MIN(complete_date))");
    expect(queryText).toContain('"GrantCitations" gc_scoped');
    expect(queryText).toContain('gc_scoped.id IN (:grantCitationIds)');
    expect(queryText).toContain('aroc."grantId" IN (:grantIds)');
    expect(queryText).toContain('ar."submissionStatus" <> \'deleted\'');
    expect(queryText).toContain('ar."endDate" > src.initial_report_delivery_date');
    expect(queryText).toContain('ar."endDate" < fr.report_delivery_date');
  });

  it('counts reviews with and without TTA across all scoped finding types', async () => {
    // All three reviews are for this grant; all three grantCitations are in scope
    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [],
      grantCitation: [{ grantId: grant.id }],
    });

    expect(data.months).toEqual(['Feb 2025']);
    const [withTta, withoutTta, total] = data.reviews;
    expect(withTta.values).toEqual([1]); // Noncompliance family
    expect(withoutTta.values).toEqual([1]); // Area of Concern family
    expect(total.values).toEqual([2]);
  });

  it('excludes reviews whose citations do not match the scoped finding type', async () => {
    // Restrict grantCitation scope to Noncompliance only; Area of Concern is out of scope
    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [],
      grantCitation: [{ id: { [Op.in]: [grantCitationNoncompliance.id] } }],
    });

    expect(data.months).toEqual(['Feb 2025']);
    const [withTta, withoutTta, total] = data.reviews;
    // The Area of Concern family is excluded by the Noncompliance grantCitation scope.
    expect(withTta.values).toEqual([1]);
    expect(withoutTta.values).toEqual([0]);
    expect(total.values).toEqual([1]);
  });

  it('returns a zero-filled month series across gaps in scoped review months', async () => {
    const reviewWithGap = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Review With Gap',
      report_delivery_date: '2025-02-10',
      complete_date: '2025-04-20',
      corrected: true,
    });

    const grantDeliveredReview = await GrantDeliveredReview.create({
      grantId: grant.id,
      deliveredReviewId: reviewWithGap.id,
    });

    const deliveredReviewCitation = await DeliveredReviewCitation.create({
      deliveredReviewId: reviewWithGap.id,
      citationId: citationNoncompliance.id,
    });

    try {
      const data = await compliantFollowUpReviewsWithTtaSupport({
        deliveredReview: [],
        grantCitation: [{ id: { [Op.in]: [grantCitationNoncompliance.id] } }],
      });

      expect(data.months).toEqual(['Apr 2025']);
      const [withTta, withoutTta, total] = data.reviews;
      expect(withTta.values).toEqual([1]);
      expect(withoutTta.values).toEqual([0]);
      expect(total.values).toEqual([1]);
    } finally {
      await DeliveredReviewCitation.destroy({ where: { id: deliveredReviewCitation.id } });
      await GrantDeliveredReview.destroy({ where: { id: grantDeliveredReview.id } });
      await DeliveredReview.destroy({ where: { id: reviewWithGap.id }, force: true });
    }
  });

  it('returns empty result when the deliveredReview scope matches no reviews', async () => {
    // None of the test reviews have review_type 'RAN', so deliveredReviewIds will be empty
    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [{ review_type: 'RAN' }],
      grantCitation: [{ grantId: grant.id }],
    });

    expect(data).toEqual(EMPTY_RESULT);
  });

  it('counts one initial-review family once when multiple corrected follow-up rows exist', async () => {
    const familyGrant = await createGrant({ regionId: region.id, status: 'Active' });
    const initialReviewUuid = uuid();
    const initialReview = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: initialReviewUuid,
      review_type: 'Review',
      review_status: 'Complete',
      review_name: 'Initial Family Review',
      report_delivery_date: '2025-01-15',
      complete_date: '2025-01-20',
      corrected: false,
    });
    const citation = await Citation.create({
      mfid: getUniqueId(),
      finding_uuid: uuid(),
      citation: '1302.12(d)(1)',
      calculated_finding_type: 'Noncompliance',
      reported_date: '2025-01-15',
      initial_review_uuid: initialReviewUuid,
      initial_report_delivery_date: '2025-01-15',
      active_through: '2025-12-31',
    });
    const grantCitation = await GrantCitation.create({
      grantId: familyGrant.id,
      citationId: citation.id,
      region_id: region.id,
      recipient_id: familyGrant.recipientId,
      recipient_name: familyGrant.recipient?.name,
    });
    const olderFollowUp = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Older Corrected Follow-Up',
      report_delivery_date: '2025-06-10',
      complete_date: '2025-04-15',
      corrected: true,
    });
    const latestFollowUp = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Latest Corrected Follow-Up',
      report_delivery_date: '2025-05-10',
      complete_date: '2025-05-20',
      corrected: true,
    });
    const grantDeliveredReviews = await Promise.all([
      GrantDeliveredReview.create({
        grantId: familyGrant.id,
        deliveredReviewId: olderFollowUp.id,
      }),
      GrantDeliveredReview.create({
        grantId: familyGrant.id,
        deliveredReviewId: latestFollowUp.id,
      }),
    ]);
    const deliveredReviewCitations = await Promise.all([
      DeliveredReviewCitation.create({
        deliveredReviewId: olderFollowUp.id,
        citationId: citation.id,
      }),
      DeliveredReviewCitation.create({
        deliveredReviewId: latestFollowUp.id,
        citationId: citation.id,
      }),
    ]);
    const reportAfterRepresentativeReceivedDate = await createReport({
      activityRecipients: [{ grantId: familyGrant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-05-15T12:00:00Z',
      endDate: '2025-05-15T13:00:00Z',
    });
    const familyGoal = await createGoal({
      grantId: familyGrant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    const familyObjective = await Objective.create({
      goalId: familyGoal.id,
      title: `Compliant family objective ${getUniqueId()}`,
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });
    const familyAro = await ActivityReportObjective.create({
      activityReportId: reportAfterRepresentativeReceivedDate.id,
      objectiveId: familyObjective.id,
    });
    const familyAroCitation = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: familyAro.id,
      citationId: citation.id,
      citation: '1302.12(d)(1)',
      findingId: citation.finding_uuid,
      grantId: familyGrant.id,
      grantNumber: familyGrant.number,
      reviewName: 'Compliant Family Test Review',
      findingType: 'Noncompliance',
      findingSource: 'Monitoring',
      standardId: 1,
      acro: 'NC',
      name: 'Compliant Family Test Citation',
      severity: 2,
      reportDeliveryDate: '2025-01-15',
      monitoringFindingStatusName: 'Open',
    });

    try {
      const scopes = {
        deliveredReview: [],
        grantCitation: [{ id: grantCitation.id }],
      };

      const widgetData = await compliantFollowUpReviewsWithTtaSupport(scopes);
      const overviewData = await monitoringOverview({
        ...scopes,
        citation: [],
        activityReport: [],
      });
      const totalSeries = widgetData.reviews.find((series) => series.name === 'Total');
      const withTtaSeries = widgetData.reviews.find(
        (series) => series.name === 'Follow-up reviews with TTA'
      );
      const withoutTtaSeries = widgetData.reviews.find(
        (series) => series.name === 'Follow-up reviews without TTA'
      );

      expect(widgetData.months).toEqual(['May 2025']);
      expect(withTtaSeries.values).toEqual([0]);
      expect(withoutTtaSeries.values).toEqual([1]);
      expect(totalSeries.values).toEqual([1]);
      expect(overviewData.totalCompliantFollowUpReviews).toBe('1');
    } finally {
      await ActivityReportObjectiveCitation.destroy({
        where: { id: familyAroCitation.id },
        force: true,
      });
      await ActivityReportObjective.destroy({
        where: { id: familyAro.id },
        force: true,
        individualHooks: true,
      });
      await Objective.destroy({
        where: { id: familyObjective.id },
        force: true,
        individualHooks: true,
      });
      await destroyGoal(familyGoal);
      await destroyReport(reportAfterRepresentativeReceivedDate);
      await DeliveredReviewCitation.destroy({
        where: { id: deliveredReviewCitations.map((record) => record.id) },
      });
      await GrantDeliveredReview.destroy({
        where: { id: grantDeliveredReviews.map((record) => record.id) },
      });
      await DeliveredReview.destroy({
        where: { id: [initialReview.id, olderFollowUp.id, latestFollowUp.id] },
        force: true,
      });
      await GrantCitation.destroy({ where: { id: grantCitation.id } });
      await Citation.destroy({ where: { id: citation.id }, force: true });
      await db.Grant.destroy({ where: { id: familyGrant.id }, individualHooks: true });
      await db.Recipient.destroy({ where: { id: familyGrant.recipientId } });
    }
  });
});
