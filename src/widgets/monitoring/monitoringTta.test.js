import { v4 as uuid } from 'uuid';
import { REPORT_STATUSES } from '@ttahub/common';
import db from '../../models';
import monitoringTta, {
  compareMonitoringTta,
  compareReviews,
  mergeSpecialists,
  objectivesFromCitation,
  specialistsFromCitation,
} from './monitoringTta';
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

  const getScopes = () => ({
    citation: [{ active: true }],
    deliveredReview: [{ review_status: 'Complete' }],
    activityReport: [{ regionId: fixture.regions[0].id }],
    grant: { where: { regionId: fixture.regions[0].id } },
    grantCitation: [{ region_id: fixture.regions[0].id }],
  });

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

    const region = await createRegion({ id: 50_000_000 + TEST_NUM, name: `Monitoring TTA Region ${TEST_KEY}` });
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

    const extraRegion = await createRegion({ id: 51_000_000 + TEST_NUM, name: `Filtered Region ${TEST_KEY}` });
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

    const secondaryRecipient = await createRecipient({ name: `Zoo Recipient ${TEST_KEY}` });
    const secondaryGrant = await createGrant({
      id: 715000 + TEST_NUM,
      recipientId: secondaryRecipient.id,
      regionId: region.id,
      number: `03HP${TEST_KEY}`,
      status: 'Active',
    });

    fixture.recipients.push(secondaryRecipient);
    fixture.grants.push(secondaryGrant);

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
    const secondaryRecipientCitation = await createCitation({
      mfid: 780000 + TEST_NUM,
      citationNumber: '1302.30',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Education',
    });

    const paginationCategories = [
      'Facilities',
      'Family Services',
      'Governance',
      'Eligibility',
      'Fiscal',
      'Family Services',
      'Facilities',
      'Fiscal',
      'Governance',
    ];

    const paginationCitations = await Promise.all(paginationCategories.map((category, index) => (
      createCitation({
        mfid: 790000 + TEST_NUM + index,
        citationNumber: `1302.${20 + index}`,
        status: 'Active',
        findingType: 'Noncompliance',
        category,
      })
    )));

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
      await GrantCitation.create({
        grantId: secondaryGrant.id,
        citationId: secondaryRecipientCitation.id,
        region_id: region.id,
        recipient_id: secondaryRecipient.id,
        recipient_name: secondaryRecipient.name,
      }),
      ...(await Promise.all(paginationCitations.map((citation) => GrantCitation.create({
        grantId: grant.id,
        citationId: citation.id,
        region_id: region.id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
      })))),
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
      review_name: `Noncompliance Review ${TEST_KEY}`,
    });
    const deficiencyFollowUpReview = await DeliveredReview.create({
      mrid: 790000 + TEST_NUM,
      review_type: 'Follow-up',
      review_status: 'Complete',
      outcome: 'Closed',
      report_delivery_date: '2025-01-20',
      review_name: `Deficiency Follow-up Review ${TEST_KEY}`,
    });
    const deficiencyFa1Review = await DeliveredReview.create({
      mrid: 800000 + TEST_NUM,
      review_type: 'FA-1',
      review_status: 'Complete',
      outcome: 'Open',
      report_delivery_date: '2025-02-20',
      review_name: `Deficiency FA-1 Review ${TEST_KEY}`,
    });
    const filteredStatusReview = await DeliveredReview.create({
      mrid: 810000 + TEST_NUM,
      review_type: 'FA-3',
      review_status: 'Draft',
      outcome: 'Ignored',
      report_delivery_date: '2025-03-25',
      review_name: `Filtered Status Review ${TEST_KEY}`,
    });
    const outOfScopeGrantReview = await DeliveredReview.create({
      mrid: 820000 + TEST_NUM,
      review_type: 'FA-4',
      review_status: 'Complete',
      outcome: 'Ignored',
      report_delivery_date: '2025-03-30',
      review_name: `Out of Scope Grant Review ${TEST_KEY}`,
    });
    const secondaryRecipientReview = await DeliveredReview.create({
      mrid: 830000 + TEST_NUM,
      review_type: 'FA-5',
      review_status: 'Complete',
      outcome: 'Open',
      report_delivery_date: '2025-03-15',
      review_name: `Secondary Recipient Review ${TEST_KEY}`,
    });

    const paginationReviews = await Promise.all(paginationCitations.map((citation, index) => (
      DeliveredReview.create({
        mrid: 840000 + TEST_NUM + index,
        review_type: `Extra-${index + 1}`,
        review_status: 'Complete',
        outcome: 'Open',
        report_delivery_date: `2025-03-${String(index + 1).padStart(2, '0')}`,
        review_name: `Pagination Review ${index + 1} ${TEST_KEY}`,
      })
    )));

    fixture.deliveredReviews.push(
      noncomplianceReview,
      deficiencyFollowUpReview,
      deficiencyFa1Review,
      filteredStatusReview,
      outOfScopeGrantReview,
      secondaryRecipientReview,
      ...paginationReviews,
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
    await createReviewLinks({
      grant: secondaryGrant,
      recipient: secondaryRecipient,
      citation: secondaryRecipientCitation,
      review: secondaryRecipientReview,
    });
    await Promise.all(paginationCitations.map((citation, index) => createReviewLinks({
      grant,
      recipient,
      citation,
      review: paginationReviews[index],
    })));
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    const primaryGrant = fixture.grants[0];
    const primaryRecipient = fixture.recipients[0];
    const approvedReport = fixture.reports[0];

    const { data } = await monitoringTta(getScopes(), { perPage: 10 });
    const noncomplianceCitation = data.find(({ citationNumber }) => citationNumber === '1302.10');
    const deficiencyCitation = data.find(({ citationNumber }) => citationNumber === '1302.12');

    expect(data).toHaveLength(10);

    expect(noncomplianceCitation).toEqual({
      id: `${fixture.citations[1].id}:${primaryRecipient.id}`,
      recipientName: primaryRecipient.name,
      recipientId: primaryRecipient.id,
      regionId: fixture.regions[0].id,
      citationId: fixture.citations[1].id,
      citationNumber: '1302.10',
      findingType: 'Noncompliance',
      status: 'Closed',
      category: 'ERSEA',
      grantNumbers: [`${primaryGrant.number} - EHS, HS`],
      lastTTADate: null,
      reviews: [
        {
          name: `Noncompliance Review ${TEST_KEY}`,
          reviewType: 'FA-2',
          reviewReceived: '03/10/2025',
          outcome: 'Corrected',
          findingStatus: 'Complete',
          specialists: [],
          objectives: [],
        },
      ],
    });

    expect(deficiencyCitation).toEqual({
      id: `${fixture.citations[0].id}:${primaryRecipient.id}`,
      recipientName: primaryRecipient.name,
      recipientId: primaryRecipient.id,
      regionId: fixture.regions[0].id,
      citationId: fixture.citations[0].id,
      citationNumber: '1302.12',
      findingType: 'Deficiency',
      status: 'Active',
      category: 'Health',
      grantNumbers: [`${primaryGrant.number} - EHS, HS`],
      lastTTADate: '02/15/2025',
      reviews: [
        {
          name: `Deficiency FA-1 Review ${TEST_KEY}`,
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
              id: expect.any(Number),
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
          name: `Deficiency Follow-up Review ${TEST_KEY}`,
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
              id: expect.any(Number),
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
    });
  });

  it('returns separate cards when the same recipient has two different citations', async () => {
    const primaryRecipient = fixture.recipients[0];

    const { data } = await monitoringTta(getScopes(), { sortBy: 'recipient_citation', perPage: 10 });
    const recipientCards = data
      .filter(({ recipientName, citationNumber }) => (
        recipientName === primaryRecipient.name
        && ['1302.10', '1302.12'].includes(citationNumber)
      ));

    expect(recipientCards.map(({ recipientName, citationNumber }) => ({
      recipientName,
      citationNumber,
    }))).toEqual([
      {
        recipientName: primaryRecipient.name,
        citationNumber: '1302.10',
      },
      {
        recipientName: primaryRecipient.name,
        citationNumber: '1302.12',
      },
    ]);

    expect(recipientCards.find(({ citationNumber }) => citationNumber === '1302.10').reviews)
      .toHaveLength(1);
    expect(recipientCards.find(({ citationNumber }) => citationNumber === '1302.12').reviews)
      .toHaveLength(2);
  });

  it('defaults to recipient then finding type sorting and supports alternate sort options', async () => {
    const { data: defaultData } = await monitoringTta(getScopes(), { perPage: 10 });
    const { data: recipientCitationData } = await monitoringTta(getScopes(), { sortBy: 'recipient_citation', perPage: 10 });
    const { data: findingData } = await monitoringTta(getScopes(), { sortBy: 'finding', perPage: 10 });
    const { data: citationDescData } = await monitoringTta(getScopes(), { sortBy: 'citation', direction: 'desc', perPage: 10 });
    const { data: recipientFindingDescData } = await monitoringTta(getScopes(), { sortBy: 'recipient_finding', direction: 'desc', perPage: 10 });
    const { data: recipientCitationDescData } = await monitoringTta(getScopes(), { sortBy: 'recipient_citation', direction: 'desc', perPage: 10 });
    const { data: findingDescData } = await monitoringTta(getScopes(), { sortBy: 'finding', direction: 'desc', perPage: 10 });
    const { data: citationAscData } = await monitoringTta(getScopes(), { sortBy: 'citation', direction: 'asc', perPage: 10 });

    expect(defaultData.map(({ recipientName, citationNumber }) => `${recipientName}:${citationNumber}`)).toEqual([
      `Recipient ${TEST_KEY}:1302.12`,
      `Recipient ${TEST_KEY}:1302.10`,
      `Recipient ${TEST_KEY}:1302.20`,
      `Recipient ${TEST_KEY}:1302.21`,
      `Recipient ${TEST_KEY}:1302.22`,
      `Recipient ${TEST_KEY}:1302.23`,
      `Recipient ${TEST_KEY}:1302.24`,
      `Recipient ${TEST_KEY}:1302.25`,
      `Recipient ${TEST_KEY}:1302.26`,
      `Recipient ${TEST_KEY}:1302.27`,
    ]);

    expect(recipientCitationData.map(({ recipientName, citationNumber }) => `${recipientName}:${citationNumber}`)).toEqual([
      `Recipient ${TEST_KEY}:1302.10`,
      `Recipient ${TEST_KEY}:1302.12`,
      `Recipient ${TEST_KEY}:1302.20`,
      `Recipient ${TEST_KEY}:1302.21`,
      `Recipient ${TEST_KEY}:1302.22`,
      `Recipient ${TEST_KEY}:1302.23`,
      `Recipient ${TEST_KEY}:1302.24`,
      `Recipient ${TEST_KEY}:1302.25`,
      `Recipient ${TEST_KEY}:1302.26`,
      `Recipient ${TEST_KEY}:1302.27`,
    ]);

    expect(findingData.map(({ category, citationNumber }) => `${category}:${citationNumber}`)).toEqual([
      'Education:1302.30',
      'Eligibility:1302.23',
      'ERSEA:1302.10',
      'Facilities:1302.20',
      'Facilities:1302.26',
      'Family Services:1302.21',
      'Family Services:1302.25',
      'Fiscal:1302.24',
      'Fiscal:1302.27',
      'Governance:1302.22',
    ]);

    expect(citationDescData.map(({ recipientName, citationNumber }) => `${recipientName}:${citationNumber}`)).toEqual([
      `Zoo Recipient ${TEST_KEY}:1302.30`,
      `Recipient ${TEST_KEY}:1302.28`,
      `Recipient ${TEST_KEY}:1302.27`,
      `Recipient ${TEST_KEY}:1302.26`,
      `Recipient ${TEST_KEY}:1302.25`,
      `Recipient ${TEST_KEY}:1302.24`,
      `Recipient ${TEST_KEY}:1302.23`,
      `Recipient ${TEST_KEY}:1302.22`,
      `Recipient ${TEST_KEY}:1302.21`,
      `Recipient ${TEST_KEY}:1302.20`,
    ]);

    expect(recipientFindingDescData.map(({ recipientName, citationNumber }) => `${recipientName}:${citationNumber}`)).toEqual([
      `Zoo Recipient ${TEST_KEY}:1302.30`,
      `Recipient ${TEST_KEY}:1302.12`,
      `Recipient ${TEST_KEY}:1302.10`,
      `Recipient ${TEST_KEY}:1302.20`,
      `Recipient ${TEST_KEY}:1302.21`,
      `Recipient ${TEST_KEY}:1302.22`,
      `Recipient ${TEST_KEY}:1302.23`,
      `Recipient ${TEST_KEY}:1302.24`,
      `Recipient ${TEST_KEY}:1302.25`,
      `Recipient ${TEST_KEY}:1302.26`,
    ]);

    expect(recipientCitationDescData.map(({ recipientName, citationNumber }) => `${recipientName}:${citationNumber}`)).toEqual([
      `Zoo Recipient ${TEST_KEY}:1302.30`,
      `Recipient ${TEST_KEY}:1302.10`,
      `Recipient ${TEST_KEY}:1302.12`,
      `Recipient ${TEST_KEY}:1302.20`,
      `Recipient ${TEST_KEY}:1302.21`,
      `Recipient ${TEST_KEY}:1302.22`,
      `Recipient ${TEST_KEY}:1302.23`,
      `Recipient ${TEST_KEY}:1302.24`,
      `Recipient ${TEST_KEY}:1302.25`,
      `Recipient ${TEST_KEY}:1302.26`,
    ]);

    expect(findingDescData.map(({ category, citationNumber }) => `${category}:${citationNumber}`)).toEqual([
      'Health:1302.12',
      'Governance:1302.22',
      'Governance:1302.28',
      'Fiscal:1302.24',
      'Fiscal:1302.27',
      'Family Services:1302.21',
      'Family Services:1302.25',
      'Facilities:1302.20',
      'Facilities:1302.26',
      'ERSEA:1302.10',
    ]);

    expect(citationAscData.map(({ recipientName, citationNumber }) => `${recipientName}:${citationNumber}`)).toEqual([
      `Recipient ${TEST_KEY}:1302.10`,
      `Recipient ${TEST_KEY}:1302.12`,
      `Recipient ${TEST_KEY}:1302.20`,
      `Recipient ${TEST_KEY}:1302.21`,
      `Recipient ${TEST_KEY}:1302.22`,
      `Recipient ${TEST_KEY}:1302.23`,
      `Recipient ${TEST_KEY}:1302.24`,
      `Recipient ${TEST_KEY}:1302.25`,
      `Recipient ${TEST_KEY}:1302.26`,
      `Recipient ${TEST_KEY}:1302.27`,
    ]);
  });

  it('merges specialists while skipping empty names', () => {
    expect(mergeSpecialists([
      { name: '', roles: ['NC'] },
      { name: 'John Roe', roles: ['GS'] },
      { name: 'Jane Doe', roles: ['SS', 'NC'] },
      { name: 'Jane Doe', roles: ['SS', null] },
    ])).toEqual([
      { name: 'Jane Doe', roles: ['NC', 'SS'] },
      { name: 'John Roe', roles: ['GS'] },
    ]);
  });

  it('ignores missing activity reports and unnamed collaborators when collecting specialists', () => {
    expect(specialistsFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: {
            activityReport: null,
          },
        },
        {
          activityReportObjective: {
            activityReport: {
              author: {
                fullName: 'Jane Doe',
                roles: [{ name: 'SS' }, { name: 'NC' }],
              },
              activityReportCollaborators: [
                {
                  user: {
                    fullName: '',
                    roles: [{ name: 'GS' }],
                  },
                },
                {
                  user: {
                    fullName: 'John Roe',
                    roles: [{ name: 'GS' }],
                  },
                },
              ],
            },
          },
        },
      ],
    })).toEqual([
      { name: 'Jane Doe', roles: ['NC', 'SS'] },
      { name: 'John Roe', roles: ['GS'] },
    ]);
  });

  it('defaults missing author and collaborator roles to empty arrays', () => {
    expect(specialistsFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: {
            activityReport: {
              author: {
                fullName: 'Author Without Roles',
              },
              activityReportCollaborators: [
                {
                  user: {
                    fullName: 'Collaborator Without Roles',
                  },
                },
              ],
            },
          },
        },
      ],
    })).toEqual([
      { name: 'Author Without Roles', roles: [] },
      { name: 'Collaborator Without Roles', roles: [] },
    ]);
  });

  it('ignores incomplete objectives and sorts same-day objectives by title', () => {
    expect(objectivesFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: null,
        },
        {
          activityReportObjective: {
            id: 3,
            activityReport: {
              id: 300,
              displayId: 'AR-300',
              endDate: '2025-03-01T12:00:00Z',
              participants: [],
            },
            objective: {
              title: 'Newest objective',
              status: OBJECTIVE_STATUS.NOT_STARTED,
            },
            activityReportObjectiveTopics: [],
          },
        },
        {
          activityReportObjective: {
            id: 2,
            activityReport: {
              id: 200,
              displayId: 'AR-200',
              endDate: '2025-02-15T12:00:00Z',
              participants: ['Bob', 'Alice', 'Bob'],
            },
            objective: {
              title: 'Zeta objective',
              status: OBJECTIVE_STATUS.IN_PROGRESS,
            },
            activityReportObjectiveTopics: [
              { topic: { name: 'Health' } },
              { topic: { name: 'Education' } },
              { topic: { name: 'Health' } },
            ],
          },
        },
        {
          activityReportObjective: {
            id: 1,
            activityReport: {
              id: 100,
              displayId: 'AR-100',
              endDate: '2025-02-15T12:00:00Z',
              participants: ['Charlie'],
            },
            objective: {
              title: 'Alpha objective',
              status: OBJECTIVE_STATUS.COMPLETE,
            },
            activityReportObjectiveTopics: [],
          },
        },
      ],
    })).toEqual([
      {
        title: 'Newest objective',
        activityReports: [{ id: 300, displayId: 'AR-300' }],
        endDate: '03/01/2025',
        topics: [],
        status: OBJECTIVE_STATUS.NOT_STARTED,
      },
      {
        title: 'Alpha objective',
        activityReports: [{ id: 100, displayId: 'AR-100' }],
        endDate: '02/15/2025',
        topics: [],
        status: OBJECTIVE_STATUS.COMPLETE,
        participants: ['Charlie'],
      },
      {
        title: 'Zeta objective',
        activityReports: [{ id: 200, displayId: 'AR-200' }],
        endDate: '02/15/2025',
        topics: ['Education', 'Health'],
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        participants: ['Bob', 'Alice'],
      },
    ]);
  });

  it('defaults missing objective fields and removes empty topic names', () => {
    expect(objectivesFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: {
            id: 20,
            activityReport: {
              id: 400,
              displayId: null,
              endDate: '2025-04-01T12:00:00Z',
              participants: null,
            },
            objective: {
              title: null,
              status: null,
            },
            activityReportObjectiveTopics: [
              { topic: null },
              { topic: { name: null } },
              { topic: { name: 'Topic B' } },
              { topic: { name: 'Topic A' } },
            ],
          },
        },
      ],
    })).toEqual([
      {
        title: '',
        activityReports: [{ id: 400, displayId: '' }],
        endDate: '04/01/2025',
        topics: ['Topic A', 'Topic B'],
        status: '',
      },
    ]);
  });

  it('defaults missing objective topic associations to an empty list', () => {
    expect(objectivesFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: {
            id: 21,
            activityReport: {
              id: 401,
              displayId: 'AR-401',
              endDate: '2025-04-02T12:00:00Z',
              participants: [],
            },
            objective: {
              title: 'Objective without topics',
              status: OBJECTIVE_STATUS.NOT_STARTED,
            },
          },
        },
      ],
    })).toEqual([
      {
        title: 'Objective without topics',
        activityReports: [{ id: 401, displayId: 'AR-401' }],
        endDate: '04/02/2025',
        topics: [],
        status: OBJECTIVE_STATUS.NOT_STARTED,
      },
    ]);
  });

  it('sorts objectives with invalid end dates after valid dates and by title when both are invalid', () => {
    expect(objectivesFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: {
            id: 30,
            activityReport: {
              id: 500,
              displayId: 'AR-500',
              endDate: '2025-04-03T12:00:00Z',
              participants: [],
            },
            objective: {
              title: 'Valid objective',
              status: OBJECTIVE_STATUS.NOT_STARTED,
            },
            activityReportObjectiveTopics: [],
          },
        },
        {
          activityReportObjective: {
            id: 31,
            activityReport: {
              id: 501,
              displayId: 'AR-501',
              endDate: null,
              participants: [],
            },
            objective: {
              title: 'Zulu objective',
              status: OBJECTIVE_STATUS.IN_PROGRESS,
            },
            activityReportObjectiveTopics: [],
          },
        },
        {
          activityReportObjective: {
            id: 32,
            activityReport: {
              id: 502,
              displayId: 'AR-502',
              endDate: 'not-a-date',
              participants: [],
            },
            objective: {
              title: 'Alpha objective',
              status: OBJECTIVE_STATUS.COMPLETE,
            },
            activityReportObjectiveTopics: [],
          },
        },
      ],
    })).toEqual([
      {
        title: 'Valid objective',
        activityReports: [{ id: 500, displayId: 'AR-500' }],
        endDate: '04/03/2025',
        topics: [],
        status: OBJECTIVE_STATUS.NOT_STARTED,
      },
      {
        title: 'Alpha objective',
        activityReports: [{ id: 502, displayId: 'AR-502' }],
        endDate: '',
        topics: [],
        status: OBJECTIVE_STATUS.COMPLETE,
      },
      {
        title: 'Zulu objective',
        activityReports: [{ id: 501, displayId: 'AR-501' }],
        endDate: '',
        topics: [],
        status: OBJECTIVE_STATUS.IN_PROGRESS,
      },
    ]);
  });

  it('merges duplicate objectives (same objective.id, different ARO ids) into a single entry', () => {
    expect(objectivesFromCitation({
      activityReportObjectiveCitations: [
        {
          activityReportObjective: {
            id: 10,
            activityReport: {
              id: 100,
              displayId: 'AR-100',
              endDate: '2025-01-15T12:00:00Z',
              participants: ['Alice', 'Bob'],
            },
            objective: {
              id: 999,
              title: 'Shared objective',
              status: 'In Progress',
            },
            activityReportObjectiveTopics: [
              { topic: { name: 'Health' } },
            ],
          },
        },
        {
          activityReportObjective: {
            id: 11,
            activityReport: {
              id: 200,
              displayId: 'AR-200',
              endDate: '2025-03-01T12:00:00Z',
              participants: ['Bob', 'Charlie'],
            },
            objective: {
              id: 999,
              title: 'Shared objective',
              status: 'In Progress',
            },
            activityReportObjectiveTopics: [
              { topic: { name: 'Education' } },
              { topic: { name: 'Health' } },
            ],
          },
        },
      ],
    })).toEqual([
      {
        id: 999,
        title: 'Shared objective',
        activityReports: [
          { id: 200, displayId: 'AR-200' },
          { id: 100, displayId: 'AR-100' },
        ],
        endDate: '03/01/2025',
        topics: ['Education', 'Health'],
        status: 'In Progress',
        participants: ['Alice', 'Bob', 'Charlie'],
      },
    ]);
  });

  it('sorts same-day reviews by review type', () => {
    expect([
      {
        reviewReceived: '02/20/2025',
        reviewType: 'Follow-up',
      },
      {
        reviewReceived: '02/20/2025',
        reviewType: 'FA-1',
      },
    ].sort(compareReviews)).toEqual([
      {
        reviewReceived: '02/20/2025',
        reviewType: 'FA-1',
      },
      {
        reviewReceived: '02/20/2025',
        reviewType: 'Follow-up',
      },
    ]);
  });

  it('sorts reviews with invalid received dates after valid dates and by review type when both are invalid', () => {
    expect([
      {
        reviewReceived: '',
        reviewType: 'Zulu',
      },
      {
        reviewReceived: '02/20/2025',
        reviewType: 'FA-1',
      },
      {
        reviewReceived: 'not-a-date',
        reviewType: 'Alpha',
      },
    ].sort(compareReviews)).toEqual([
      {
        reviewReceived: '02/20/2025',
        reviewType: 'FA-1',
      },
      {
        reviewReceived: 'not-a-date',
        reviewType: 'Alpha',
      },
      {
        reviewReceived: '',
        reviewType: 'Zulu',
      },
    ]);
  });

  it('uses tie breakers for each monitoring tta sort option', async () => {
    const rows = [
      {
        recipientName: '',
        citationNumber: '1302.2',
        findingType: 'Beta',
        category: 'Category B',
      },
      {
        recipientName: '',
        citationNumber: '1302.2',
        findingType: 'Alpha',
        category: 'Category C',
      },
      {
        recipientName: '',
        citationNumber: '1302.2',
        findingType: 'Alpha',
        category: 'Category A',
      },
      {
        recipientName: 'Recipient 2',
        citationNumber: '1302.50',
        findingType: 'Alpha',
        category: 'Category Z',
      },
      {
        recipientName: 'Recipient 10',
        citationNumber: '1302.50',
        findingType: 'Alpha',
        category: 'Category Z',
      },
      {
        recipientName: 'Recipient A',
        citationNumber: '1302.10',
        findingType: 'Alpha',
        category: 'Category B',
      },
      {
        recipientName: 'Recipient A',
        citationNumber: '1302.11',
        findingType: 'Alpha',
        category: 'Category A',
      },
      {
        recipientName: 'Recipient A',
        citationNumber: '1302.10',
        findingType: 'Beta',
        category: 'Category A',
      },
      {
        recipientName: 'Recipient B',
        citationNumber: '1302.2',
        findingType: 'Alpha',
        category: 'Category A',
      },
      {
        recipientName: 'Recipient A',
        citationNumber: '1302.10',
        findingType: 'Alpha',
        category: 'Category A',
      },
    ];

    const formatRows = (sortedRows) => sortedRows.map((row) => [
      row.recipientName,
      row.citationNumber,
      row.findingType,
      row.category,
    ]);

    const recipientCitationRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'recipient_citation', 'asc')));
    const findingRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'finding', 'asc')));
    const citationRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'citation', 'asc')));
    const recipientFindingRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'recipient_finding', 'asc')));

    expect(recipientCitationRows).toEqual([
      ['', '1302.2', 'Alpha', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
    ]);

    expect(findingRows).toEqual([
      ['', '1302.2', 'Alpha', 'Category A'],
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['', '1302.2', 'Beta', 'Category B'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
    ]);

    expect(citationRows).toEqual([
      ['', '1302.2', 'Alpha', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
    ]);

    expect(recipientFindingRows).toEqual([
      ['', '1302.2', 'Alpha', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
    ]);

    // Verify desc direction reverses the primary sort key while keeping tie-breakers ascending.
    const recipientCitationDescRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'recipient_citation', 'desc')));
    const findingDescRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'finding', 'desc')));
    const citationDescRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'citation', 'desc')));
    const recipientFindingDescRows = formatRows([...rows].sort((a, b) => compareMonitoringTta(a, b, 'recipient_finding', 'desc')));

    expect(recipientCitationDescRows).toEqual([
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['', '1302.2', 'Alpha', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
    ]);

    expect(findingDescRows).toEqual([
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['', '1302.2', 'Alpha', 'Category A'],
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
    ]);

    expect(citationDescRows).toEqual([
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
    ]);

    expect(recipientFindingDescRows).toEqual([
      ['Recipient B', '1302.2', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Alpha', 'Category B'],
      ['Recipient A', '1302.11', 'Alpha', 'Category A'],
      ['Recipient A', '1302.10', 'Beta', 'Category A'],
      ['Recipient 10', '1302.50', 'Alpha', 'Category Z'],
      ['Recipient 2', '1302.50', 'Alpha', 'Category Z'],
      ['', '1302.2', 'Alpha', 'Category A'],
      ['', '1302.2', 'Alpha', 'Category C'],
      ['', '1302.2', 'Beta', 'Category B'],
    ]);
  });

  it('sorts citations with alphanumeric suffixes by leading numeric portion', () => {
    // "1302.42(b)..." should sort before "1302.43" because 42 < 43.
    // The bug was that stripping all non-digits from "42(b)1(i)" gave 421, placing it after 43.
    const rows = [
      {
        recipientName: 'Recipient A', citationNumber: '1302.43', findingType: 'Alpha', category: 'Cat A',
      },
      {
        recipientName: 'Recipient A', citationNumber: '1302.42(b)1(i)', findingType: 'Alpha', category: 'Cat A',
      },
      {
        recipientName: 'Recipient A', citationNumber: '1302.42(b)(2)', findingType: 'Alpha', category: 'Cat A',
      },
      {
        recipientName: 'Recipient A', citationNumber: '1302.47(b)(1)(ii)', findingType: 'Alpha', category: 'Cat A',
      },
      {
        recipientName: 'Recipient A', citationNumber: '1302.90(c)(1)(ii)', findingType: 'Alpha', category: 'Cat A',
      },
      {
        recipientName: 'Recipient A', citationNumber: '1302.91(e)(7)', findingType: 'Alpha', category: 'Cat A',
      },
    ];

    const sorted = [...rows].sort((a, b) => compareMonitoringTta(a, b, 'recipient_citation', 'asc'));
    expect(sorted.map((r) => r.citationNumber)).toEqual([
      '1302.42(b)(2)',
      '1302.42(b)1(i)',
      '1302.43',
      '1302.47(b)(1)(ii)',
      '1302.90(c)(1)(ii)',
      '1302.91(e)(7)',
    ]);
  });

  it('ignores invalid objective end dates when calculating last tta date', async () => {
    jest.spyOn(GrantCitation, 'findAndCountAll').mockResolvedValueOnce({
      rows: [
        {
          citationId: 999,
          recipientId: 501,
          recipientName: 'Recipient Under Test',
          regionId: 1,
        },
      ],
      count: [{ count: 1 }],
    });
    jest.spyOn(Citation, 'findAll').mockResolvedValueOnce([
      {
        id: 999,
        citation: '1302.50',
        calculated_status: 'Active',
        calculated_finding_type: 'Deficiency',
        guidance_category: 'Health',
        grantCitations: [{
          grantId: 77,
          recipient_id: 501,
          recipient_name: 'Recipient Under Test',
          region_id: 1,
          grant: {
            id: 77,
            number: '01HPTEST',
            numberWithProgramTypes: '01HPTEST',
            programs: [],
            recipient: {
              id: 501,
              name: 'Recipient Under Test',
            },
          },
        }],
        deliveredReviewCitations: [{
          deliveredReview: {
            id: 88,
            review_name: null,
            review_type: 'FA-1',
            outcome: 'Open',
            report_delivery_date: '2025-02-20',
            review_status: 'Complete',
            grantDeliveredReviews: [{
              grantId: 77,
              recipient_id: 501,
            }],
          },
        }],
        activityReportObjectiveCitations: [{
          grantId: 77,
          grantNumber: '01HPTEST',
          reviewName: 'Review',
          activityReportObjective: {
            id: 10,
            activityReport: {
              id: 20,
              displayId: 'R-20',
              endDate: null,
              participants: ['Alice'],
            },
            objective: {
              title: 'Objective with invalid date',
              status: OBJECTIVE_STATUS.IN_PROGRESS,
            },
            activityReportObjectiveTopics: [],
          },
        }],
      },
    ]);

    await expect(monitoringTta({
      citation: [],
      deliveredReview: [],
      activityReport: [],
      grant: {},
      grantCitation: [],
    })).resolves.toMatchObject({
      total: 1,
      data: [
        {
          recipientName: 'Recipient Under Test',
          citationNumber: '1302.50',
          findingType: 'Deficiency',
          status: 'Active',
          category: 'Health',
          grantNumbers: ['01HPTEST'],
          lastTTADate: null,
          reviews: [
            {
              name: '',
              reviewType: 'FA-1',
              reviewReceived: '02/20/2025',
              outcome: 'Open',
              findingStatus: 'Complete',
              specialists: [],
              objectives: [
                {
                  title: 'Objective with invalid date',
                  activityReports: [{ id: 20, displayId: 'R-20' }],
                  endDate: '',
                  topics: [],
                  status: OBJECTIVE_STATUS.IN_PROGRESS,
                  participants: ['Alice'],
                },
              ],
            },
          ],
        },
      ],
    }); // close toMatchObject
  });

  it('paginates citation results 10 at a time using offset', async () => {
    const { data: firstPage, total: firstTotal } = await monitoringTta(getScopes(), { sortBy: 'citation', perPage: 10, offset: 0 });
    const { data: secondPage, total: secondTotal } = await monitoringTta(getScopes(), { sortBy: 'citation', perPage: 10, offset: 10 });
    const { data: thirdPage, total: thirdTotal } = await monitoringTta(getScopes(), { sortBy: 'citation', perPage: 10, offset: 20 });

    expect(firstPage).toHaveLength(10);
    expect(firstTotal).toBe(12);
    expect(firstPage.map(({ citationNumber }) => citationNumber)).toEqual([
      '1302.10',
      '1302.12',
      '1302.20',
      '1302.21',
      '1302.22',
      '1302.23',
      '1302.24',
      '1302.25',
      '1302.26',
      '1302.27',
    ]);

    expect(secondPage.map(({ citationNumber }) => citationNumber)).toEqual([
      '1302.28',
      '1302.30',
    ]);
    expect(secondTotal).toBe(12);

    expect(thirdPage).toEqual([]);
    expect(thirdTotal).toBe(12);
  });

  it('returns one recipient-scoped card per citation and filters nested data to that recipient', async () => {
    const primaryGrant = fixture.grants[0];
    const primaryRecipient = fixture.recipients[0];
    const secondaryGrant = fixture.grants[2];
    const secondaryRecipient = fixture.recipients[2];
    const approvedReport = fixture.reports[0];
    const author = fixture.users[0];
    const primaryTopic = fixture.topics[0];
    const secondaryTopic = fixture.topics[1];

    const multiGrantCitation = await createCitation({
      mfid: 900000 + TEST_NUM,
      citationNumber: '1302.91',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Multi Grant',
    });
    const multiGrantReview = await DeliveredReview.create({
      mrid: 900000 + TEST_NUM,
      review_type: 'FA-Multi',
      review_status: 'Complete',
      outcome: 'Open',
      report_delivery_date: '2025-03-31',
      review_name: `Multi-Grant Review ${TEST_KEY}`,
    });

    fixture.deliveredReviews.push(multiGrantReview);
    const secondaryReport = await createReport({
      activityRecipients: [{ grantId: secondaryGrant.id }],
      userId: author.id,
      regionId: fixture.regions[0].id,
      startDate: '2025-03-25T12:00:00Z',
      endDate: '2025-03-25T12:00:00Z',
      participants: ['Zoo Person'],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    });
    fixture.reports.push(secondaryReport);

    const primaryGoal = await createGoal({
      grantId: primaryGrant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    const secondaryGoal = await createGoal({
      grantId: secondaryGrant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });
    fixture.goals.push(primaryGoal, secondaryGoal);

    const primaryObjective = await Objective.create({
      goalId: primaryGoal.id,
      title: 'Primary multi-grant objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });
    const secondaryObjective = await Objective.create({
      goalId: secondaryGoal.id,
      title: 'Secondary multi-grant objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });
    fixture.objectives.push(primaryObjective, secondaryObjective);

    const primaryAro = await ActivityReportObjective.create({
      activityReportId: approvedReport.id,
      objectiveId: primaryObjective.id,
    });
    const secondaryAro = await ActivityReportObjective.create({
      activityReportId: secondaryReport.id,
      objectiveId: secondaryObjective.id,
    });
    fixture.activityReportObjectives.push(primaryAro, secondaryAro);

    fixture.activityReportObjectiveTopics.push(
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: primaryAro.id,
        topicId: primaryTopic.id,
      }),
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: secondaryAro.id,
        topicId: secondaryTopic.id,
      }),
    );

    fixture.activityReportObjectiveCitations.push(
      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: primaryAro.id,
        citationId: multiGrantCitation.id,
        citation: multiGrantCitation.citation,
        findingId: multiGrantCitation.finding_uuid,
        grantId: primaryGrant.id,
        grantNumber: primaryGrant.number,
        reviewName: multiGrantReview.review_name,
        standardId: 3,
        findingType: multiGrantCitation.calculated_finding_type,
        findingSource: 'Monitoring',
        acro: 'DEF',
        name: 'Primary Multi Grant Citation',
        severity: 1,
        reportDeliveryDate: '2025-03-31',
        monitoringFindingStatusName: 'Complete',
      }),
      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: secondaryAro.id,
        citationId: multiGrantCitation.id,
        citation: multiGrantCitation.citation,
        findingId: multiGrantCitation.finding_uuid,
        grantId: secondaryGrant.id,
        grantNumber: secondaryGrant.number,
        reviewName: multiGrantReview.review_name,
        standardId: 4,
        findingType: multiGrantCitation.calculated_finding_type,
        findingSource: 'Monitoring',
        acro: 'DEF',
        name: 'Secondary Multi Grant Citation',
        severity: 1,
        reportDeliveryDate: '2025-03-31',
        monitoringFindingStatusName: 'Complete',
      }),
    );

    fixture.grantCitations.push(
      await GrantCitation.create({
        grantId: primaryGrant.id,
        citationId: multiGrantCitation.id,
        region_id: primaryGrant.regionId,
        recipient_id: primaryRecipient.id,
        recipient_name: primaryRecipient.name,
      }),
      await GrantCitation.create({
        grantId: secondaryGrant.id,
        citationId: multiGrantCitation.id,
        region_id: secondaryGrant.regionId,
        recipient_id: secondaryRecipient.id,
        recipient_name: secondaryRecipient.name,
      }),
    );

    await createReviewLinks({
      grant: primaryGrant,
      recipient: primaryRecipient,
      citation: multiGrantCitation,
      review: multiGrantReview,
    });
    fixture.grantDeliveredReviews.push(await GrantDeliveredReview.create({
      grantId: secondaryGrant.id,
      deliveredReviewId: multiGrantReview.id,
      region_id: secondaryGrant.regionId,
      recipient_id: secondaryRecipient.id,
      recipient_name: secondaryRecipient.name,
    }));

    const { data: secondPage } = await monitoringTta(getScopes(), { sortBy: 'citation', offset: 10 });
    const multiGrantCards = secondPage
      .filter(({ citationNumber }) => citationNumber === '1302.91');
    const primaryCard = multiGrantCards
      .find(({ recipientName }) => recipientName === primaryRecipient.name);
    const secondaryCard = multiGrantCards
      .find(({ recipientName }) => recipientName === secondaryRecipient.name);

    expect(multiGrantCards).toHaveLength(2);

    expect(primaryCard).toMatchObject({
      recipientName: primaryRecipient.name,
      citationNumber: '1302.91',
      grantNumbers: [`${primaryGrant.number} - EHS, HS`],
      lastTTADate: '02/15/2025',
      reviews: [{
        name: `Multi-Grant Review ${TEST_KEY}`,
        reviewType: 'FA-Multi',
        reviewReceived: '03/31/2025',
        outcome: 'Open',
        findingStatus: 'Complete',
        specialists: [
          { name: 'Jane Doe, NC, SS', roles: ['NC', 'SS'] },
          { name: 'John Roe, GS', roles: ['GS'] },
        ],
        objectives: [{
          title: 'Primary multi-grant objective',
          activityReports: [{ id: approvedReport.id, displayId: approvedReport.displayId }],
          endDate: '02/15/2025',
          topics: [`Monitoring TTA Health ${TEST_KEY}`],
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          participants: ['Alice', 'Bob'],
        }],
      }],
    });

    expect(secondaryCard).toMatchObject({
      recipientName: secondaryRecipient.name,
      citationNumber: '1302.91',
      grantNumbers: [secondaryGrant.number],
      lastTTADate: '03/25/2025',
      reviews: [{
        name: `Multi-Grant Review ${TEST_KEY}`,
        reviewType: 'FA-Multi',
        reviewReceived: '03/31/2025',
        outcome: 'Open',
        findingStatus: 'Complete',
        specialists: [
          { name: 'Jane Doe, NC, SS', roles: ['NC', 'SS'] },
        ],
        objectives: [{
          title: 'Secondary multi-grant objective',
          activityReports: [{ id: secondaryReport.id, displayId: secondaryReport.displayId }],
          endDate: '03/25/2025',
          topics: [`Monitoring TTA Nutrition ${TEST_KEY}`],
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          participants: ['Zoo Person'],
        }],
      }],
    });
  });

  it('merges two GrantCitation rows into one card when the same citation is linked to two grants for the same recipient', async () => {
    const primaryGrant = fixture.grants[0];
    const primaryRecipient = fixture.recipients[0];

    const secondGrantSameRecipient = await createGrant({
      id: 920000 + TEST_NUM,
      recipientId: primaryRecipient.id,
      regionId: fixture.regions[0].id,
      number: `04HP${TEST_KEY}`,
      status: 'Active',
    });
    fixture.grants.push(secondGrantSameRecipient);

    const sameRecipientCitation = await createCitation({
      mfid: 910000 + TEST_NUM,
      citationNumber: '1302.92',
      status: 'Active',
      findingType: 'Deficiency',
      category: 'Same Recipient Two Grants',
    });

    const sameRecipientReview = await DeliveredReview.create({
      mrid: 910000 + TEST_NUM,
      review_type: 'FA-1',
      review_status: 'Complete',
      outcome: 'Open',
      report_delivery_date: '2025-04-01',
      review_name: `Same Recipient Multi-Grant Review ${TEST_KEY}`,
    });
    fixture.deliveredReviews.push(sameRecipientReview);

    fixture.grantCitations.push(
      await GrantCitation.create({
        grantId: primaryGrant.id,
        citationId: sameRecipientCitation.id,
        region_id: primaryGrant.regionId,
        recipient_id: primaryRecipient.id,
        recipient_name: primaryRecipient.name,
      }),
      await GrantCitation.create({
        grantId: secondGrantSameRecipient.id,
        citationId: sameRecipientCitation.id,
        region_id: secondGrantSameRecipient.regionId,
        recipient_id: primaryRecipient.id,
        recipient_name: primaryRecipient.name,
      }),
    );

    // createReviewLinks creates GrantDeliveredReview + DeliveredReviewCitation for the first grant.
    // The second grant gets only a GrantDeliveredReview since the DeliveredReviewCitation exists.
    await createReviewLinks({
      grant: primaryGrant,
      recipient: primaryRecipient,
      citation: sameRecipientCitation,
      review: sameRecipientReview,
    });
    fixture.grantDeliveredReviews.push(
      await GrantDeliveredReview.create({
        grantId: secondGrantSameRecipient.id,
        deliveredReviewId: sameRecipientReview.id,
        region_id: secondGrantSameRecipient.regionId,
        recipient_id: primaryRecipient.id,
        recipient_name: primaryRecipient.name,
      }),
    );

    const { data } = await monitoringTta(getScopes(), { sortBy: 'citation', perPage: 100, offset: 0 });
    const sameRecipientCards = data.filter(({ citationNumber }) => citationNumber === '1302.92');

    // Bug: without the fix, two cards are returned (one per GrantCitation row).
    // After the fix, exactly one merged card should be returned.
    expect(sameRecipientCards).toHaveLength(1);

    const [card] = sameRecipientCards;
    expect(card.id).toBe(`${sameRecipientCitation.id}:${primaryRecipient.id}`);
    expect(card.grantNumbers).toEqual(
      expect.arrayContaining([
        expect.stringContaining(primaryGrant.number),
        expect.stringContaining(secondGrantSameRecipient.number),
      ]),
    );
  });
});
