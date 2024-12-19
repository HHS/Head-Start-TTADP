import { REPORT_STATUSES } from '@ttahub/common';
import { faker } from '@faker-js/faker';
import { sequelize } from 'sequelize';
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
    await ActivityReportGoal.create({
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
  });

  afterAll(async () => {
    // Rollback to the snapshot.
    await rollbackToSnapshot(snapShot);

    // Close sequelize connection.
    await db.sequelize.close();
  });

  it('create aro citation', async () => {
    const activityReportObjectiveCitation1 = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: activityReportObjective.id,
      citation: 'Sample Citation 1',
      monitoringReferences: [{
        grantId: grant.id, findingId: 1, reviewName: 'Review Name 1', grantNumber: grant.number,
      }],
    }, { individualHooks: true });

    const activityReportObjectiveCitation2 = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: activityReportObjective.id,
      citation: 'Sample Citation 2',
      monitoringReferences: [{
        grantId: grant.id, findingId: 2, reviewName: 'Review Name 2', grantNumber: grant.number,
      }],
    }, { individualHooks: true });

    const activityReportObjectiveCitation3 = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: activityReportObjective.id,
      citation: 'Sample Citation 3',
      monitoringReferences: [],
    }, { individualHooks: true });

    // Assert citations.
    let activityReportObjectiveCitationLookUp = await ActivityReportObjectiveCitation.findAll({
      where: {
        id: [activityReportObjectiveCitation1.id, activityReportObjectiveCitation2.id],
      },
    });
    expect(activityReportObjectiveCitationLookUp.length).toBe(2);

    // Assert citation values regardless of order.
    activityReportObjectiveCitationLookUp = activityReportObjectiveCitationLookUp.map(
      (c) => c.get({ plain: true }),
    );

    // Citation 1.
    const citation1LookUp = activityReportObjectiveCitationLookUp.find((c) => c.citation === 'Sample Citation 1');
    expect(citation1LookUp).toBeDefined();
    expect(citation1LookUp.activityReportObjectiveId).toBe(activityReportObjective.id);
    const [reference] = citation1LookUp.monitoringReferences;
    expect(reference.grantId).toBe(grant.id);
    expect(reference.findingId).toBe(1);
    expect(reference.reviewName).toBe('Review Name 1');

    // test virtual column lookups and cases
    expect(citation1LookUp.findingIds).toStrictEqual([1]);
    expect(citation1LookUp.grantNumber).toBe(grant.number);
    expect(citation1LookUp.reviewNames).toStrictEqual(['Review Name 1']);

    // Citation 2.
    const citation2LookUp = activityReportObjectiveCitationLookUp.find((c) => c.citation === 'Sample Citation 2');
    expect(citation2LookUp).toBeDefined();
    expect(citation2LookUp.activityReportObjectiveId).toBe(activityReportObjective.id);
    const [secondReference] = citation2LookUp.monitoringReferences;
    expect(secondReference.grantId).toBe(grant.id);
    expect(secondReference.findingId).toBe(2);
    expect(secondReference.reviewName).toBe('Review Name 2');

    // citation 3 should have empty monitoring references
    const citationThree = await ActivityReportObjectiveCitation.findByPk(
      activityReportObjectiveCitation3.id,
    );

    expect(citationThree.findingIds).toStrictEqual([]);
    expect(citationThree.grantNumber).toBeNull();
    expect(citationThree.reviewNames).toStrictEqual([]);
  });
});
