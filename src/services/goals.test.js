import faker from '@faker-js/faker';
import db, {
  Recipient,
  Grant,
  Goal,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  GoalResource,
  Objective,
  ObjectiveResource,
  ObjectiveFile,
  ObjectiveTopic,
  ActivityReportGoal,
  ActivityReportObjective,
  Resource,
  Topic,
  File,
} from '../models';
import {
  mergeGoals,
  reduceObjectives,
  reduceObjectivesForActivityReport,
} from './goals';
import { FILE_STATUSES, GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';
import { createReport, destroyReport, createGoalTemplate } from '../testUtils';

const objectivesToReduce = [
  {
    id: 1,
    title: ' This has leading and trailing spaces. ',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 2,
    title: 'This has leading and trailing spaces. ',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 3,
    title: ' This has leading and trailing spaces.',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 4,
    title: 'This doesn\'t leading and trailing spaces.',
    status: OBJECTIVE_STATUS.COMPLETE,
  },
];

describe('Goals DB service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('mergeGoals', () => {
    let recipient;
    let grantOne;
    let grantTwo;
    let report;
    let template;
    let topic;
    let goalOne;
    let goalTwo;
    let goalThree;

    const fileName = faker.system.fileName();
    const resourceUrl = faker.internet.url();

    beforeEach(async () => {
      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
        startDate: new Date(),
        endDate: new Date(),
      });

      // Grant.
      grantOne = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      grantTwo = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      template = await createGoalTemplate();

      const promptTitle = faker.datatype.string(255);

      const prompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 1,
        title: promptTitle,
        prompt: promptTitle,
        hint: '',
        options: ['option 1', 'option 2', 'option 3'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });

      goalOne = await Goal.create({
        name: `Selected goal ${faker.animal.dog()}`,
        status: GOAL_STATUS.IN_PROGRESS,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantOne.id,
        createdVia: 'rtr',
      });

      goalTwo = await Goal.create({
        name: `Selected goal ${faker.animal.dog()}`,
        status: GOAL_STATUS.NOT_STARTED,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantOne.id,
        createdVia: 'rtr',
        goalTemplateId: template.id,
      });

      goalThree = await Goal.create({
        name: `Selected goal ${faker.animal.dog()}`,
        status: GOAL_STATUS.SUSPENDED,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantTwo.id,
        createdVia: 'rtr',
        goalTemplateId: template.id,
      });

      await GoalFieldResponse.create({
        goalTemplateFieldPromptId: prompt.id,
        response: ['option 1', 'option 2'],
        goalId: goalThree.id,
      });

      report = await createReport({
        activityRecipients: [{
          grantId: grantOne.id,
        }],
      });

      topic = await Topic.create({
        name: faker.datatype.string(100),
      });

      const resource = await Resource.create({
        url: resourceUrl,
      });

      const file = await File.create({
        originalFileName: fileName,
        key: fileName,
        status: FILE_STATUSES.APPROVED,
        fileSize: 123445,
      });

      await GoalResource.create({
        goalId: goalTwo.id,
        resourceId: resource.id,
      });

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goalOne.id,
      });

      const objectiveOneForGoalOne = await Objective.create({
        goalId: goalOne.id,
        title: faker.datatype.string(100),
        status: OBJECTIVE_STATUS.NOT_STARTED,
      });

      await ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: objectiveOneForGoalOne.id,
      });

      const objectiveTwoForGoalOne = await Objective.create({
        goalId: goalOne.id,
        title: faker.datatype.string(100),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
      });

      await ObjectiveResource.create({
        objectiveId: objectiveTwoForGoalOne.id,
        resourceId: resource.id,
      });

      const objectiveOneForGoalTwo = await Objective.create({
        goalId: goalTwo.id,
        title: faker.datatype.string(100),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
      });

      await ObjectiveTopic.create({
        objectiveId: objectiveOneForGoalTwo.id,
        topicId: topic.id,
      });

      const objectiveOneForGoalThree = await Objective.create({
        goalId: goalThree.id,
        title: faker.datatype.string(100),
        status: OBJECTIVE_STATUS.IN_PROGRESS,
      });

      await ObjectiveFile.create({
        objectiveId: objectiveOneForGoalThree.id,
        fileId: file.id,
      });
    });

    afterEach(async () => {
      const allGoals = await Goal.unscoped().findAll({
        where: {
          grantId: [grantOne.id, grantTwo.id],
        },
        include: {
          model: Objective,
          as: 'objectives',
        },
      });

      const allGoalIds = allGoals.map((goal) => goal.id);
      const allObjectives = allGoals.map((g) => g.objectives).flat();
      const allObjectiveIds = allObjectives.map((objective) => objective.id);

      await ActivityReportObjective.destroy({
        where: {
          objectiveId: allObjectiveIds,
        },
      });

      await ActivityReportGoal.destroy({
        where: {
          goalId: allGoalIds,
        },
      });

      await ObjectiveResource.destroy({
        where: {
          objectiveId: allObjectiveIds,
        },
      });

      await ObjectiveTopic.destroy({
        where: {
          objectiveId: allObjectiveIds,
        },
      });

      await ObjectiveFile.destroy({
        where: {
          objectiveId: allObjectiveIds,
        },
      });

      await Objective.destroy({
        where: {
          id: allObjectiveIds,
        },
        force: true,
      });

      await destroyReport(report);

      await GoalFieldResponse.destroy({
        where: {
          goalId: allGoalIds,
        },
      });

      await GoalResource.destroy({
        where: {
          goalId: allGoalIds,
        },
      });

      await Goal.unscoped().destroy({
        where: {
          id: allGoalIds,
        },
        force: true,
      });

      await GoalTemplateFieldPrompt.destroy({
        where: {
          goalTemplateId: template.id,
        },
      });

      await GoalTemplate.destroy({
        where: {
          id: template.id,
        },
      });

      await Resource.destroy({
        where: {
          url: resourceUrl,
        },
      });

      await File.destroy({
        where: {
          originalFileName: fileName,
        },
      });

      await Topic.destroy({
        where: {
          name: topic.name,
        },
      });

      await Grant.destroy({
        where: {
          id: [grantOne.id, grantTwo.id],
        },
        force: true,
      });

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });
    it('merges goals and goal data', async () => {
      const mergedGoals = await mergeGoals(goalOne.id, [goalTwo.id, goalThree.id]);
      expect(mergedGoals.length).toBe(2);

      // TODO: verify goal & associated data with a length query here
    });
  });

  describe('reduce objectives', () => {
    let recipient;
    let grant;
    let goal;
    let objectiveOne;
    let objectiveTwo;
    let objectiveThree;
    let objectiveFour;

    beforeAll(async () => {
      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
        startDate: new Date(),
        endDate: new Date(),
      });

      // Grant.
      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      // Goal.
      goal = await Goal.create({
        name: '    Goal for Objectives with leading and trailing values    ',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      // Objectives.
      objectiveOne = await Objective.create({
        ...objectivesToReduce[0],
        goalId: goal.id,
      });
      objectiveTwo = await Objective.create({
        ...objectivesToReduce[1],
        goalId: goal.id,
      });
      objectiveThree = await Objective.create({
        ...objectivesToReduce[2],
        goalId: goal.id,
      });
      objectiveFour = await Objective.create({
        ...objectivesToReduce[3],
        goalId: goal.id,
      });
    });

    afterAll(async () => {
    // Objectives.
      await Objective.destroy({
        where: {
          id: objectiveOne.id,
        },
        force: true,
      });
      await Objective.destroy({
        where: {
          id: objectiveTwo.id,
        },
        force: true,
      });
      await Objective.destroy({
        where: {
          id: objectiveThree.id,
        },
        force: true,
      });
      await Objective.destroy({
        where: {
          id: objectiveFour.id,
        },
        force: true,
      });

      // Goal.
      await Goal.destroy({
        where: {
          id: goal.id,
        },
        force: true,
      });

      // Grant.
      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });

      // Recipient.
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('objective reduce returns the correct number of objectives with spaces', async () => {
      const reducedObjectives = await reduceObjectives(
        [objectiveOne,
          objectiveTwo,
          objectiveThree,
          objectiveFour,
        ],
      );
      expect(reducedObjectives.length).toBe(2);
      expect(reducedObjectives[0].title.trim()).toBe('This has leading and trailing spaces.');
      expect(reducedObjectives[1].title).toBe('This doesn\'t leading and trailing spaces.');
    });

    it('ar reduce returns the correct number of objectives with spaces', async () => {
      const reducedObjectives = await reduceObjectivesForActivityReport(
        [objectiveOne,
          objectiveTwo,
          objectiveThree,
          objectiveFour,
        ],
      );
      expect(reducedObjectives.length).toBe(2);
      expect(reducedObjectives[0].title.trim()).toBe('This has leading and trailing spaces.');
      expect(reducedObjectives[1].title).toBe('This doesn\'t leading and trailing spaces.');
    });
  });
});
