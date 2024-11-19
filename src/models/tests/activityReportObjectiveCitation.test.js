/* eslint-disable max-len */
/* eslint-disable prefer-destructuring */
import { REPORT_STATUSES } from '@ttahub/common';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import db, {
  User,
  Recipient,
  Grant,
  Goal,
  Objective,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  MonitoringReviewGrantee,
  MonitoringReview,
  MonitoringReviewStatus,
  MonitoringFindingHistory,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringStandard,
} from '..';
import { captureSnapshot, rollbackToSnapshot } from '../../lib/programmaticTransaction';

const mockUser = {
  name: 'Tim Test',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65536',
  hsesUsername: 'test50@test50.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'timtest50@test50.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      regionId: 1,
      scopeId: 1,
    },
    {
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};

const mockGrant = {
  regionId: 1,
  status: 'Active',
  startDate: new Date('2023-02-09T15:13:00.000Z'),
  endDate: new Date('2023-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
};

const sampleReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  activityRecipientType: 'test',
  creatorRole: 'COR',
  topics: ['topic'],
  participants: ['test'],
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  ttaType: ['type'],
  regionId: 2,
  targetPopulations: ['target pop'],
  author: {
    fullName: 'Kiwi, GS',
    name: 'Kiwi',
    role: 'Grants Specialist',
    homeRegionId: 1,
  },
  version: 2,
};

describe('activityReportObjectiveCitation', () => {
  let snapShot;
  let user;

  let report;
  let recipient;
  let grant;
  let goal;
  let objective;
  let activityReportObjective;

  // Create Citations.
  let citation1;
  let citation2;
  let citation3;

  // To assign to citations.
  const monitoringReviewId = uuidv4();
  const monitoringFindingId = uuidv4();

  beforeAll(async () => {
    // Create a snapshot of the database.
    snapShot = await captureSnapshot();

    // Create mock user.
    user = await User.create({ ...mockUser });

    // Create recipient.
    recipient = await Recipient.create({
      id: 534935,
      uei: 'NNA5N2KGHGM2',
      name: 'IPD Recipient',
      recipientType: 'IPD Recipient',
    });

    // Create grant.
    const grantNumberToUse = faker.datatype.string(6);
    grant = await Grant.create({
      ...mockGrant,
      id: 472968,
      number: grantNumberToUse,
      recipientId: recipient.id,
      programSpecialistName: user.name,
      programSpecialistEmail: user.email,
    });

    // Create goal.
    goal = await Goal.create(
      {
        name: 'ipd citation goal 1',
        grantId: grant.id,
      },
    );

    // Create objective.
    objective = await Objective.create(
      {
        title: 'IPD citation objective ',
        goalId: goal.id,
        status: 'Not Started',
      },
    );

    // Create activity report.
    report = await ActivityReport.create(sampleReport);

    // Create activity report goal.
    const activityReportGoal = await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal.id,
      isActivelyEdited: false,
    });

    // Create activity report objective.
    activityReportObjective = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: report.id,
      ttaProvided: 'ipd aro Goal',
      status: objective.status,
    });

    // Create monitoring data.
    const monitoringGranteeId = uuidv4();

    await MonitoringReviewGrantee.create({
      id: faker.datatype.number({ min: 9999 }),
      grantNumber: grantNumberToUse,
      reviewId: monitoringReviewId,
      granteeId: monitoringGranteeId,
      createTime: new Date(),
      updateTime: new Date(),
      updateBy: 'Support Team',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    const monitoringStatusId = 1;
    const monitoringContentId = uuidv4();

    await MonitoringReview.create({
      reviewId: monitoringReviewId,
      contentId: monitoringContentId,
      statusId: monitoringStatusId,
      name: faker.random.words(3),
      startDate: new Date(),
      endDate: new Date(),
      reviewType: 'AIAN-DEF',
      reportDeliveryDate: new Date(),
      reportAttachmentId: faker.datatype.uuid(),
      outcome: faker.random.words(5),
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    await MonitoringReviewStatus.create({
      statusId: monitoringStatusId,
      name: 'Complete',
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    await MonitoringFindingHistory.create({
      reviewId: monitoringReviewId,
      findingHistoryId: uuidv4(),
      findingId: monitoringFindingId,
      statusId: monitoringStatusId,
      narrative: faker.random.words(10),
      ordinal: faker.datatype.number({ min: 1, max: 10 }),
      determination: faker.random.words(5),
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    }, { individualHooks: true });

    await MonitoringFinding.create({
      findingId: monitoringFindingId,
      statusId: monitoringStatusId,
      findingType: faker.random.word(),
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
    }, { individualHooks: true });

    await MonitoringFindingGrant.create({
      // 1
      findingId: monitoringFindingId,
      granteeId: monitoringGranteeId,
      statusId: monitoringStatusId,
      findingType: faker.random.word(),
      source: faker.random.word(),
      correctionDeadLine: new Date(),
      reportedDate: new Date(),
      closedDate: null,
      hash: faker.datatype.uuid(),
      sourceCreatedAt: new Date(),
      sourceUpdatedAt: new Date(),
      sourceDeletedAt: null,
    }, { individualHooks: true });

    // These are the actual citations.
    const citations = await MonitoringStandard.bulkCreate([
      {
        standardId: faker.datatype.number({ min: 1 }),
        contentId: monitoringContentId,
        citation: 'citation 1',
        text: 'This is the text for citation 1',
        guidance: faker.lorem.paragraph(),
        citable: faker.datatype.number({ min: 1, max: 10 }),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        standardId: faker.datatype.number({ min: 1 }),
        contentId: monitoringContentId,
        citation: 'citation 2',
        text: 'This is the text for citation 2',
        guidance: faker.lorem.paragraph(),
        citable: faker.datatype.number({ min: 1, max: 10 }),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        standardId: faker.datatype.number({ min: 1 }),
        contentId: monitoringContentId,
        citation: 'citation 3',
        text: 'This is the text for citation 3',
        guidance: faker.lorem.paragraph(),
        citable: faker.datatype.number({ min: 1, max: 10 }),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // populate citations from citations into the citations.
    citation1 = citations[0];
    citation2 = citations[1];
    citation3 = citations[2];
  });

  afterAll(async () => {
    // Rollback to the snapshot.
    await rollbackToSnapshot(snapShot);

    // Close sequelize connection.
    await db.sequelize.close();
  });

  it('aro citation', async () => {
    // Get the monitoring  review object where the citation will be assigned.
    const monitoringReviewForLink = await MonitoringReview.findOne({
      where: {
        reviewId: monitoringReviewId,
      },
    });

    // Get the monitoring finding object where the citation will be assigned.
    const monitoringFindingForLink = await MonitoringFinding.findOne({
      where: {
        findingId: monitoringFindingId,
      },
    });

    // Get the monitoring standard object where the citation will be assigned.
    const monitoringStandardForLink = await MonitoringStandard.findOne({
      where: {
        citation: 'citation 1',
      },
    });

    // Create aro citations.
    const activityReportObjectiveCitation1 = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: activityReportObjective.id,
      reviewId: monitoringReviewForLink.id,
      findingId: monitoringFindingForLink.id,
      citationId: monitoringStandardForLink.id,
    }, { individualHooks: true });

    const activityReportObjectiveCitation2 = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: activityReportObjective.id,
      reviewId: monitoringReviewForLink.id,
      findingId: monitoringFindingForLink.id,
      citationId: citation2.id,
    }, { individualHooks: true });

    // Assert citations.
    let activityReportObjectiveCitationLookUp = await ActivityReportObjectiveCitation.findAll({
      where: {
        id: [activityReportObjectiveCitation1.id, activityReportObjectiveCitation2.id],
      },
    });
    expect(activityReportObjectiveCitationLookUp.length).toBe(2);

    // Assert citation values regardless of order.
    activityReportObjectiveCitationLookUp = activityReportObjectiveCitationLookUp.map((c) => c.get({ plain: true }));

    // Citation 1.
    const citation1LookUp = activityReportObjectiveCitationLookUp.find((c) => c.citationId === citation1.id);
    expect(citation1LookUp).toBeDefined();
    expect(citation1LookUp.reviewId).toBe(monitoringReviewForLink.id);
    expect(citation1LookUp.findingId).toBe(monitoringFindingForLink.id);

    // Citation 2.
    const citation2LookUp = activityReportObjectiveCitationLookUp.find((c) => c.citationId === citation2.id);
    expect(citation2LookUp).toBeDefined();
    expect(citation2LookUp.reviewId).toBe(monitoringReviewForLink.id);
    expect(citation2LookUp.findingId).toBe(monitoringFindingForLink.id);
  });
});
