/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import { createOrUpdateGoalsForActivityReport } from './goals';
import { saveObjectivesForReport, getObjectivesByReportId } from './objectives';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  User,
  OtherEntity,
  ActivityRecipient,
} from '../models';

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user1134265161',
  hsesUsername: 'user1134265161',
  hsesUserId: 'user1134265161',
};

const report = {
  regionId: 1,
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  objectivesWithoutGoals: [],
  goals: [],
};

describe('createOrUpdateGoalsForActivityReport', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  let activityReport;
  let otherEntityReport;
  let user;
  let recipient;
  let otherEntity;

  let grants = [
    {
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
    },
    {
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
    },
  ];

  let goalIds;
  let oeObjectiveIds;

  beforeAll(async () => {
    user = await User.create(mockUser);

    recipient = await Recipient.create({ name: 'recipient', id: faker.datatype.number(), uei: faker.datatype.string(12) });

    otherEntity = await OtherEntity.create({ name: 'Create or Update OE Objectives Entity' });

    grants = await Promise.all(
      grants.map((g) => Grant.create({ ...g, recipientId: recipient.id })),
    );

    // Recipient Report.
    activityReport = await ActivityReport.create(
      {
        ...report,
        userId: user.id,
        lastUpdatedById: user.id,
        activityRecipients: { activityRecipientId: recipient.id },
      },
    );

    // Other Entity Report.
    otherEntityReport = await ActivityReport.create(
      {
        ...report,
        activityRecipientType: 'other-entity',
        userId: user.id,
        lastUpdatedById: user.id,
        activityRecipients: [],
      },
    );

    await ActivityRecipient.create({
      activityReportId: otherEntityReport.id,
      otherEntityId: otherEntity.id,
    });
  });

  afterAll(async () => {
    // Delete ARO.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: activityReport.id,
      },
    });

    // Delete ARG.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: activityReport.id,
      },
    });

    // Delete Recipient AR.
    await ActivityReport.destroy({ where: { id: activityReport.id } });

    // Delete OE ARO.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: otherEntityReport.id,
      },
    });

    // Delete OE Obj's.
    await Objective.destroy({ where: { id: oeObjectiveIds } });

    // Delete OE Recipient.
    await ActivityRecipient.destroy({
      where: {
        activityReportId: otherEntityReport.id,
      },
    });

    // Delete OE AR.
    await ActivityReport.destroy({ where: { id: otherEntityReport.id } });

    // Delete Recipient Obj's
    await Objective.destroy({ where: { goalId: goalIds } });

    // Delete Goal.
    await Goal.destroy({
      where: {
        id: goalIds,
      },
    });

    // Delete Grant.
    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
    });

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    // Delete OE.
    await OtherEntity.destroy({
      where: {
        id: otherEntity.id,
      },
    });

    // Delete User.
    await User.destroy({
      where: {
        id: user.id,
      },
    });

    // Close Conn.
    await db.sequelize.close();
  });

  it('creates other entity new objectives and updates existing ones', async () => {
    const objectivesToCreate = [
      {
        title: 'Test create OE objective - Obj 1',
        status: 'Not Started',
        recipientIds: [otherEntity.dataValues.id],
        ttaProvided: '<p>Test create OE objective - Obj 1 tta</p>',
        topics: [],
        resources: [],
        files: [],
        isNew: true,
      },
      {
        title: 'Test create OE objective - Obj 2',
        status: 'In Progress',
        recipientIds: [otherEntity.dataValues.id],
        ttaProvided: '<p>Test create OE objective - Obj 2 tta</p>',
        topics: [],
        resources: [],
        files: [],
        isNew: true,
      },
      {
        title: 'Test create OE objective - Obj 3',
        status: 'Complete',
        recipientIds: [otherEntity.dataValues.id],
        ttaProvided: '<p>Test create OE objective - Obj 3 tta</p>',
        topics: [],
        resources: [],
        files: [],
        isNew: true,
      },
    ];

    await saveObjectivesForReport(
      objectivesToCreate,
      otherEntityReport,
    );

    const createdObjectives = await getObjectivesByReportId(otherEntityReport.id);
    const createdObjectiveIds = createdObjectives.map((o) => o.id);

    // Objectives (sorted by order).
    expect(createdObjectives.length).toBe(3);

    expect(createdObjectives[0].id).not.toBeNull();
    expect(createdObjectives[0].title).toBe('Test create OE objective - Obj 1');
    expect(createdObjectives[0].ttaProvided).toBe('<p>Test create OE objective - Obj 1 tta</p>');
    expect(createdObjectives[0].status).toBe('Not Started');
    expect(createdObjectives[0].otherEntityId).toBe(otherEntity.id);
    expect(createdObjectives[0].arOrder).toBe(1);

    expect(createdObjectives[1].id).not.toBeNull();
    expect(createdObjectives[1].title).toBe('Test create OE objective - Obj 2');
    expect(createdObjectives[1].ttaProvided).toBe('<p>Test create OE objective - Obj 2 tta</p>');
    expect(createdObjectives[1].status).toBe('In Progress');
    expect(createdObjectives[1].otherEntityId).toBe(otherEntity.id);
    expect(createdObjectives[1].arOrder).toBe(2);

    expect(createdObjectives[2].id).not.toBeNull();
    expect(createdObjectives[2].title).toBe('Test create OE objective - Obj 3');
    expect(createdObjectives[2].ttaProvided).toBe('<p>Test create OE objective - Obj 3 tta</p>');
    expect(createdObjectives[2].status).toBe('Complete');
    expect(createdObjectives[2].otherEntityId).toBe(otherEntity.id);
    expect(createdObjectives[2].arOrder).toBe(3);

    // Remove an Objective.
    createdObjectives.splice(1, 1);

    // Update Title and TTA Provided.
    let updatedObjectives = createdObjectives.map((o, index) => ({
      ...o,
      recipientIds: [otherEntity.dataValues.id],
      title: `My new obj ${index + 1}`,
      ttaProvided: `<p>My new tta ${index + 1}</p>`,
    }));

    await saveObjectivesForReport(
      updatedObjectives,
      otherEntityReport,
    );
    updatedObjectives = await getObjectivesByReportId(otherEntityReport.id);

    // Create combined list of Objectives to clean up.
    oeObjectiveIds = [
      ...new Set([...createdObjectiveIds,
        ...updatedObjectives.map((o) => o.id)]),
    ];

    // Updated Objective.
    expect(createdObjectives.length).toBe(2);

    expect(updatedObjectives[0].id).not.toBeNull();
    expect(updatedObjectives[0].title).toBe('My new obj 1');
    expect(updatedObjectives[0].ttaProvided).toBe('<p>My new tta 1</p>');
    expect(updatedObjectives[0].status).toBe('Not Started');
    expect(updatedObjectives[0].otherEntityId).toBe(otherEntity.id);
    expect(updatedObjectives[0].arOrder).toBe(1);

    expect(updatedObjectives[1].id).not.toBeNull();
    expect(updatedObjectives[1].title).toBe('My new obj 2');
    expect(updatedObjectives[1].ttaProvided).toBe('<p>My new tta 2</p>');
    expect(updatedObjectives[1].status).toBe('Complete');
    expect(updatedObjectives[1].otherEntityId).toBe(otherEntity.id);
    expect(updatedObjectives[1].arOrder).toBe(2);
  });

  it('creates recipient new goals and updates existing ones', async () => {
    const goalsToCreate = [{
      endDate: '11/22/2022',
      goalIds: [],
      goalNumber: '',
      grantIds: grants.map((g) => g.id),
      id: 'new',
      isNew: true,
      isRttapa: 'Yes',
      label: 'Create new goal',
      name: 'Test create goal for activity reports',
      number: false,
      oldGrantIds: [],
      onApprovedAR: false,
      regionId: 1,
      status: 'Draft',
      objectives: [
        {
          title: 'Test create goal for activity reports - Obj 1',
          status: 'Not Started',
          ttaProvided: '<p>Test create goal for activity reports - Obj 1 tta</p>',
          topics: [],
          resources: [],
          files: [],
        },
        {
          title: 'Test create goal for activity reports - Obj 2',
          status: 'In Progress',
          ttaProvided: '<p>Test create goal for activity reports - Obj 2 tta</p>',
          topics: [],
          resources: [],
          files: [],
        },
        {
          title: 'Test create goal for activity reports - Obj 3',
          status: 'Complete',
          ttaProvided: '<p>Test create goal for activity reports - Obj 3 tta</p>',
          topics: [],
          resources: [],
          files: [],
        },
      ],
    }];
    let createdGoals = await createOrUpdateGoalsForActivityReport(
      goalsToCreate,
      activityReport.id,
    );

    goalIds = createdGoals[0].goalIds;

    // Goal.
    expect(createdGoals.length).toBe(1);
    expect(createdGoals[0].id).not.toBeNull();
    expect(createdGoals[0].name).toBe('Test create goal for activity reports');
    expect(createdGoals[0].grantIds.sort()).toStrictEqual(grants.map((g) => g.id).sort());
    expect(createdGoals[0].objectives.length).toBe(3);

    // Objectives (sorted by order).
    expect(createdGoals[0].objectives[0].id).not.toBeNull();
    expect(createdGoals[0].objectives[0].title).toBe('Test create goal for activity reports - Obj 1');
    expect(createdGoals[0].objectives[0].ttaProvided).toBe('<p>Test create goal for activity reports - Obj 1 tta</p>');
    expect(createdGoals[0].objectives[0].status).toBe('Not Started');
    expect(createdGoals[0].objectives[0].arOrder).toBe(1);

    expect(createdGoals[0].objectives[1].id).not.toBeNull();
    expect(createdGoals[0].objectives[1].title).toBe('Test create goal for activity reports - Obj 2');
    expect(createdGoals[0].objectives[1].ttaProvided).toBe('<p>Test create goal for activity reports - Obj 2 tta</p>');
    expect(createdGoals[0].objectives[1].status).toBe('In Progress');
    expect(createdGoals[0].objectives[1].arOrder).toBe(2);

    expect(createdGoals[0].objectives[2].id).not.toBeNull();
    expect(createdGoals[0].objectives[2].title).toBe('Test create goal for activity reports - Obj 3');
    expect(createdGoals[0].objectives[2].ttaProvided).toBe('<p>Test create goal for activity reports - Obj 3 tta</p>');
    expect(createdGoals[0].objectives[2].status).toBe('Complete');
    expect(createdGoals[0].objectives[2].arOrder).toBe(3);

    // Remove an Objective.
    createdGoals[0].objectives.splice(1, 1);

    // Update TTA Provided.
    const updatedGoal = [
      {
        ...createdGoals[0],
        objectives: createdGoals[0].objectives.map((o, index) => ({ ...o, title: `My new obj ${index + 1}`, ttaProvided: `<p>My new tta ${index + 1}</p>` })),
      }];

    createdGoals = await createOrUpdateGoalsForActivityReport(
      updatedGoal,
      activityReport.id,
    );

    // Updated Goal.
    expect(createdGoals[0].id).not.toBeNull();
    expect(createdGoals[0].name).toBe('Test create goal for activity reports');
    expect(createdGoals[0].grantIds.sort()).toStrictEqual(grants.map((g) => g.id).sort());
    expect(createdGoals[0].objectives.length).toBe(2);

    expect(createdGoals[0].objectives[0].id).not.toBeNull();
    expect(createdGoals[0].objectives[0].title).toBe('My new obj 1');
    expect(createdGoals[0].objectives[0].ttaProvided).toBe('<p>My new tta 1</p>');
    expect(createdGoals[0].objectives[0].status).toBe('Not Started');
    expect(createdGoals[0].objectives[0].arOrder).toBe(1);

    expect(createdGoals[0].objectives[1].id).not.toBeNull();
    expect(createdGoals[0].objectives[1].title).toBe('My new obj 2');
    expect(createdGoals[0].objectives[1].ttaProvided).toBe('<p>My new tta 2</p>');
    expect(createdGoals[0].objectives[1].status).toBe('Complete');
    expect(createdGoals[0].objectives[1].arOrder).toBe(2);
  });
});
