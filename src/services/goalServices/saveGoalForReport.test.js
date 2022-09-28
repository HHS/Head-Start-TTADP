import faker from '@faker-js/faker';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveRole,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  User,
  Topic,
  ObjectiveTopic,
  ObjectiveResource,
  Role,
  ObjectiveRole,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';
import { saveGoalsForReport } from '../goals';
import { activityReportAndRecipientsById, createOrUpdate } from '../activityReports';

const mockUser = {
  id: 54253461,
  homeRegionId: 1,
  name: 'user5426861',
  hsesUsername: 'user5426861',
  hsesUserId: '5426861',
};

describe('saveGoalsForReport (more tests)', () => {
  let activityReportForNewGoal;
  let multiRecipientReport;
  let reportWeArentWorryingAbout;
  let grantOne;
  let grantTwo;
  let activityReports = [];
  let recipients = [];
  let grants = [];
  let goal;
  let existingGoal;
  let objective;
  let existingObjective;
  let topic;
  let secondTopic;
  let role;

  beforeAll(async () => {
    await User.create(mockUser);
    const recipientOne = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const recipientTwo = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    recipients = [recipientOne, recipientTwo];

    grantOne = await Grant.create(
      {
        id: recipientOne.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientOne.id,
      },
    );
    grantTwo = await Grant.create(
      {
        id: recipientTwo.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientTwo.id,
      },
    );

    grants = [grantOne, grantTwo];

    // Activity report for adding a new goal
    activityReportForNewGoal = await createOrUpdate({
      owner: { userId: mockUser.id },
      approval: {
        submissionStatus: REPORT_STATUSES.DRAFT,
      },
      regionId: 1,
      activityRecipientType: 'recipient',
      activityRecipients: [{ grantId: grantOne.id }],
    });

    // Activity report for multiple recipients
    multiRecipientReport = await createOrUpdate({
      owner: { userId: mockUser.id },
      approval: {
        submissionStatus: REPORT_STATUSES.DRAFT,
      },
      regionId: 1,
      activityRecipientType: 'recipient',
      activityRecipients: [{ grantId: grantOne.id }, { grantId: grantTwo.id }],
    });

    reportWeArentWorryingAbout = await createOrUpdate({
      owner: { userId: mockUser.id },
      approval: {
        submissionStatus: REPORT_STATUSES.DRAFT,
      },
      regionId: 1,
      activityRecipientType: 'recipient',
      activityRecipients: [{ grantId: grantOne.id }],
    });

    activityReports = [
      activityReportForNewGoal,
      multiRecipientReport,
      reportWeArentWorryingAbout,
    ];

    goal = await Goal.create({
      name: 'This is an existing goal',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    // this represents a goal created on the RTR
    existingGoal = await Goal.create({
      name: 'This is a second existing goal',
      status: 'Not Started',
      grantId: grantOne.id,
      previousStatus: null,
    });

    await ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportWeArentWorryingAbout.id,
      status: goal.status,
    });

    topic = await Topic.create({
      name: 'Time travel and related activities',
    });

    secondTopic = await Topic.create({
      name: 'Assorted fruits',
    });

    objective = await Objective.create({
      goalId: goal.id,
      status: 'In Progress',
      title: 'This is an existing objective',
    });

    // this represents an objective created on the RTR
    existingObjective = await Objective.create({
      goalId: existingGoal.id,
      status: 'Not Started',
      title: 'This is a second existing objective',
    });

    await ObjectiveTopic.create({
      objectiveId: existingObjective.id,
      topicId: topic.id,
    });

    role = await Role.findOne();

    await ObjectiveRole.create({
      objectiveId: existingObjective.id,
      roleId: role.id,
    });

    await ObjectiveResource.create({
      objectiveId: existingObjective.id,
      userProvidedUrl: 'http://www.finally-a-url.com',
    });

    await ActivityReportObjective.create({
      ttaProvided: 'Some delightful TTA',
      activityReportId: reportWeArentWorryingAbout.id,
      objectiveId: objective.id,
      status: objective.status,
    });
  });

  afterAll(async () => {
    const reportIds = activityReports.map((report) => report.id);

    const arObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportIds,
      },
    });

    const objectiveIds = arObjectives.map((aro) => aro.objectiveId);

    await ActivityReportObjective.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });

    await ObjectiveResource.destroy({
      where: { objectiveId: objectiveIds },
      individualHooks: true,
    });

    await ObjectiveTopic.destroy({
      where: { objectiveId: objectiveIds },
      individualHooks: true,
    });

    await ObjectiveRole.destroy({
      where: { objectiveId: objectiveIds },
      individualHooks: true,
    });

    await Objective.destroy({
      where: { id: objectiveIds },
      individualHooks: true,
    });

    await Topic.destroy({
      where: { id: [topic.id, secondTopic.id] },
      individualHooks: true,
    });

    await ActivityReportGoal.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });

    const goalsToDestroy = await Goal.findAll({
      where: {
        grantId: [grantOne.id, grantTwo.id],
      },
    });

    const goalIdsToDestroy = goalsToDestroy.map((g) => g.id);

    await Objective.destroy({
      where: { goalId: goalIdsToDestroy },
      individualHooks: true,
    });

    await Goal.destroy({
      where: { id: goalIdsToDestroy },
      individualHooks: true,
    });

    await ActivityRecipient.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });

    await ActivityReport.destroy({
      where: { id: reportIds },
      individualHooks: true,
    });

    await Promise.all(
      grants.map(async (g) => Grant.destroy({ where: { id: g.id }, individualHooks: true })),
    );

    await Promise.all(
      recipients.map(async (r) => Recipient.destroy({
        where: { id: r.id },
        individualHooks: true,
      })),
    );

    await User.destroy({ where: { id: [mockUser.id] }, individualHooks: true });

    await db.sequelize.close();
  });

  it('adds a new goal', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(0);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);

    const goalName = 'This is a brand new goal';
    const beforeGoalId = '8768fdd6-99e1-4d21-adb4-032f3413e60e';

    const newObjective = {
      title: 'This is a brand new objective',
      ttaProvided: '<p>Test objective TTA</p>\n',
      status: 'Not Started',
      id: '02f1ec1d-4163-4a9a-9b32-adddf336f990',
      isNew: true,
      topics: [],
      resources: [],
      roles: [],
      files: [],
    };

    const newGoals = [
      {
        id: beforeGoalId,
        isNew: true,
        name: goalName,
        objectives: [newObjective],
        grantIds: [grantOne.id],
        status: 'Not Started',
      }];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).not.toBe(beforeGoalId);

    const savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(goalName);
    expect(savedGoal.grantId).toBe(grantOne.id);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(1);

    const [afterObjective] = afterObjectives;

    expect(afterObjective.ttaProvided).toBe(newObjective.ttaProvided);

    const savedObjective = await Objective.findByPk(afterObjective.objectiveId);
    expect(savedObjective.title).toBe(newObjective.title);
    expect(savedObjective.status).toBe(newObjective.status);
  });

  it('removes unused objectives', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(1);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);

    const goalName = 'This is a brand new goal';
    const [beforeGoal] = beforeGoals;

    const newGoals = [
      {
        goalIds: [beforeGoal.goalId],
        name: goalName,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).toBe(beforeGoal.goalId);

    const savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(goalName);
    expect(savedGoal.grantId).toBe(grantOne.id);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(0);
  });

  it('adds multi recipient goals', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(beforeGoals.length).toBe(0);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(multiRecipientReport.id);

    const goalName = 'This is a brand new goal for a multi recipient report';
    const beforeGoalId = '8768fdd6-99e1-4d21-adb4-032f3413e60e';

    const newObjective = {
      title: 'This is a brand new objective for a multi recipient report',
      ttaProvided: '<p>Test objective TTA</p>\n',
      status: 'Not Started',
      id: '02f1ec1d-4163-4a9a-9b32-adddf336f990',
      isNew: true,
      topics: [],
      resources: [],
      roles: [],
      files: [],
    };

    const newGoals = [
      {
        id: beforeGoalId,
        isNew: true,
        name: goalName,
        objectives: [newObjective],
        grantIds: [grantOne.id, grantTwo.id],
        status: 'Not Started',
      }];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(afterGoals.length).toBe(2);

    const [goalId, secondGoalId] = afterGoals.map((ag) => ag.goalId);

    const savedGoal = await Goal.findByPk(goalId);
    expect(savedGoal.name).toBe(goalName);

    const secondSavedGoal = await Goal.findByPk(secondGoalId);
    expect(secondSavedGoal.name).toBe(goalName);

    expect([savedGoal.grantId, secondSavedGoal.grantId]).toContain(grantOne.id);
    expect([savedGoal.grantId, secondSavedGoal.grantId]).toContain(grantTwo.id);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    expect(afterObjectives.length).toBe(2);

    const [afterObjective, afterObjectiveTwo] = afterObjectives;

    expect(afterObjective.ttaProvided).toBe(newObjective.ttaProvided);

    const savedObjective = await Objective.findByPk(afterObjective.objectiveId);
    expect(savedObjective.title).toBe(newObjective.title);
    expect(savedObjective.status).toBe(newObjective.status);

    expect(afterObjectiveTwo.ttaProvided).toBe(newObjective.ttaProvided);

    const savedObjectiveTwo = await Objective.findByPk(afterObjectiveTwo.objectiveId);
    expect(savedObjectiveTwo.title).toBe(newObjective.title);
    expect(savedObjectiveTwo.status).toBe(newObjective.status);

    expect([savedObjectiveTwo.goalId, savedObjective.goalId]).toContain(goalId);
    expect([savedObjectiveTwo.goalId, savedObjective.goalId]).toContain(secondGoalId);
  });

  it('edits existing goals', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const [beforeGoal] = beforeGoals;
    const alreadyExtantGoal = await Goal.findByPk(beforeGoal.goalId);
    const otherExistingGoal = await Goal.findByPk(goal.id);

    const newGoals = [
      {
        goalIds: [alreadyExtantGoal.id],
        id: alreadyExtantGoal.id,
        name: alreadyExtantGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
        isNew: false,
      },
      {
        goalIds: [otherExistingGoal.id],
        id: otherExistingGoal.id,
        name: otherExistingGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Closed',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(0);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(2);

    const goalIds = afterGoals.map((ag) => ag.goalId);

    expect(goalIds).toContain(alreadyExtantGoal.id);
    expect(goalIds).toContain(otherExistingGoal.id);

    const updatedGoal = await Goal.findByPk(otherExistingGoal.id);
    expect(updatedGoal.status).toBe('Closed');
  });

  it('removes unused goals', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(2);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const [beforeGoal] = beforeGoals;
    const alreadyExtantGoal = await Goal.findByPk(beforeGoal.goalId);

    const newGoals = [
      {
        goalIds: [alreadyExtantGoal.id],
        id: alreadyExtantGoal.id,
        name: alreadyExtantGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(0);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const goalIds = afterGoals.map((ag) => ag.goalId);
    expect(goalIds).toContain(alreadyExtantGoal.id);
  });

  it('adds a goal & objective from the RTR', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const [beforeGoal] = beforeGoals;
    const alreadyExtantGoal = await Goal.findByPk(beforeGoal.goalId);

    const rtrGoal = await Goal.findByPk(existingGoal.id);
    const rtrObjective = await Objective.findByPk(existingObjective.id);

    const newGoals = [
      {
        goalIds: [alreadyExtantGoal.id],
        id: alreadyExtantGoal.id,
        name: alreadyExtantGoal.name,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
      {
        goalIds: [rtrGoal.id],
        id: rtrGoal.id,
        name: rtrGoal.name,
        objectives: [{
          id: rtrObjective.id,
          isNew: false,
          ttaProvided: 'This is some TTA for this guy',
          title: rtrObjective.title,
          status: 'In Progress',
          goalId: rtrGoal.id,
          files: [],
          topics: [
            {
              label: topic.name,
              value: topic.id,
            },
            {
              label: secondTopic.name,
              value: secondTopic.id,
            },
          ],
          roles: [
            role.fullName,
          ],
          resources: [
            {
              key: 'gibberish-i-THINK-thats-obvious',
              value: 'https://www.google.com', // a fine resource
            },
          ],
        }],
        grantIds: [grantOne.id],
        status: 'In Progress',
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    // check that both our goals are in the right place
    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(2);

    const goalIds = afterGoals.map((ag) => ag.goalId);
    expect(goalIds).toContain(rtrGoal.id);
    expect(goalIds).toContain(alreadyExtantGoal.id);

    // now we dig into the objectives
    const afterActivityReportObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterActivityReportObjectives.length).toBe(1);
    expect(afterActivityReportObjectives[0].objectiveId).toBe(rtrObjective.id);

    const afterObjectiveTopics = await ObjectiveTopic.findAll({
      where: {
        objectiveId: rtrObjective.id,
      },
    });

    // check that our topics are both associated with the objective
    expect(afterObjectiveTopics.length).toBe(2);
    const afterObjectiveTopicIds = afterObjectiveTopics.map((at) => at.topicId);
    expect(afterObjectiveTopicIds).toContain(topic.id);
    expect(afterObjectiveTopicIds).toContain(secondTopic.id);

    // and that both are associated with the activity report
    const afterActivityReportObjectiveTopics = await ActivityReportObjectiveTopic.findAll({
      where: {
        activityReportObjectiveId: afterActivityReportObjectives[0].id,
      },
    });

    expect(afterActivityReportObjectiveTopics.length).toBe(2);
    const afterActivityReportObjectiveTopicIds = afterActivityReportObjectiveTopics.map(
      (at) => at.topicId,
    );
    expect(afterActivityReportObjectiveTopicIds).toContain(topic.id);
    expect(afterActivityReportObjectiveTopicIds).toContain(secondTopic.id);

    // check that our resources are saved properly to the objective
    const afterObjectiveResources = await ObjectiveResource.findAll({
      where: {
        objectiveId: rtrObjective.id,
      },
    });

    expect(afterObjectiveResources.length).toBe(2);
    const userProvidedUrls = afterObjectiveResources.map((ar) => ar.userProvidedUrl);
    expect(userProvidedUrls).toContain('https://www.google.com');
    expect(userProvidedUrls).toContain('http://www.finally-a-url.com');

    const afterActivityReportObjectiveResources = await ActivityReportObjectiveResource.findAll({
      where: {
        activityReportObjectiveId: afterActivityReportObjectives[0].id,
      },
    });

    expect(afterActivityReportObjectiveResources.length).toBe(1);
    expect(afterActivityReportObjectiveResources[0].userProvidedUrl).toBe('https://www.google.com');

    // check that our roles are saved properly to the objective
    const afterObjectiveRoles = await ObjectiveRole.findAll({
      where: {
        objectiveId: rtrObjective.id,
      },
    });

    expect(afterObjectiveRoles.length).toBe(1);
    expect(afterObjectiveRoles[0].roleId).toBe(role.id);

    // check that our roles are saved properly to the activity report
    const afterActivityReportObjectiveRoles = await ActivityReportObjectiveRole.findAll({
      where: {
        activityReportObjectiveId: afterActivityReportObjectives[0].id,
      },
    });

    expect(afterActivityReportObjectiveRoles.length).toBe(1);
    expect(afterActivityReportObjectiveRoles[0].roleId).toBe(role.id);
  });
});
