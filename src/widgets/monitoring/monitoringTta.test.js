import { v4 as uuid } from 'uuid';
import { REPORT_STATUSES } from '@ttahub/common';
import db from '../../models';
import monitoringTta from './monitoringTta';
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
  ActivityReportCollaborator,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  ActivityReportObjectiveTopic,
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantCitation,
  GrantDeliveredReview,
  Objective,
  Program,
  Region,
  Role,
  Topic,
  User,
  UserRole,
} = db;

const TEST_KEY = uuid().replace(/-/g, '').slice(0, 8).toUpperCase();
const TEST_NUM = parseInt(TEST_KEY.slice(0, 6), 16);

describe('monitoringTta', () => {
  const fixture = {
    activityReportCollaborators: [],
    activityReportObjectiveCitations: [],
    activityReportObjectiveTopics: [],
    activityReportObjectives: [],
    citations: [],
    deliveredReviewCitations: [],
    deliveredReviews: [],
    goals: [],
    grantCitations: [],
    grantDeliveredReviews: [],
    grants: [],
    objectives: [],
    programs: [],
    recipients: [],
    regions: [],
    reports: [],
    roles: [],
    topics: [],
    userRoles: [],
    users: [],
  };

  const createRole = async (name) => {
    const [role, created] = await Role.findOrCreate({
      where: { name },
      defaults: {
        name,
        fullName: name,
        isSpecialist: true,
      },
    });

    if (created) {
      fixture.roles.push(role);
    }

    return role;
  };

  const createCitation = async ({
    mfid,
    citationNumber,
    status,
    findingType,
    category,
    active = true,
  }) => {
    const citation = await Citation.create({
      mfid,
      finding_uuid: uuid(),
      citation: citationNumber,
      raw_status: status,
      calculated_status: status,
      raw_finding_type: findingType,
      calculated_finding_type: findingType,
      guidance_category: category,
      source_category: category,
      active,
      last_review_delivered: true,
    });

    fixture.citations.push(citation);
    return citation;
  };

  const createReviewLinks = async ({
    grant,
    recipient,
    citation,
    review,
  }) => {
    const grantDeliveredReview = await GrantDeliveredReview.create({
      grantId: grant.id,
      deliveredReviewId: review.id,
      region_id: grant.regionId,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
    });
    const deliveredReviewCitation = await DeliveredReviewCitation.create({
      deliveredReviewId: review.id,
      citationId: citation.id,
    });

    fixture.grantDeliveredReviews.push(grantDeliveredReview);
    fixture.deliveredReviewCitations.push(deliveredReviewCitation);
  };

  beforeAll(async () => {
    const [ssRole, ncRole, gsRole] = await Promise.all([
      createRole('SS'),
      createRole('NC'),
      createRole('GS'),
    ]);

    const region = await createRegion({ name: `Monitoring TTA Region ${TEST_KEY}` });
    const recipient = await createRecipient({ name: `Recipient ${TEST_KEY}` });
    const grant = await createGrant({
      id: 700000 + TEST_NUM,
      recipientId: recipient.id,
      regionId: region.id,
      number: `01HP${TEST_KEY}`,
      status: 'Active',
    });

    fixture.regions.push(region);
    fixture.recipients.push(recipient);
    fixture.grants.push(grant);

    const extraRegion = await createRegion({ name: `Filtered Region ${TEST_KEY}` });
    const extraRecipient = await createRecipient({ name: `Filtered Recipient ${TEST_KEY}` });
    const extraGrant = await createGrant({
      id: 710000 + TEST_NUM,
      recipientId: extraRecipient.id,
      regionId: extraRegion.id,
      number: `02HP${TEST_KEY}`,
      status: 'Active',
    });

    fixture.regions.push(extraRegion);
    fixture.recipients.push(extraRecipient);
    fixture.grants.push(extraGrant);

    const healthProgram = await Program.create({
      id: 720000 + TEST_NUM,
      grantId: grant.id,
      programType: 'HS',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      status: 'Active',
      name: `Health Start ${TEST_KEY}`,
    });
    const ehsProgram = await Program.create({
      id: 730000 + TEST_NUM,
      grantId: grant.id,
      programType: 'EHS',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      status: 'Active',
      name: `Early Health Start ${TEST_KEY}`,
    });

    fixture.programs.push(healthProgram, ehsProgram);

    const author = await createUser({
      homeRegionId: region.id,
      hsesUserId: `monitoring-tta-author-${TEST_KEY}`,
      hsesUsername: `monitoring-tta-author-${TEST_KEY}`,
      name: 'Jane Doe',
      email: `monitoring-tta-author-${TEST_KEY}@example.com`,
    });
    const collaborator = await createUser({
      homeRegionId: region.id,
      hsesUserId: `monitoring-tta-collaborator-${TEST_KEY}`,
      hsesUsername: `monitoring-tta-collaborator-${TEST_KEY}`,
      name: 'John Roe',
      email: `monitoring-tta-collaborator-${TEST_KEY}@example.com`,
    });

    fixture.users.push(author, collaborator);

    fixture.userRoles.push(
      await UserRole.create({ userId: author.id, roleId: ssRole.id }),
      await UserRole.create({ userId: author.id, roleId: ncRole.id }),
      await UserRole.create({ userId: collaborator.id, roleId: gsRole.id }),
    );

    const approvedReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      userId: author.id,
      regionId: region.id,
      startDate: '2025-02-15T12:00:00Z',
      endDate: '2025-02-15T12:00:00Z',
      participants: ['Alice', 'Bob', 'Alice'],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    });
    const filteredReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      userId: author.id,
      regionId: region.id,
      startDate: '2025-04-20T12:00:00Z',
      endDate: '2025-04-20T12:00:00Z',
      participants: ['Ignored Person'],
      calculatedStatus: REPORT_STATUSES.SUBMITTED,
    });

    fixture.reports.push(approvedReport, filteredReport);

    fixture.activityReportCollaborators.push(
      await ActivityReportCollaborator.create({
        activityReportId: approvedReport.id,
        userId: author.id,
      }),
      await ActivityReportCollaborator.create({
        activityReportId: approvedReport.id,
        userId: collaborator.id,
      }),
    );

    const goal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    const filteredGoal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });

    fixture.goals.push(goal, filteredGoal);

    const objective = await Objective.create({
      goalId: goal.id,
      title: 'Improve health practices',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });
    const filteredObjective = await Objective.create({
      goalId: filteredGoal.id,
      title: 'Filtered objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    fixture.objectives.push(objective, filteredObjective);

    const aro = await ActivityReportObjective.create({
      activityReportId: approvedReport.id,
      objectiveId: objective.id,
    });
    const filteredAro = await ActivityReportObjective.create({
      activityReportId: filteredReport.id,
      objectiveId: filteredObjective.id,
    });

    fixture.activityReportObjectives.push(aro, filteredAro);

    const healthTopic = await Topic.findOrCreate({
      where: { name: `Monitoring TTA Health ${TEST_KEY}` },
      defaults: { name: `Monitoring TTA Health ${TEST_KEY}` },
    });
    const nutritionTopic = await Topic.findOrCreate({
      where: { name: `Monitoring TTA Nutrition ${TEST_KEY}` },
      defaults: { name: `Monitoring TTA Nutrition ${TEST_KEY}` },
    });

    fixture.topics.push(healthTopic[0], nutritionTopic[0]);

    fixture.activityReportObjectiveTopics.push(
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro.id,
        topicId: healthTopic[0].id,
      }),
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro.id,
        topicId: nutritionTopic[0].id,
      }),
    );

    const deficiencyCitation = await createCitation({
      mfid: 740000 + TEST_NUM,
      citationNumber: '1302.12',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Health',
    });
    const noncomplianceCitation = await createCitation({
      mfid: 750000 + TEST_NUM,
      citationNumber: '1302.10',
      status: 'Closed',
      findingType: 'Noncompliance',
      category: 'ERSEA',
    });
    const inactiveCitation = await createCitation({
      mfid: 760000 + TEST_NUM,
      citationNumber: '1302.99',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Ignored',
      active: false,
    });
    const outOfScopeGrantCitation = await createCitation({
      mfid: 770000 + TEST_NUM,
      citationNumber: '1302.98',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Filtered',
    });

    fixture.grantCitations.push(
      await GrantCitation.create({
        grantId: grant.id,
        citationId: deficiencyCitation.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      await GrantCitation.create({
        grantId: grant.id,
        citationId: noncomplianceCitation.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      await GrantCitation.create({
        grantId: grant.id,
        citationId: inactiveCitation.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      }),
      await GrantCitation.create({
        grantId: extraGrant.id,
        citationId: outOfScopeGrantCitation.id,
        region_id: extraRegion.id,
        recipient_id: extraRecipient.id,
        recipient_name: extraRecipient.name,
      }),
    );

    fixture.activityReportObjectiveCitations.push(
      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aro.id,
        citationId: deficiencyCitation.id,
        citation: deficiencyCitation.citation,
        findingId: deficiencyCitation.finding_uuid,
        grantId: grant.id,
        grantNumber: grant.number,
        reviewName: `Review ${TEST_KEY}`,
        standardId: 1,
        findingType: deficiencyCitation.calculated_finding_type,
        findingSource: 'Monitoring',
        acro: 'DEF',
        name: 'Deficiency Citation',
        severity: 1,
        reportDeliveryDate: '2025-02-20',
        monitoringFindingStatusName: 'Complete',
      }),
      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: filteredAro.id,
        citationId: deficiencyCitation.id,
        citation: deficiencyCitation.citation,
        findingId: deficiencyCitation.finding_uuid,
        grantId: grant.id,
        grantNumber: grant.number,
        reviewName: `Filtered Review ${TEST_KEY}`,
        standardId: 2,
        findingType: deficiencyCitation.calculated_finding_type,
        findingSource: 'Monitoring',
        acro: 'DEF',
        name: 'Filtered Deficiency Citation',
        severity: 2,
        reportDeliveryDate: '2025-04-21',
        monitoringFindingStatusName: 'Complete',
      }),
    );

    const noncomplianceReview = await DeliveredReview.create({
      mrid: 780000 + TEST_NUM,
      review_type: 'FA-2',
      review_status: 'Complete',
      outcome: 'Corrected',
      report_delivery_date: '2025-03-10',
    });
    const deficiencyFollowUpReview = await DeliveredReview.create({
      mrid: 790000 + TEST_NUM,
      review_type: 'Follow-up',
      review_status: 'Complete',
      outcome: 'Closed',
      report_delivery_date: '2025-01-20',
    });
    const deficiencyFa1Review = await DeliveredReview.create({
      mrid: 800000 + TEST_NUM,
      review_type: 'FA-1',
      review_status: 'Complete',
      outcome: 'Open',
      report_delivery_date: '2025-02-20',
    });
    const filteredStatusReview = await DeliveredReview.create({
      mrid: 810000 + TEST_NUM,
      review_type: 'FA-3',
      review_status: 'Draft',
      outcome: 'Ignored',
      report_delivery_date: '2025-03-25',
    });
    const outOfScopeGrantReview = await DeliveredReview.create({
      mrid: 820000 + TEST_NUM,
      review_type: 'FA-4',
      review_status: 'Complete',
      outcome: 'Ignored',
      report_delivery_date: '2025-03-30',
    });

    fixture.deliveredReviews.push(
      noncomplianceReview,
      deficiencyFollowUpReview,
      deficiencyFa1Review,
      filteredStatusReview,
      outOfScopeGrantReview,
    );

    await createReviewLinks({
      grant,
      recipient,
      citation: noncomplianceCitation,
      review: noncomplianceReview,
    });
    await createReviewLinks({
      grant,
      recipient,
      citation: deficiencyCitation,
      review: deficiencyFollowUpReview,
    });
    await createReviewLinks({
      grant,
      recipient,
      citation: deficiencyCitation,
      review: deficiencyFa1Review,
    });
    await createReviewLinks({
      grant,
      recipient,
      citation: deficiencyCitation,
      review: filteredStatusReview,
    });
    await createReviewLinks({
      grant: extraGrant,
      recipient: extraRecipient,
      citation: outOfScopeGrantCitation,
      review: outOfScopeGrantReview,
    });
  });

  afterAll(async () => {
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
    await ActivityReportCollaborator.destroy({
      where: { id: fixture.activityReportCollaborators.map((record) => record.id) },
      force: true,
    });
    await ActivityReportObjectiveCitation.destroy({
      where: { id: fixture.activityReportObjectiveCitations.map((record) => record.id) },
      force: true,
    });
    await ActivityReportObjectiveTopic.destroy({
      where: { id: fixture.activityReportObjectiveTopics.map((record) => record.id) },
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
    await Program.destroy({
      where: { id: fixture.programs.map((record) => record.id) },
      force: true,
    });
    await Promise.all(fixture.topics.map((topic) => topic.destroy({ force: true })));
    await Promise.all(fixture.goals.map((goal) => destroyGoal(goal)));

    await fixture.reports.reduce(
      (promise, report) => promise.then(() => destroyReport(report)),
      Promise.resolve(),
    );

    await UserRole.destroy({
      where: { id: fixture.userRoles.map((record) => record.id) },
      force: true,
    });
    await User.destroy({
      where: { id: fixture.users.map((record) => record.id) },
      force: true,
    });

    await Promise.all(fixture.grants.map((grant) => grant.destroy({ force: true })));
    await Promise.all(fixture.recipients.map((recipient) => recipient.destroy({ force: true })));
    await Region.destroy({
      where: { id: fixture.regions.map((record) => record.id) },
      force: true,
    });
    await Promise.all(fixture.roles.map((role) => role.destroy({ force: true })));
    await db.sequelize.close();
  });

  it('queries citations through the database and remaps them into citation-first responses', async () => {
    const primaryRegion = fixture.regions[0];
    const primaryGrant = fixture.grants[0];
    const primaryRecipient = fixture.recipients[0];
    const approvedReport = fixture.reports[0];

    const data = await monitoringTta({
      citation: [{ active: true }],
      deliveredReview: [{ review_status: 'Complete' }],
      activityReport: [{ regionId: primaryRegion.id }],
      grant: { where: { regionId: primaryRegion.id } },
    });

    expect(data).toEqual([
      {
        recipientName: primaryRecipient.name,
        citationNumber: '1302.10',
        findingType: 'Noncompliance',
        status: 'Closed',
        category: 'ERSEA',
        grantNumbers: [primaryGrant.number],
        lastTTADate: null,
        reviews: [
          {
            name: '',
            reviewType: 'FA-2',
            reviewReceived: '03/10/2025',
            outcome: 'Corrected',
            findingStatus: 'Complete',
            specialists: [],
            objectives: [],
          },
        ],
      },
      {
        recipientName: primaryRecipient.name,
        citationNumber: '1302.12',
        findingType: 'Deficiency',
        status: 'Active',
        category: 'Health',
        grantNumbers: [primaryGrant.number],
        lastTTADate: '02/15/2025',
        reviews: [
          {
            name: '',
            reviewType: 'FA-1',
            reviewReceived: '02/20/2025',
            outcome: 'Open',
            findingStatus: 'Complete',
            specialists: [
              { name: 'Jane Doe, NC, SS', roles: ['NC', 'SS'] },
              { name: 'John Roe, GS', roles: ['GS'] },
            ],
            objectives: [
              {
                title: 'Improve health practices',
                activityReports: [{ id: approvedReport.id, displayId: approvedReport.displayId }],
                endDate: '02/15/2025',
                topics: [
                  `Monitoring TTA Health ${TEST_KEY}`,
                  `Monitoring TTA Nutrition ${TEST_KEY}`,
                ],
                status: OBJECTIVE_STATUS.IN_PROGRESS,
                participants: ['Alice', 'Bob'],
              },
            ],
          },
          {
            name: '',
            reviewType: 'Follow-up',
            reviewReceived: '01/20/2025',
            outcome: 'Closed',
            findingStatus: 'Complete',
            specialists: [
              { name: 'Jane Doe, NC, SS', roles: ['NC', 'SS'] },
              { name: 'John Roe, GS', roles: ['GS'] },
            ],
            objectives: [
              {
                title: 'Improve health practices',
                activityReports: [{ id: approvedReport.id, displayId: approvedReport.displayId }],
                endDate: '02/15/2025',
                topics: [
                  `Monitoring TTA Health ${TEST_KEY}`,
                  `Monitoring TTA Nutrition ${TEST_KEY}`,
                ],
                status: OBJECTIVE_STATUS.IN_PROGRESS,
                participants: ['Alice', 'Bob'],
              },
            ],
          },
        ],
      },
    ]);
  });
});
