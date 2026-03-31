import { v4 as uuid } from 'uuid';
import { Op } from 'sequelize';
import db from '../../models';
import monitoringOverview from './monitoringOverview';
import {
  createGoal,
  createGrant,
  createRecipient,
  createRegion,
  createReport,
  createUser,
  destroyGoal,
  destroyReport,
} from '../../testUtils';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../constants';

const {
  Citation,
  GrantCitation,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantDeliveredReview,
} = db;

describe('monitoringOverview', () => {
  const cleanupMonitoringFixture = async (fixture) => {
    if (!fixture) {
      return;
    }

    await DeliveredReviewCitation.destroy({
      where: { id: fixture.deliveredReviewCitations.map((record) => record.id) },
      force: true,
    });
    await GrantDeliveredReview.destroy({
      where: { id: fixture.grantDeliveredReviews.map((record) => record.id) },
      force: true,
    });
    await DeliveredReview.destroy({
      where: { id: fixture.deliveredReviews.map((record) => record.id) },
      force: true,
    });
    await ActivityReportObjectiveCitation.destroy({
      where: { id: fixture.activityReportObjectiveCitations.map((record) => record.id) },
      force: true,
    });
    await ActivityReportObjective.destroy({
      where: { id: fixture.activityReportObjectives.map((record) => record.id) },
      force: true,
      individualHooks: true,
    });
    await Objective.destroy({
      where: { id: fixture.objectives.map((record) => record.id) },
      force: true,
      individualHooks: true,
    });
    await GrantCitation.destroy({
      where: { id: fixture.grantCitations.map((record) => record.id) },
      force: true,
    });
    await Citation.destroy({
      where: { id: fixture.citations.map((record) => record.id) },
      force: true,
    });
    await Promise.all(fixture.goals.map((goal) => destroyGoal(goal)));
    await Promise.all(fixture.reports.map((report) => destroyReport(report)));
    await Promise.all(
      fixture.extraGrants.map((grant) => grant.destroy({ force: true })),
    );
    await Promise.all(
      fixture.extraRecipients.map((recipient) => recipient.destroy({ force: true })),
    );
  };

  const createCitation = async ({
    mfid,
    findingType,
    initialReportDeliveryDate,
    activeThrough,
  }) => Citation.create({
    mfid,
    finding_uuid: uuid(),
    active: true,
    calculated_finding_type: findingType,
    reported_date: initialReportDeliveryDate,
    initial_report_delivery_date: initialReportDeliveryDate,
    active_through: activeThrough,
  });

  const createOverviewFixture = async ({
    includeScopedRows = false,
  } = {}) => {
    const mfidSeed = Math.floor(Math.random() * 1_000_000_000);
    const suffix = uuid();

    const region = await createRegion({ name: `Monitoring Overview Region ${suffix}` });
    const recipient = await createRecipient({ name: `Monitoring Overview Recipient ${suffix}` });
    const grant = await createGrant({
      recipientId: recipient.id,
      regionId: region.id,
      number: `19HP${String(mfidSeed).slice(0, 8)}`,
      status: 'Active',
    });
    const user = await createUser({
      homeRegionId: region.id,
      hsesUserId: `monitoring-overview-user-${suffix}`,
      hsesUsername: `monitoring-overview-user-${suffix}`,
      name: `Monitoring Overview User ${suffix}`,
      email: `monitoring-overview-${suffix}@example.com`,
    });

    const approvedReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-03-10T12:00:00Z',
      endDate: '2025-03-10T13:00:00Z',
    });

    const goal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    const objective = await Objective.create({
      goalId: goal.id,
      title: `Monitoring Overview Objective ${suffix}`,
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });
    const aro = await ActivityReportObjective.create({
      activityReportId: approvedReport.id,
      objectiveId: objective.id,
    });

    const deficiencyWithTta = await createCitation({
      mfid: mfidSeed,
      findingType: 'Deficiency',
      initialReportDeliveryDate: '2025-01-10',
      activeThrough: '2025-12-31',
    });
    const deficiencyWithoutTta = await createCitation({
      mfid: mfidSeed + 1,
      findingType: 'Deficiency',
      initialReportDeliveryDate: '2025-01-12',
      activeThrough: '2025-12-31',
    });
    const anotherDeficiencyWithTta = await createCitation({
      mfid: mfidSeed + 2,
      findingType: 'Deficiency',
      initialReportDeliveryDate: '2025-01-14',
      activeThrough: '2025-12-31',
    });
    const noncomplianceWithoutTta = await createCitation({
      mfid: mfidSeed + 3,
      findingType: 'Noncompliance',
      initialReportDeliveryDate: '2025-01-16',
      activeThrough: '2025-12-31',
    });
    const noncomplianceWithTta = await createCitation({
      mfid: mfidSeed + 4,
      findingType: 'Noncompliance',
      initialReportDeliveryDate: '2025-01-18',
      activeThrough: '2025-12-31',
    });

    const citations = [
      deficiencyWithTta,
      deficiencyWithoutTta,
      anotherDeficiencyWithTta,
      noncomplianceWithoutTta,
      noncomplianceWithTta,
    ];

    const grantCitations = await Promise.all(citations.map((citation) => GrantCitation.create({
      grantId: grant.id,
      citationId: citation.id,
      region_id: region.id,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
    })));

    const activityReportObjectiveCitations = await Promise.all([
      deficiencyWithTta,
      anotherDeficiencyWithTta,
      noncomplianceWithTta,
    ].map((citation, index) => ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: aro.id,
      citationId: citation.id,
      citation: `1302.1${index}`,
      findingId: citation.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: `Monitoring Overview Review ${index}`,
      standardId: index + 1,
      findingType: citation.calculated_finding_type,
      findingSource: 'Monitoring',
      acro: citation.calculated_finding_type === 'Deficiency' ? 'DEF' : 'NON',
      name: `Monitoring Overview Citation ${index}`,
      severity: index + 1,
      reportDeliveryDate: '2025-01-10',
      monitoringFindingStatusName: 'Open',
    })));

    const deliveredReviews = await Promise.all([
      DeliveredReview.create({
        mrid: mfidSeed + 100,
        review_type: 'Follow-up',
        outcome: 'Compliant',
        report_delivery_date: '2025-01-20',
      }),
      DeliveredReview.create({
        mrid: mfidSeed + 101,
        review_type: 'Follow-up',
        outcome: 'Compliant',
        report_delivery_date: '2025-02-20',
      }),
      DeliveredReview.create({
        mrid: mfidSeed + 102,
        review_type: 'Follow-up',
        outcome: 'Compliant',
        report_delivery_date: '2025-03-20',
      }),
    ]);

    const grantDeliveredReviews = await Promise.all(
      deliveredReviews.map((review) => GrantDeliveredReview.create({
        grantId: grant.id,
        deliveredReviewId: review.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      })),
    );

    const deliveredReviewCitations = await Promise.all([
      { deliveredReviewId: deliveredReviews[0].id, citationId: deficiencyWithTta.id },
      { deliveredReviewId: deliveredReviews[1].id, citationId: deficiencyWithoutTta.id },
      { deliveredReviewId: deliveredReviews[2].id, citationId: noncomplianceWithoutTta.id },
    ].map((record) => DeliveredReviewCitation.create(record)));

    const fixture = {
      region,
      recipient,
      grant,
      user,
      reports: [approvedReport],
      goals: [goal],
      objectives: [objective],
      activityReportObjectives: [aro],
      activityReportObjectiveCitations,
      citations,
      grantCitations,
      deliveredReviews,
      grantDeliveredReviews,
      deliveredReviewCitations,
      extraGrants: [],
      extraRecipients: [],
    };

    if (!includeScopedRows) {
      return fixture;
    }

    const filteredRecipient = await createRecipient({ name: `Filtered Recipient ${suffix}` });
    const filteredGrant = await createGrant({
      recipientId: filteredRecipient.id,
      regionId: region.id,
      number: `29HP${String(mfidSeed).slice(0, 8)}`,
      status: 'Active',
    });
    const outOfScopeReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2024-03-10T12:00:00Z',
      endDate: '2024-03-10T13:00:00Z',
    });
    const filteredGoal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    const filteredObjective = await Objective.create({
      goalId: filteredGoal.id,
      title: `Filtered Objective ${suffix}`,
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });
    const filteredAro = await ActivityReportObjective.create({
      activityReportId: outOfScopeReport.id,
      objectiveId: filteredObjective.id,
    });

    const citationWithOutOfScopeTta = await createCitation({
      mfid: mfidSeed + 5,
      findingType: 'Deficiency',
      initialReportDeliveryDate: '2025-02-10',
      activeThrough: '2025-12-31',
    });
    const citationOutsideDateWindow = await createCitation({
      mfid: mfidSeed + 6,
      findingType: 'Deficiency',
      initialReportDeliveryDate: '2024-01-10',
      activeThrough: '2024-02-01',
    });
    const citationOutsideGrantScope = await createCitation({
      mfid: mfidSeed + 7,
      findingType: 'Noncompliance',
      initialReportDeliveryDate: '2025-02-15',
      activeThrough: '2025-12-31',
    });

    const filteredGrantCitations = await Promise.all([
      GrantCitation.create({
        grantId: grant.id,
        citationId: citationWithOutOfScopeTta.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      GrantCitation.create({
        grantId: grant.id,
        citationId: citationOutsideDateWindow.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      GrantCitation.create({
        grantId: filteredGrant.id,
        citationId: citationOutsideGrantScope.id,
        region_id: region.id,
        recipient_id: filteredRecipient.id,
        recipient_name: filteredRecipient.name,
      }),
    ]);

    const filteredAroc = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: filteredAro.id,
      citationId: citationWithOutOfScopeTta.id,
      citation: '1302.99',
      findingId: citationWithOutOfScopeTta.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: `Filtered Review ${suffix}`,
      standardId: 99,
      findingType: citationWithOutOfScopeTta.calculated_finding_type,
      findingSource: 'Monitoring',
      acro: 'DEF',
      name: 'Filtered Citation',
      severity: 2,
      reportDeliveryDate: '2024-03-10',
      monitoringFindingStatusName: 'Open',
    });

    const filteredDeliveredReviews = await Promise.all([
      DeliveredReview.create({
        mrid: mfidSeed + 103,
        review_type: 'Follow-up',
        outcome: 'Compliant',
        report_delivery_date: '2025-04-10',
      }),
      DeliveredReview.create({
        mrid: mfidSeed + 104,
        review_type: 'Follow-up',
        outcome: 'Compliant',
        report_delivery_date: '2024-12-10',
      }),
      DeliveredReview.create({
        mrid: mfidSeed + 105,
        review_type: 'Follow-up',
        outcome: 'Compliant',
        report_delivery_date: '2025-04-12',
      }),
    ]);

    const filteredGrantDeliveredReviews = await Promise.all([
      GrantDeliveredReview.create({
        grantId: grant.id,
        deliveredReviewId: filteredDeliveredReviews[0].id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      GrantDeliveredReview.create({
        grantId: grant.id,
        deliveredReviewId: filteredDeliveredReviews[1].id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      GrantDeliveredReview.create({
        grantId: filteredGrant.id,
        deliveredReviewId: filteredDeliveredReviews[2].id,
        region_id: region.id,
        recipient_id: filteredRecipient.id,
        recipient_name: filteredRecipient.name,
      }),
    ]);

    const filteredDeliveredReviewCitations = await Promise.all([
      DeliveredReviewCitation.create({
        deliveredReviewId: filteredDeliveredReviews[0].id,
        citationId: citationWithOutOfScopeTta.id,
      }),
      DeliveredReviewCitation.create({
        deliveredReviewId: filteredDeliveredReviews[1].id,
        citationId: deficiencyWithTta.id,
      }),
      DeliveredReviewCitation.create({
        deliveredReviewId: filteredDeliveredReviews[2].id,
        citationId: citationOutsideGrantScope.id,
      }),
    ]);

    fixture.reports.push(outOfScopeReport);
    fixture.goals.push(filteredGoal);
    fixture.objectives.push(filteredObjective);
    fixture.activityReportObjectives.push(filteredAro);
    fixture.activityReportObjectiveCitations.push(filteredAroc);
    fixture.citations.push(
      citationWithOutOfScopeTta,
      citationOutsideDateWindow,
      citationOutsideGrantScope,
    );
    fixture.grantCitations.push(...filteredGrantCitations);
    fixture.deliveredReviews.push(...filteredDeliveredReviews);
    fixture.grantDeliveredReviews.push(...filteredGrantDeliveredReviews);
    fixture.deliveredReviewCitations.push(...filteredDeliveredReviewCitations);
    fixture.extraGrants.push(filteredGrant);
    fixture.extraRecipients.push(filteredRecipient);

    return fixture;
  };

  let fixture;

  afterEach(async () => {
    await cleanupMonitoringFixture(fixture);
    fixture = null;
    jest.restoreAllMocks();
  });

  it('returns the expected object shape with compliant and citation counts', async () => {
    fixture = await createOverviewFixture();

    const data = await monitoringOverview({
      deliveredReview: [],
      citation: [],
      activityReport: [],
      grant: { where: {} },
    });

    expect(data).toEqual({
      percentCompliantFollowUpReviewsWithTtaSupport: '33.33%',
      totalCompliantFollowUpReviewsWithTtaSupport: '1',
      totalCompliantFollowUpReviews: '3',
      percentActiveDeficientCitationsWithTtaSupport: '66.67%',
      totalActiveDeficientCitationsWithTtaSupport: '2',
      totalActiveDeficientCitations: '3',
      percentActiveNoncompliantCitationsWithTtaSupport: '50.00%',
      totalActiveNoncompliantCitationsWithTtaSupport: '1',
      totalActiveNoncompliantCitations: '2',
    });
  });

  it('returns 0% when follow-up review and citation denominators are zero', async () => {
    fixture = await createOverviewFixture();

    const data = await monitoringOverview({
      deliveredReview: [{ report_delivery_date: { [Op.lt]: '2025-01-01' } }],
      citation: [{
        initial_report_delivery_date: { [Op.gt]: '2026-01-01' },
      }],
      activityReport: [],
      grant: { where: { id: -1 } },
    });

    expect(data).toEqual({
      percentCompliantFollowUpReviewsWithTtaSupport: '0%',
      totalCompliantFollowUpReviewsWithTtaSupport: '0',
      totalCompliantFollowUpReviews: '0',
      percentActiveDeficientCitationsWithTtaSupport: '0%',
      totalActiveDeficientCitationsWithTtaSupport: '0',
      totalActiveDeficientCitations: '0',
      percentActiveNoncompliantCitationsWithTtaSupport: '0%',
      totalActiveNoncompliantCitationsWithTtaSupport: '0',
      totalActiveNoncompliantCitations: '0',
    });
  });

  it('honors the provided delivered review, citation, activity report, and grant scopes', async () => {
    fixture = await createOverviewFixture({ includeScopedRows: true });

    const data = await monitoringOverview({
      deliveredReview: [{
        report_delivery_date: {
          [Op.between]: ['2025-01-01', '2025-06-30'],
        },
      }],
      citation: [{
        initial_report_delivery_date: {
          [Op.gte]: '2025-01-01',
          [Op.lte]: '2025-06-30',
        },
      }],
      activityReport: [{
        startDate: {
          [Op.between]: ['2025-01-01', '2025-12-31'],
        },
      }],
      grant: {
        where: {
          id: fixture.grant.id,
        },
      },
    });

    expect(data).toEqual({
      percentCompliantFollowUpReviewsWithTtaSupport: '25.00%',
      totalCompliantFollowUpReviewsWithTtaSupport: '1',
      totalCompliantFollowUpReviews: '4',
      percentActiveDeficientCitationsWithTtaSupport: '50.00%',
      totalActiveDeficientCitationsWithTtaSupport: '2',
      totalActiveDeficientCitations: '4',
      percentActiveNoncompliantCitationsWithTtaSupport: '50.00%',
      totalActiveNoncompliantCitationsWithTtaSupport: '1',
      totalActiveNoncompliantCitations: '2',
    });
  });
});
