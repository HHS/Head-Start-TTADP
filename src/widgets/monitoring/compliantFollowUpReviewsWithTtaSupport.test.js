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

  // reviewWithTta: has a scoped Noncompliance citation and an approved AR whose startDate
  //   (2025-02-01) falls within [report_delivery_date (2025-01-25), complete_date (2025-02-15)]
  // reviewWithoutTta: has the same scoped citation but the AR's startDate (2025-02-01) is
  //   before this review's report_delivery_date (2025-02-10), so it does not count as TTA
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

    // Approved AR with startDate 2025-02-01. Only falls within reviewWithTta's correction period.
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
      report_delivery_date: '2025-01-25',
      complete_date: '2025-02-15',
      complete: true,
    });

    // report_delivery_date 2025-02-10 is AFTER the AR's startDate (2025-02-01), so the AR
    // does not count as TTA for this review.
    reviewWithoutTta = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Review Without TTA',
      report_delivery_date: '2025-02-10',
      complete_date: '2025-02-20',
      complete: true,
    });

    reviewWrongFindingType = await DeliveredReview.create({
      mrid: getUniqueId(),
      review_uuid: uuid(),
      review_type: 'Follow-Up',
      review_status: 'Complete',
      review_name: 'Review Wrong Finding Type',
      report_delivery_date: '2025-01-25',
      complete_date: '2025-02-22',
      complete: true,
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
    jest.spyOn(db.GrantCitation, 'findAll').mockResolvedValue([
      { id: 101, grantId: 201 },
      { id: 102, grantId: 201 },
      { id: 103, grantId: 202 },
    ]);
    jest.spyOn(db.DeliveredReview, 'findAll').mockResolvedValue([
      { id: 301, complete_date: '2025-02-15' },
      { id: 302, complete_date: '2025-04-10' },
    ]);
    const querySpy = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);

    await compliantFollowUpReviewsWithTtaSupport({ deliveredReview: [], grantCitation: [] });

    expect(querySpy).toHaveBeenCalledTimes(1);
    const { replacements } = querySpy.mock.calls[0][1];
    expect(replacements.seriesStart).toBe('2025-02-01');
    expect(replacements.seriesEnd).toBe('2025-04-01');
    expect(replacements.grantIds).toEqual([201, 202]);
    expect(replacements.grantCitationIds).toEqual([101, 102, 103]);
    expect(replacements.deliveredReviewIds).toEqual([301, 302]);
  });

  it('uses generate_series and scopes citations through GrantCitations', async () => {
    jest.spyOn(db.GrantCitation, 'findAll').mockResolvedValue([{ id: 101, grantId: 201 }]);
    jest
      .spyOn(db.DeliveredReview, 'findAll')
      .mockResolvedValue([{ id: 301, complete_date: '2025-03-15' }]);
    const querySpy = jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);

    await compliantFollowUpReviewsWithTtaSupport({ deliveredReview: [], grantCitation: [] });

    const queryText = querySpy.mock.calls[0][0];
    expect(queryText).toContain('generate_series(:seriesStart::date, :seriesEnd::date');
    expect(queryText).toContain('"GrantCitations" gc_scoped');
    expect(queryText).toContain('gc_scoped.id IN (:grantCitationIds)');
    expect(queryText).toContain('dr.id IN (:deliveredReviewIds)');
    expect(queryText).toContain('gdr."grantId" IN (:grantIds)');
  });

  it('counts reviews with and without TTA across all scoped finding types', async () => {
    // All three reviews are for this grant; all three grantCitations are in scope
    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [],
      grantCitation: [{ grantId: grant.id }],
    });

    expect(data.months).toEqual(['Feb 2025']);
    const [withTta, withoutTta, total] = data.reviews;
    expect(withTta.values).toEqual([1]); // reviewWithTta
    expect(withoutTta.values).toEqual([2]); // reviewWithoutTta + reviewWrongFindingType
    expect(total.values).toEqual([3]);
  });

  it('excludes reviews whose citations do not match the scoped finding type', async () => {
    // Restrict grantCitation scope to Noncompliance only; Area of Concern is out of scope
    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [],
      grantCitation: [{ id: { [Op.in]: [grantCitationNoncompliance.id] } }],
    });

    expect(data.months).toEqual(['Feb 2025']);
    const [withTta, withoutTta, total] = data.reviews;
    // reviewWrongFindingType only has Area of Concern — excluded from review_set
    expect(withTta.values).toEqual([1]);
    expect(withoutTta.values).toEqual([1]);
    expect(total.values).toEqual([2]);
  });

  it('returns empty result when the deliveredReview scope matches no reviews', async () => {
    // None of the test reviews have review_type 'RAN', so deliveredReviewIds will be empty
    const data = await compliantFollowUpReviewsWithTtaSupport({
      deliveredReview: [{ review_type: 'RAN' }],
      grantCitation: [{ grantId: grant.id }],
    });

    expect(data).toEqual(EMPTY_RESULT);
  });
});
