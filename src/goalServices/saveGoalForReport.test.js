import faker from '@faker-js/faker';
import { GOAL_SOURCES, REPORT_STATUSES, SUPPORT_TYPES } from '@ttahub/common';
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
  Region,
} from '../models';
import { saveGoalsForReport } from './goals';
import { activityReportAndRecipientsById } from '../services/activityReports';
import { processObjectiveForResourcesById } from '../services/resource';

describe('saveGoalsForReport (more tests)', () => {
  const randomId = () => faker.datatype.number({ min: 75000, max: 100000 });

  /**
   *
   * formerly in a before all
   *
   */
  const setupTest = async () => {
    const region = await Region.create({
      name: 'Test Region',
      id: randomId(),
    });

    const mockUser = {
      id: randomId(),
      homeRegionId: region.id,
      name: faker.datatype.string(12),
      hsesUsername: faker.datatype.string(12),
      hsesUserId: faker.datatype.string(12),
      lastLogin: new Date(),
    };

    await User.findOrCreate({ where: mockUser });
    const recipientOne = await Recipient.create(
      {
        id: randomId(),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const recipientTwo = await Recipient.create(
      {
        id: randomId(),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const addingRecipientOne = await Recipient.create(
      {
        id: randomId(),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const addingRecipientTwo = await Recipient.create(
      {
        id: randomId(),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const defaultGoalRecipient = await Recipient.create(
      {
        id: randomId(),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const recipients = [
      recipientOne,
      recipientTwo,
      addingRecipientOne,
      addingRecipientTwo,
      defaultGoalRecipient,
    ];

    const grantOne = await Grant.create(
      {
        id: randomId(),
        number: faker.datatype.string(50),
        recipientId: recipientOne.id,
        startDate: new Date(),
        endDate: new Date(),
        regionId: region.id,
      },
    );
    const grantTwo = await Grant.create(
      {
        id: randomId(),
        number: faker.datatype.string(50),
        recipientId: recipientTwo.id,
        startDate: new Date(),
        endDate: new Date(),
        regionId: region.id,
      },
    );

    const defaultGoalGrant = await Grant.create(
      {
        id: randomId(),
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientTwo.id,
        startDate: new Date(),
        endDate: new Date(),
        regionId: region.id,
      },
    );

    const addingRecipientGrantOne = await Grant.create(
      {
        id: randomId(),
        number: faker.datatype.number({ min: 90000 }),
        recipientId: addingRecipientOne.id,
        startDate: new Date(),
        endDate: new Date(),
        regionId: region.id,
      },
    );
    const addingRecipientGrantTwo = await Grant.create(
      {
        id: randomId(),
        number: faker.datatype.number({ min: 90000 }),
        recipientId: addingRecipientTwo.id,
        startDate: new Date(),
        endDate: new Date(),
        regionId: region.id,
      },
    );

    const grants = [
      grantOne,
      grantTwo,
      addingRecipientGrantOne,
      addingRecipientGrantTwo,
      defaultGoalGrant,
    ];

    // Activity report for adding a new goal
    const activityReportForNewGoal = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: region.id,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
      context: 'activityReportForNewGoal',
      version: 2,
    });

    // Activity report for multiple recipients
    const multiRecipientReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: region.id,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
      context: 'multiRecipientReport',
      version: 2,
    });

    // Activity report for adding a new recipient.
    const addingRecipientReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: region.id,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
      context: 'addingRecipientReport',
      version: 2,
    });

    // report for reused objective text
    const reportForReusedObjectiveText = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: region.id,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
      context: 'reportForReusedObjectiveText',
      version: 2,
    });

    const reportWeArentWorryingAbout = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: region.id,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
      context: 'reportWeArentWorryingAbout',
      version: 2,
    });

    // Activity Report for default goal save.
    const defaultGoalReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: region.id,
      userId: mockUser.id,
      activityRecipientType: 'recipient',
      context: 'Test saving default goal state',
      version: 1,
    });

    const activityReports = [
      activityReportForNewGoal,
      multiRecipientReport,
      reportWeArentWorryingAbout,
      addingRecipientReport,
      reportForReusedObjectiveText,
      defaultGoalReport,
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

    // Default goal recipient.
    await ActivityRecipient.create({
      activityReportId: defaultGoalReport.id,
      grantId: defaultGoalGrant.id,
    });

    const goal = await Goal.create({
      name: 'This is an existing goal',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    // this represents a goal created on the RTR
    const existingGoal = await Goal.create({
      name: 'This is a second existing goal',
      status: 'Not Started',
      grantId: grantOne.id,
      previousStatus: null,
    });

    // This is a initial goal for adding recipient report.
    const addingRecipientGoal = await Goal.create({
      name: 'This is a goal on a saved report',
      status: 'Not Started',
      grantId: addingRecipientGrantOne.id,
      previousStatus: null,
    });

    // Goal to remove only used by one report.
    const goalToBeRemoved = await Goal.create({
      name: 'This goal should be removed',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
      createdVia: 'activityReport',
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

    const topic = await Topic.create({
      name: 'Time travel and related activities',
    });

    const secondTopic = await Topic.create({
      name: 'Assorted fruits',
    });

    await ActivityReportGoal.create({
      goalId: goal.id,
      activityReportId: reportForReusedObjectiveText.id,
    });

    const objective = await Objective.create({
      goalId: goal.id,
      status: 'In Progress',
      title: 'This is an existing objective',
    });

    // this represents an objective created on the RTR
    const existingObjective = await Objective.create({
      goalId: existingGoal.id,
      status: 'Not Started',
      title: 'This is a second existing objective',
    });

    // Objective for report adding recipient.
    const addingRecipientObjective = await Objective.create({
      goalId: addingRecipientGoal.id,
      status: 'In Progress',
      title: 'Objective for adding recipient',
    });

    // Objective for report adding recipient.
    const objectiveToBeRemoved = await Objective.create({
      goalId: goalToBeRemoved.id,
      status: 'In Progress',
      title: 'Objective to be removed with goal',
      createdVia: 'activityReport',
    });

    await ObjectiveTopic.create({
      objectiveId: existingObjective.id,
      topicId: topic.id,
    });

    await processObjectiveForResourcesById(existingObjective.id, ['http://www.finally-a-url.com']);

    const objective2 = await Objective.create({
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

    return {
      mockUser,
      region,
      activityReportForNewGoal,
      multiRecipientReport,
      reportWeArentWorryingAbout,
      reportForReusedObjectiveText,
      grantOne,
      grantTwo,
      activityReports,
      recipients,
      grants,
      goal,
      existingGoal,
      objective,
      existingObjective,
      topic,
      secondTopic,

      // Test removing of Goal and Objective.
      goalToBeRemoved,
      objectiveToBeRemoved,

      // Adding a recipient.
      addingRecipientReport,
      addingRecipientGrantOne,
      addingRecipientGrantTwo,
      addingRecipientGoal,
      addingRecipientObjective,
      objective2,

      // Saving default goal.
      defaultGoalGrant,
      defaultGoalReport,
    };
  };

  /** cleanup function, formerly in after */
  const cleanupTest = async ({
    mockUser,
    region,
    activityReports,
    topic,
    secondTopic,
    rtrObjectiveNotOnReport,
  }) => {
    const reportIds = activityReports.map((report) => report.id);
    const arObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportIds,
      },
    });

    const objectiveIds = arObjectives.map((aro) => aro.objectiveId);

    if (rtrObjectiveNotOnReport) {
      objectiveIds.push(rtrObjectiveNotOnReport.id);
    }

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

    await Objective.unscoped().destroy({
      where: {
        id: objectiveIds,
      },
      force: true,
    });

    await Topic.destroy({
      where: {
        id: [topic.id, secondTopic.id],
      },
      force: true,
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    const grants = await Grant.unscoped().findAll({
      attributes: ['id', 'regionId', 'recipientId'],
      where: {
        regionId: region.id,
      },
    });

    const grantIds = grants.map((g) => g.id);
    const recipientIds = grants.map((g) => g.recipientId);

    const goalsToDestroy = await Goal.unscoped().findAll({
      where: {
        grantId: grantIds,
      },
    });

    const goalIdsToDestroy = goalsToDestroy.map((g) => g.id);

    await Objective.unscoped().destroy({
      where: {
        goalId: goalIdsToDestroy,
      },
      force: true,
    });

    await Goal.unscoped().destroy({
      where: {
        grantId: grantIds,
      },
      force: true,
    });

    await ActivityRecipient.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await ActivityReport.unscoped().destroy({
      where: {
        id: reportIds,
      },
      force: true,
    });

    await Grant.destroy({ where: { regionId: region.id }, force: true, individualHooks: true });
    await Recipient.destroy({ where: { id: recipientIds }, force: true });
    await User.destroy({ where: { id: mockUser.id } });
    await Region.destroy({ where: { id: region.id } });
  };

  let rtrObjectiveNotOnReport;

  const setupForFirstTest = async ({
    activityReportForNewGoal,
    grantOne,
  }) => {
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
    const beforeGoalIdUuid = '8768fdd6-99e1-4d21-adb4-032f3413e60e';

    const newObjective = {
      title: 'This is a brand new objective',
      ttaProvided: '<p>Test objective TTA</p>\n',
      status: 'Not Started',
      id: '02f1ec1d-4163-4a9a-9b32-adddf336f990',
      isNew: true,
      topics: [],
      resources: [],
      files: [],
      supportType: SUPPORT_TYPES[1],
    };

    const newGoals = [
      {
        id: beforeGoalIdUuid,
        isNew: true,
        name: goalName,
        objectives: [newObjective],
        grantIds: [grantOne.id],
        status: 'Not Started',
        source: GOAL_SOURCES[0],
      }];

    await saveGoalsForReport(newGoals, savedReport);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    const [beforeGoalId] = afterGoals.map((ag) => ag.goalId);

    return {
      beforeGoalId,
      goalName,
      newObjective,
      beforeGoalIdUuid,
    };
  };

  const setupForSecondTest = async ({
    activityReportForNewGoal,
    grantOne,
    beforeGoalId,
    goalName,
  }) => {
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

    const newGoals = [{
      id: beforeGoalId,
      isNew: true,
      name: goalName,
      objectives: [newObjective],
      grantIds: [grantOne.id],
      status: 'Not Started',
      source: GOAL_SOURCES[0],
    }];
    const [r] = await activityReportAndRecipientsById(activityReportForNewGoal.id);

    await saveGoalsForReport(newGoals, r);
  };

  const setupForThirdTest = async ({
    grantOne,
    reportForReusedObjectiveText,
    objective2,
  }) => {
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

    const newGoals = [
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

    return {
      beforeGoal,
      theGoalThatAlreadyExists,
      savedReport,
      objectiveWithReusedText,
    };
  };

  afterAll(async () => db.sequelize.close());

  it('adds a new goal', async () => {
    const setup = await setupTest();

    const {
      activityReportForNewGoal,
      grantOne,
    } = setup;

    const {
      beforeGoalIdUuid,
      goalName,
      newObjective,
    } = await setupForFirstTest(setup);

    const afterGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterGoals.length).toBe(1);

    const [goalId] = afterGoals.map((ag) => ag.goalId);

    expect(goalId).not.toBe(beforeGoalIdUuid);

    const savedGoal = await Goal.findByPk(goalId);

    expect(savedGoal.name).toBe(goalName);
    expect(savedGoal.grantId).toBe(grantOne.id);
    expect(savedGoal.source).toStrictEqual(GOAL_SOURCES[0]);

    const afterObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterObjectives.length).toBe(1);

    const [afterObjective] = afterObjectives;
    expect(afterObjective.ttaProvided).toBe(newObjective.ttaProvided);
    expect(afterObjective.supportType).toBe(newObjective.supportType);

    const savedObjective = await Objective.findByPk(afterObjective.objectiveId);
    expect(savedObjective.title).toBe(newObjective.title);
    expect(savedObjective.status).toBe(newObjective.status);

    await cleanupTest(setup);
  });

  it('removes unused objectives', async () => {
    const setup = await setupTest();

    const {
      grantOne,
      activityReportForNewGoal,
    } = setup;

    const {
      goalName,
    } = await setupForFirstTest(setup);

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

    const [beforeGoal] = beforeGoals;

    rtrObjectiveNotOnReport = await Objective.create({
      goalId: beforeGoal.goalId,
      status: 'In Progress',
      title: 'gabba gabba hey',
      createdVia: 'rtr',
    });

    const newGoals2 = [
      {
        goalIds: [beforeGoal.goalId],
        name: goalName,
        objectives: [],
        grantIds: [grantOne.id],
        status: 'Not Started',
      },
    ];

    await saveGoalsForReport(newGoals2, savedReport);

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
    await cleanupTest(setup);
  });

  it('you can safely reuse objective text', async () => {
    const setup = await setupTest();
    const {
      reportForReusedObjectiveText,
      objective2,
      grantOne,
    } = setup;

    const {
      beforeGoal,
      theGoalThatAlreadyExists,
      savedReport,
      objectiveWithReusedText,
    } = await setupForThirdTest(setup);

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

    const newGoals = [
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
    await cleanupTest(setup);
  });

  it('adds multi recipient goals', async () => {
    const setup = await setupTest();
    const {
      multiRecipientReport,
      grantOne,
      grantTwo,
    } = setup;

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
    await cleanupTest(setup);
  });

  it('edits existing goals', async () => {
    const setup = await setupTest();
    const {
      activityReportForNewGoal,
      goal,
      grantOne,
    } = setup;

    const { beforeGoalId } = await setupForFirstTest(setup);
    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const alreadyExtantGoal = await Goal.findByPk(beforeGoalId);
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

    await cleanupTest(setup);
  });

  it('removes unused goals', async () => {
    const setup = await setupTest();

    const {
      activityReportForNewGoal,
      goal,
      objective,
      grantOne,
      goalToBeRemoved,
      objectiveToBeRemoved,
    } = setup;

    await setupForFirstTest(setup);

    // Goal and Objective to remove Id's.
    const goalToRemoveId = goalToBeRemoved.id;
    const objectiveToRemoveId = objectiveToBeRemoved.id;

    // Add ARG to remove.
    await ActivityReportGoal.create({
      goalId: goalToBeRemoved.id,
      activityReportId: activityReportForNewGoal.id,
      status: goal.status,
    });

    // Add ARO to remove.
    await ActivityReportObjective.create({
      ttaProvided: 'TTA to be deleted',
      activityReportId: activityReportForNewGoal.id,
      objectiveId: objectiveToBeRemoved.id,
      status: objective.status,
    });

    // Get ARG's.
    const beforeActivityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });
    expect(beforeActivityReportGoals.length).toBe(2);

    // Goals before.
    const beforeGoals = await Goal.findAll({
      where: {
        id: beforeActivityReportGoals.map((g) => g.goalId),
      },
    });

    expect(beforeGoals.length).toBe(2);

    const beforeObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(beforeObjectives.length).toBe(2);

    const [savedReport] = await activityReportAndRecipientsById(activityReportForNewGoal.id);
    const [beforeGoal] = beforeActivityReportGoals;
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

    const afterActivityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReportForNewGoal.id,
      },
    });

    expect(afterActivityReportGoals.length).toBe(1);

    const activityReportGoalIds = afterActivityReportGoals.map((ag) => ag.goalId);
    expect(activityReportGoalIds).toContain(alreadyExtantGoal.id);

    // Goals after.
    const afterGoals = await Goal.findAll({
      where: {
        id: beforeActivityReportGoals.map((g) => g.goalId),
      },
    });

    expect(afterGoals.length).toBe(1);
    const goalIds = afterGoals.map((ag) => ag.id);
    expect(goalIds).toContain(alreadyExtantGoal.id);

    // Verify goal and objective are deleted.
    const objectiveIsDeleted = await Objective.findByPk(objectiveToRemoveId);
    expect(objectiveIsDeleted).toBeNull();
    const goalIsDeleted = await Goal.findByPk(goalToRemoveId);
    expect(goalIsDeleted).toBeNull();
    // await cleanupTest(setup);
  });

  it('adds a goal & objective from the RTR', async () => {
    const setup = await setupTest();

    const {
      activityReportForNewGoal,
      grantOne,
      existingGoal,
      existingObjective,
      topic,
      secondTopic,
    } = setup;

    await setupForFirstTest(setup);

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
    const [beforeGoal] = beforeGoals;
    const alreadyExtantGoal = await Goal.findByPk(beforeGoal.goalId);

    const rtrGoal = await Goal.findByPk(existingGoal.id);
    const rtrObjective = await Objective.findByPk(existingObjective.id);
    // check that our resource are on the objective
    const beforeObjectiveResources = await ObjectiveResource.findAll({
      where: {
        objectiveId: rtrObjective.id,
      },
      include: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
        required: true,
      }],
    });

    expect(beforeObjectiveResources.length).toBe(1);
    const beforeUrls = beforeObjectiveResources.map((bor) => bor.resource.dataValues.url);
    expect(beforeUrls).toContain('http://www.finally-a-url.com');

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
      include: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
        required: true,
      }],
    });

    expect(afterObjectiveResources.length).toBe(2);
    const urls = afterObjectiveResources.map((ar) => ar.resource.dataValues.url);
    expect(urls).toContain('https://www.google.com');
    expect(urls).toContain('http://www.finally-a-url.com');

    const afterActivityReportObjectiveResources = await ActivityReportObjectiveResource.findAll({
      where: {
        activityReportObjectiveId: existingObjectiveARO.id,
      },
      include: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
      }],
    });

    expect(afterActivityReportObjectiveResources.length).toBe(1);
    expect(afterActivityReportObjectiveResources[0].resource.dataValues.url).toBe('https://www.google.com');
    await cleanupTest(setup);
  });

  it('adds a new recipient', async () => {
    const setup = await setupTest();
    const {
      addingRecipientReport,
      addingRecipientGrantOne,
      addingRecipientGrantTwo,
      addingRecipientGoal,
      addingRecipientObjective,
    } = setup;

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
    await cleanupTest(setup);
  });

  it('saves goal in default state', async () => {
    const setup = await setupTest();
    const {
      defaultGoalGrant,
      defaultGoalReport,
    } = setup;

    const beforeGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: defaultGoalReport.id,
      },
    });

    expect(beforeGoals.length).toBe(0);

    const [
      savedReport,
      activityRecipients,
      goalsAndObjectives,
    ] = await activityReportAndRecipientsById(
      defaultGoalReport.id,
    );
    expect(activityRecipients.length).toBe(1);
    expect(goalsAndObjectives.length).toBe(0);

    const defaultGoals = [
      {
        name: undefined,
        isActivelyBeingEditing: true,
        endDate: '',
        objectives: [],
        regionId: 1,
        grantIds: [defaultGoalGrant.id],
        prompts: [],
      },
    ];

    await saveGoalsForReport(defaultGoals, savedReport);

    const afterReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: defaultGoalReport.id,
      },
    });

    expect(afterReportGoals.length).toBe(1);
    expect(afterReportGoals[0].name).toBe(null);

    const afterGoals = await Goal.findAll({
      where: {
        id: afterReportGoals[0].goalId,
      },
    });

    expect(afterGoals.length).toBe(1);
    expect(afterGoals[0].name).toBe(null);
    await cleanupTest(setup);
  });
});
