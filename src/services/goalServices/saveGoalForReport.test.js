import faker from '@faker-js/faker';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReportObjectiveResource,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  User,
  Topic,
  ObjectiveTopic,
  ObjectiveResource,
  Resource,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';
import { saveGoalsForReport } from '../goals';
import { activityReportAndRecipientsById } from '../activityReports';
import { processObjectiveForResourcesById } from '../resource';

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
  let reportForReusedObjectiveText;
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
  let rtrObjectiveNotOnReport;

  // Adding a recipient.
  let addingRecipientReport;
  let addingRecipientGrantOne;
  let addingRecipientGrantTwo;
  let addingRecipientGoal;
  let addingRecipientObjective;
  let objective2;

  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
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

    const addingRecipientOne = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const addingRecipientTwo = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    recipients = [recipientOne, recipientTwo, addingRecipientOne, addingRecipientTwo];

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

    addingRecipientGrantOne = await Grant.create(
      {
        id: addingRecipientOne.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: addingRecipientOne.id,
      },
    );
    addingRecipientGrantTwo = await Grant.create(
      {
        id: addingRecipientTwo.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: addingRecipientTwo.id,
      },
    );

    grants = [grantOne, grantTwo, addingRecipientGrantOne, addingRecipientGrantTwo];

    // Activity report for adding a new goal
    activityReportForNewGoal = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
    });

    // Activity report for multiple recipients
    multiRecipientReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
    });

    // Activity report for adding a new recipient.
    addingRecipientReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
    });

    // report for reused objective text
    reportForReusedObjectiveText = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: 1,
      activityRecipientType: 'recipient',
    });

    reportWeArentWorryingAbout = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
    });

    activityReports = [
      activityReportForNewGoal,
      multiRecipientReport,
      reportWeArentWorryingAbout,
      addingRecipientReport,
      reportForReusedObjectiveText,
    ];

    await ActivityRecipient.create({
      activityReportId: activityReportForNewGoal.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: reportForReusedObjectiveText.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: multiRecipientReport.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: multiRecipientReport.id,
      grantId: grantTwo.id,
    });

    await ActivityRecipient.create({
      activityReportId: reportWeArentWorryingAbout.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: addingRecipientReport.id,
      grantId: addingRecipientGrantOne.id,
    });

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

    // This is a initial goal for adding recipient report.
    addingRecipientGoal = await Goal.create({
      name: 'This is a goal on a saved report',
      status: 'Not Started',
      grantId: addingRecipientGrantOne.id,
      previousStatus: null,
    });

    await ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportWeArentWorryingAbout.id,
      status: goal.status,
    });

    await ActivityReportGoal.create({
      goalId: addingRecipientGoal.id,
      activityReportId: addingRecipientReport.id,
      status: addingRecipientGoal.status,
    });

    topic = await Topic.create({
      name: 'Time travel and related activities',
    });

    secondTopic = await Topic.create({
      name: 'Assorted fruits',
    });

    await ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportForReusedObjectiveText.id,
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

    // Objective for report adding recipient.
    addingRecipientObjective = await Objective.create({
      goalId: addingRecipientGoal.id,
      status: 'In Progress',
      title: 'Objective for adding recipient',
    });

    await ObjectiveTopic.create({
      objectiveId: existingObjective.id,
      topicId: topic.id,
    });

    await processObjectiveForResourcesById(existingObjective.id, ['http://www.finally-a-url.com']);

    objective2 = await Objective.create({
      goalId: goal.id,
      status: 'In Progress',
      title: 'This is an existing objective 2',
      onApprovedAR: true,
    });

    await ActivityReportObjective.create({
      ttaProvided: 'Some delightful TTA',
      activityReportId: reportWeArentWorryingAbout.id,
      objectiveId: objective.id,
      status: objective.status,
    });

    // Create adding recipient objective values.
    await ObjectiveTopic.create({
      objectiveId: addingRecipientObjective.id,
      topicId: topic.id,
    });

    await processObjectiveForResourcesById(addingRecipientObjective.id, ['http://www.testgov.com']);

    await ActivityReportObjective.create({
      ttaProvided: 'Adding recipient tta',
      activityReportId: addingRecipientReport.id,
      objectiveId: addingRecipientObjective.id,
      status: addingRecipientObjective.status,
    });
  });

  afterAll(async () => {
    const reportIds = activityReports.map((report) => report.id);

    const arObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportIds,
      },
    });

    const objectiveIds = [
      ...arObjectives.map((aro) => aro.objectiveId),
      rtrObjectiveNotOnReport.id,
    ];

    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIds,
      },
      hookMetadata: { objectiveIds },
      individualHooks: true,
    });

    await ObjectiveResource.destroy({
      where: {
        objectiveId: objectiveIds,
      },
    });

    await ObjectiveTopic.destroy({
      where: {
        objectiveId: objectiveIds,
      },
    });

    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
    });

    await Topic.destroy({
      where: {
        id: [topic.id, secondTopic.id],
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    const goalsToDestroy = await Goal.findAll({
      where: {
        grantId: [
          grantOne.id,
          grantTwo.id,
          addingRecipientGrantOne.id,
          addingRecipientGrantTwo.id],
      },
    });

    const goalIdsToDestroy = goalsToDestroy.map((g) => g.id);

    await Objective.destroy({
      where: {
        goalId: goalIdsToDestroy,
      },
    });

    await Goal.destroy({
      where: {
        id: goalIdsToDestroy,
      },
    });

    await ActivityRecipient.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: reportIds,
      },
    });

    await Promise.all(
      grants.map(async (g) => Grant.destroy({ where: { id: g.id } })),
    );

    await Promise.all(
      recipients.map(async (r) => Recipient.destroy({ where: { id: r.id } })),
    );

    await User.destroy({ where: { id: [mockUser.id] } });

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

    const objectiveIds = beforeObjectives.map((bo) => bo.objectiveId);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);

    const goalName = 'This is a brand new goal';
    const [beforeGoal] = beforeGoals;

    rtrObjectiveNotOnReport = await Objective.create({
      goalId: beforeGoal.goalId,
      status: 'In Progress',
      title: 'gabba gabba hey',
      createdVia: 'rtr',
    });

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

    const remainingObjectives = await Objective.findAll({
      where: {
        id: objectiveIds,
      },
    });

    expect(remainingObjectives.length).toBe(0);
    const unaffectedObjectives = await Objective.findAll({
      where: {
        goalId,
      },
    });

    expect(unaffectedObjectives.length).toBe(1);
    expect(unaffectedObjectives[0].id).toBe(rtrObjectiveNotOnReport.id);
  });

  it('you can safely reuse objective text', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: reportForReusedObjectiveText.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportForReusedObjectiveText.id,
      },
    });

    expect(beforeObjectives.length).toBe(0);

    const [savedReport] = await activityReportAndRecipientsById(reportForReusedObjectiveText.id);

    const [beforeGoal] = beforeGoals;
    const theGoalThatAlreadyExists = await Goal.findByPk(beforeGoal.goalId);

    const objectiveWithReusedText = {
      title: objective2.title,
      isNew: true,
      status: 'In Progress',
      id: '02f1123ec1d-4163-4a9a-9b32-ad123ddf336f990',
      ttaProvided: '<p>Test objective TTA</p>\n',
      goalId: theGoalThatAlreadyExists.id,
    };

    let newGoals = [
      {
        isNew: false,
        name: theGoalThatAlreadyExists.name,
        objectives: [objectiveWithReusedText],
        grantIds: [grantOne.id],
        status: 'Not Started',
        goalIds: [theGoalThatAlreadyExists.id],
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    let afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: reportForReusedObjectiveText.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    let [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).toBe(beforeGoal.goalId);

    let savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(theGoalThatAlreadyExists.name);
    expect(savedGoal.grantId).toBe(grantOne.id);

    let afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportForReusedObjectiveText.id,
      },
    });

    // an objective was added
    expect(afterObjectives.length).toBe(1);

    // it matches an existing objective
    let [afterObjective] = afterObjectives;

    expect(afterObjective.objectiveId).toBe(objective2.id);

    const editingObjectiveWithReusedText = {
      title: `as far as i know, ${objective2.title}`,
      isNew: false,
      status: 'In Progress',
      id: objective2.id,
      ttaProvided: '<p>Test objective TTA updated</p>\n',
      goalId: theGoalThatAlreadyExists.id,
    };

    newGoals = [
      {
        isNew: false,
        name: theGoalThatAlreadyExists.name,
        objectives: [editingObjectiveWithReusedText],
        grantIds: [grantOne.id],
        status: 'Not Started',
        goalIds: [theGoalThatAlreadyExists.id],
      },
    ];

    await saveGoalsForReport(newGoals, savedReport);

    afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: reportForReusedObjectiveText.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).toBe(beforeGoal.goalId);

    savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(theGoalThatAlreadyExists.name);
    expect(savedGoal.grantId).toBe(grantOne.id);

    afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportForReusedObjectiveText.id,
      },
    });

    // an objective was added
    expect(afterObjectives.length).toBe(1);

    // it matches an existing objective
    [afterObjective] = afterObjectives;
    expect(afterObjective.objectiveId).toBe(objective2.id);

    expect(afterObjective.ttaProvided).toBe(editingObjectiveWithReusedText.ttaProvided);

    const savedObjective = await Objective.findByPk(afterObjective.objectiveId);
    expect(savedObjective.title).toBe(objectiveWithReusedText.title);
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
        objectives: [
          {
            isNew: true,
            ttaProvided: 'This is some TTA for this guy',
            title: '',
            status: 'Not Started',
            goalId: rtrGoal.id,
            files: [],
            topics: [],
            resources: [],
          },
          {
            id: rtrObjective.id,
            isNew: false,
            ttaProvided: 'This is some TTA for this guy',
            title: rtrObjective.title,
            status: 'In Progress',
            goalId: rtrGoal.id,
            files: [],
            topics: [
              {
                name: topic.name,
                id: topic.id,
              },
              {
                name: secondTopic.name,
                id: secondTopic.id,
              },
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

    expect(afterActivityReportObjectives.length).toBe(2);
    expect(afterActivityReportObjectives.map((o) => o.objectiveId)).toContain(rtrObjective.id);
    // eslint-disable-next-line max-len
    const existingObjectiveARO = afterActivityReportObjectives.find((o) => o.objectiveId === rtrObjective.id);

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
        activityReportObjectiveId: existingObjectiveARO.id,
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
      includes: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
      }],
    });

    expect(afterObjectiveResources.length).toBe(2);
    const urls = afterObjectiveResources.map((ar) => ar.resources.dataValues.url);
    expect(urls).toContain('https://www.google.com');
    expect(urls).toContain('http://www.finally-a-url.com');

    const afterActivityReportObjectiveResources = await ActivityReportObjectiveResource.findAll({
      where: {
        activityReportObjectiveId: existingObjectiveARO.id,
      },
      includes: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
      }],
    });

    expect(afterActivityReportObjectiveResources.length).toBe(1);
    expect(afterActivityReportObjectiveResources[0].resource.dataValues.url).toBe('https://www.google.com');
  });

  it('adds a new recipient', async () => {
    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: addingRecipientReport.id,
      },
    });

    expect(beforeGoals.length).toBe(1);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: addingRecipientReport.id,
      },
    });

    expect(beforeObjectives.length).toBe(1);

    const [
      savedReport,
      activityRecipients,
      goalsAndObjectives,
    ] = await activityReportAndRecipientsById(
      addingRecipientReport.id,
    );
    expect(activityRecipients.length).toBe(1);

    const {
      goalNumbers, grants: oldGrants, isNew, ...newGoal
    } = goalsAndObjectives[0];

    await saveGoalsForReport([
      {
        ...newGoal,
        grantIds: [addingRecipientGrantOne.id, addingRecipientGrantTwo.id],
      }], savedReport);

    const afterReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: addingRecipientReport.id,
      },
    });

    expect(afterReportGoals.length).toBe(2);

    afterReportGoals.forEach((g) => {
      expect(g.name).toBe(addingRecipientGoal.name);
    });

    const goalIds = afterReportGoals.map((o) => o.goalId);
    const afterGoals = await Goal.findAll({
      where: {
        id: goalIds,
      },
    });

    afterGoals.forEach((g) => {
      expect(g.name).toBe(addingRecipientGoal.name);
    });

    expect(afterGoals.length).toBe(2);

    const afterReportObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: addingRecipientReport.id,
      },
    });
    expect(afterReportObjectives.length).toBe(2);

    afterReportObjectives.forEach((o) => {
      expect(o.title).toBe(addingRecipientObjective.title);
    });

    const objectives = afterReportObjectives.map((o) => o.objectiveId);
    const afterObjectives = await Objective.findAll({
      where: {
        id: objectives,
      },
    });

    expect(afterObjectives.length).toBe(2);

    afterObjectives.forEach((o) => {
      expect(o.title).toBe(addingRecipientObjective.title);
    });
  });
});
