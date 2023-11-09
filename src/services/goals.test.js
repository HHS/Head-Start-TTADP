import faker from '@faker-js/faker';
import crypto from 'crypto';
import { expect } from '@playwright/test';
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
  ActivityReport,
  ActivityReportGoal,
  ActivityRecipient,
  GoalTemplate,
  User,
} from '../models';
import {
  mergeGoals,
  reduceObjectives,
  reduceObjectivesForActivityReport,
  determineMergeGoalStatus,
  getGoalsForReport,
  createMultiRecipientGoalsFromAdmin,
} from './goals';
import { FILE_STATUSES, GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';
import { createReport, destroyReport, createGoalTemplate } from '../testUtils';
import { OBJECTIVE_STATUS, AUTOMATIC_CREATION } from '../constants';
import { setFieldPromptsForCuratedTemplate } from './goalTemplates';

jest.mock('./goalTemplates', () => ({
  setFieldPromptsForCuratedTemplate: jest.fn(),
}));

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

  describe('createMultiRecipientGoalsFromAdmin', () => {
    let user;
    let recipient;
    let grant;
    let template;

    const existingGoalName = faker.datatype.string(100);

    let mockRequestData;

    beforeAll(async () => {
      user = await User.create({
        homeRegionId: 1,
        hsesUsername: faker.internet.email(),
        hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
        email: faker.internet.email(),
        phoneNumber: faker.phone.phoneNumber(),
        name: faker.name.findName(),
        role: ['Grants Specialist'],
        lastLogin: new Date(),
      });

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

      await Goal.create({
        name: existingGoalName,
        status: 'Draft',
        endDate: null,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      const templateName = faker.name.firstName();
      const secret = 'secret';
      const hash = crypto
        .createHmac('md5', secret)
        .update(templateName)
        .digest('hex');

      template = await GoalTemplate.create({
        hash,
        templateName,
        creationMethod: AUTOMATIC_CREATION,
      });

      mockRequestData = {
        region: String(user.homeRegionId),
        group: '1',
        createReport: false,
        useCuratedGoal: false,
        creator: String(user.id),
        templateId: null,
        goalSource: '',
        goalDate: '',
        selectedGrants: JSON.stringify([{ id: grant.id }]),
        goalText: '',
      };
    });

    afterAll(async () => {
      const goals = await Goal.findAll({
        where: {
          grantId: grant.id,
        },
      });

      const goalIds = goals.map((goal) => goal.id);

      await ActivityReportGoal.destroy({
        where: {
          goalId: goalIds,
        },
      });

      await ActivityRecipient.destroy({
        where: {
          grantId: grant.id,
        },
      });

      await ActivityReport.destroy({
        where: {
          userId: user.id,
        },
      });

      await Goal.destroy({
        where: {
          id: goalIds,
        },
      });

      await GoalTemplate.destroy({
        where: {
          id: template.id,
        },
      });

      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });

      await User.destroy({
        where: {
          id: user.id,
        },
      });
    });

    it('will not create a new goal if a goal with that name already exists', async () => {
      const response = await createMultiRecipientGoalsFromAdmin({
        ...mockRequestData,
        goalText: existingGoalName,
      });
      expect(response).toEqual({
        isError: true,
        message: `Goal name already exists for grants ${grant.id}`,
        grantsForWhomGoalAlreadyExists: [grant.id],
      });
    });

    it('requires a goal name to proceed', async () => {
      const response = await createMultiRecipientGoalsFromAdmin({
        ...mockRequestData,
        goalText: '',
      });
      expect(response).toEqual({
        isError: true,
        message: 'Goal name is required',
        grantsForWhomGoalAlreadyExists: [],
      });
    });

    it('loads the goal name from template and passes off prompts', async () => {
      const data = {
        ...mockRequestData,
        goalText: '',
        useCuratedGoal: true,
        templateId: template.id,
        goalPrompts: [{ promptId: 1, fieldName: 'fei-root-cause' }],
        'fei-root-cause': ['Workforce'],
      };
      const response = await createMultiRecipientGoalsFromAdmin(data);
      expect(response.activityReport).toBe(null);
      expect(response.data).toEqual(data);
      expect(response.goals.length).toBe(1);
      expect(response.goals[0].name).toBe(template.templateName);
      expect(setFieldPromptsForCuratedTemplate).toHaveBeenCalledWith(expect.anything(), [{ promptId: 1, response: ['Workforce'] }]);
    });

    it('creates a new goal', async () => {
      const goalText = faker.datatype.string(100);
      const data = {
        ...mockRequestData,
        goalText,
        endDate: faker.date.future(),
        goalSource: 'Recipient request',
      };
      const response = await createMultiRecipientGoalsFromAdmin(data);
      expect(response.activityReport).toBe(null);
      expect(response.data).toEqual(data);
      expect(response.goals.length).toBe(1);
      expect(response.goals[0].name).toBe(goalText);
    });

    it('creates a new report', async () => {
      const goalText = faker.datatype.string(100);
      const data = {
        ...mockRequestData,
        goalText,
        endDate: faker.date.future(),
        goalSource: 'Recipient request',
        createReport: true,
      };
      const response = await createMultiRecipientGoalsFromAdmin(data);
      expect(response.activityReport).not.toBe(null);
      expect(response.activityReport.userId).toBe(user.id);
      expect(response.data).toEqual(data);
      expect(response.goals.length).toBe(1);
      expect(response.goals[0].name).toBe(goalText);
    });
  });

  describe('determineMergeGoalStatus', () => {
    it('at least one in progress', async () => {
      const status = determineMergeGoalStatus([
        GOAL_STATUS.IN_PROGRESS,
        GOAL_STATUS.CLOSED,
      ]);
      expect(status).toBe(GOAL_STATUS.IN_PROGRESS);
    });

    it('at least one closed', async () => {
      const status = determineMergeGoalStatus([
        GOAL_STATUS.CLOSED,
        GOAL_STATUS.SUSPENDED,
      ]);
      expect(status).toBe(GOAL_STATUS.CLOSED);
    });

    it('at least one suspended', async () => {
      const status = determineMergeGoalStatus([
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.NOT_STARTED,
      ]);
      expect(status).toBe(GOAL_STATUS.SUSPENDED);
    });

    it('not started', async () => {
      const status = determineMergeGoalStatus([
        GOAL_STATUS.NOT_STARTED,
        GOAL_STATUS.DRAFT,
      ]);
      expect(status).toBe(GOAL_STATUS.NOT_STARTED);
    });

    it('DRAFT', async () => {
      const status = determineMergeGoalStatus([
        GOAL_STATUS.DRAFT,
        GOAL_STATUS.DRAFT,
      ]);
      expect(status).toBe(GOAL_STATUS.DRAFT);
    });
  });

  describe('mergeGoals', () => {
    let recipient;
    let grantOne;
    let grantTwo;
    let grantThree;
    let report;
    let template;
    let topic;
    let goalOne;
    let goalTwo;
    let goalThree;

    let objectiveOneForGoalOne;

    const fileName = faker.system.fileName();
    const resourceUrl = faker.internet.url();

    let mergedGoals;
    let mergedGoalIds;

    let dummyGoal;
    const dummyGoalName = `dummy goal ${faker.animal.cetacean()} ${faker.datatype.string()}`;

    beforeAll(async () => {
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
        status: 'Active',
      });

      grantTwo = await Grant.create({
        id: faker.datatype.number({ min: grantOne.id + 1 }),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Inactive',
      });

      grantThree = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
        oldGrantId: grantTwo.id,
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
        name: `Selected goal 1${faker.animal.dog()}`,
        status: GOAL_STATUS.IN_PROGRESS,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantOne.id,
        createdVia: 'rtr',
      });

      goalTwo = await Goal.create({
        name: `Selected goal 2${faker.animal.dog()}`,
        status: GOAL_STATUS.NOT_STARTED,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantOne.id,
        createdVia: 'rtr',
        goalTemplateId: template.id,
      });

      goalThree = await Goal.create({
        name: `Selected goal 3${faker.animal.dog()}`,
        status: GOAL_STATUS.SUSPENDED,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantTwo.id,
        createdVia: 'rtr',
        goalTemplateId: template.id,
      });

      dummyGoal = await Goal.create({
        name: dummyGoalName,
        status: GOAL_STATUS.CLOSED,
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grantTwo.id,
        createdVia: 'rtr',
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

      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: dummyGoal.id,
      });

      objectiveOneForGoalOne = await Objective.create({
        goalId: goalOne.id,
        title: faker.datatype.string(100),
        status: OBJECTIVE_STATUS.NOT_STARTED,
      });

      await ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: objectiveOneForGoalOne.id,
      });

      const dummyGoalObjective = await Objective.create({
        goalId: dummyGoal.id,
        title: faker.datatype.string(100),
        status: OBJECTIVE_STATUS.NOT_STARTED,
      });

      await ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: dummyGoalObjective.id,
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

      await ObjectiveTopic.create({
        objectiveId: dummyGoalObjective.id,
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

      mergedGoals = await mergeGoals(goalOne.id, [goalTwo.id, goalThree.id]);
      mergedGoalIds = mergedGoals.map((goal) => goal.id);
    });

    afterAll(async () => {
      const allGoals = await Goal.unscoped().findAll({
        where: {
          grantId: [grantOne.id, grantTwo.id, grantThree.id],
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
          id: [grantOne.id, grantTwo.id, grantThree.id],
        },
        force: true,
      });

      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('old goals are merged away', async () => {
      expect(mergedGoals.length).toBe(2);

      // verify that new goals were created
      expect(mergedGoalIds).not.toContain(goalOne.id);
      expect(mergedGoalIds).not.toContain(goalTwo.id);
      expect(mergedGoalIds).not.toContain(goalThree.id);

      const goalsThatAreMergedAway = await Goal.unscoped().findAll({
        where: {
          id: [goalOne.id, goalTwo.id, goalThree.id],
        },
        attributes: ['id', 'mapsToParentGoalId'],
        include: [{
          model: Objective,
          as: 'objectives',
          attributes: ['id', 'mapsToParentObjectiveId', 'goalId'],
        }],
      });

      expect(goalsThatAreMergedAway.length).toBe(3);
      const mapsToParentGoalIds = goalsThatAreMergedAway.map((goal) => goal.mapsToParentGoalId)
        .sort();
      expect(
        [mergedGoals[0].id, mergedGoals[0].id, mergedGoals[1].id].sort(),
      ).toEqual(mapsToParentGoalIds);

      const objectivesThatAreMergedAway = goalsThatAreMergedAway
        .map((g) => g.objectives).flat();

      expect(objectivesThatAreMergedAway.length).toBe(4);
      objectivesThatAreMergedAway.forEach((objective) => {
        expect(objective.mapsToParentObjectiveId).not.toBeNull();
      });
    });

    it('data is merged into new goals', async () => {
      // verify goal & associated data with a length query
      // Let's get everything and just go through it all
      const goalsWithData = await Goal.findAll({
        where: {
          id: mergedGoalIds,
        },
        include: [
          {
            model: ActivityReportGoal,
            as: 'activityReportGoals',
          },
          {
            model: GoalFieldResponse,
            as: 'responses',
          },
          {
            model: GoalResource,
            as: 'goalResources',
          },
          {
            model: Objective,
            as: 'objectives',
            include: [
              {
                model: ObjectiveFile,
                as: 'objectiveFiles',
              },
              {
                model: ObjectiveResource,
                as: 'objectiveResources',
              },
              {
                model: ObjectiveTopic,
                as: 'objectiveTopics',
              },
              {
                model: ActivityReportObjective,
                as: 'activityReportObjectives',
              },
            ],
          },
        ],
        order: [['grantId', 'asc']],
      });

      expect(goalsWithData.length).toBe(2);
      const grantIds = goalsWithData.map((goal) => goal.grantId);
      expect(grantIds).toContain(grantOne.id);
      expect(grantIds).toContain(grantThree.id);

      const goalForGrantOne = goalsWithData.find((g) => g.grantId === grantOne.id);
      expect(goalForGrantOne.status).toBe(GOAL_STATUS.IN_PROGRESS);
      expect(goalForGrantOne.objectives.length).toBe(3);
      expect(goalForGrantOne.responses.length).toBe(0);
      expect(goalForGrantOne.goalResources.length).toBe(1);
      expect(goalForGrantOne.activityReportGoals.length).toBe(1);

      const [arGoal] = goalForGrantOne.activityReportGoals;
      expect(arGoal.activityReportId).toBe(report.id);
      expect(arGoal.originalGoalId).toBe(goalOne.id);

      const aroForGoalForGrantOne = goalForGrantOne.objectives
        .map((o) => o.activityReportObjectives).flat();
      expect(aroForGoalForGrantOne.length).toBe(1);
      expect(aroForGoalForGrantOne[0].activityReportId).toBe(report.id);
      expect(aroForGoalForGrantOne[0].originalObjectiveId).toBe(objectiveOneForGoalOne.id);

      const objectiveResourcesForGoalForGrantOne = goalForGrantOne.objectives
        .map((o) => o.objectiveResources).flat();
      expect(objectiveResourcesForGoalForGrantOne.length).toBe(1);

      const objectiveTopicsForGoalForGrantOne = goalForGrantOne.objectives
        .map((o) => o.objectiveTopics).flat();
      expect(objectiveTopicsForGoalForGrantOne.length).toBe(1);

      const objectiveFilesForGoalForGrantOne = goalForGrantOne.objectives
        .map((o) => o.objectiveFiles).flat();
      expect(objectiveFilesForGoalForGrantOne.length).toBe(0);

      const goalForGrantTwo = goalsWithData.find((g) => g.grantId === grantThree.id);
      expect(goalForGrantTwo.status).toBe(GOAL_STATUS.IN_PROGRESS);
      expect(goalForGrantTwo.objectives.length).toBe(1);
      expect(goalForGrantTwo.responses.length).toBe(1);
      expect(goalForGrantTwo.goalResources.length).toBe(0);
      expect(goalForGrantTwo.activityReportGoals.length).toBe(0);

      const aroForGoalForGrantTwo = goalForGrantTwo.objectives
        .map((o) => o.activityReportObjectives).flat();
      expect(aroForGoalForGrantTwo.length).toBe(0);

      const objectiveResourcesForGoalForGrantTwo = goalForGrantTwo.objectives
        .map((o) => o.objectiveResources).flat();
      expect(objectiveResourcesForGoalForGrantTwo.length).toBe(0);

      const objectiveTopicsForGoalForGrantTwo = goalForGrantTwo.objectives
        .map((o) => o.objectiveTopics).flat();
      expect(objectiveTopicsForGoalForGrantTwo.length).toBe(0);

      const objectiveFilesForGoalForGrantTwo = goalForGrantTwo.objectives
        .map((o) => o.objectiveFiles).flat();
      expect(objectiveFilesForGoalForGrantTwo.length).toBe(1);
    });

    it('leaves random goals and objectives alone', async () => {
      const dummyGoalValidation = await Goal.findOne({
        where: {
          id: dummyGoal.id,
        },
        include: [
          {
            model: ActivityReportGoal,
            as: 'activityReportGoals',
          },
          {
            model: Objective,
            as: 'objectives',
            include: [
              {
                model: ActivityReportObjective,
                as: 'activityReportObjectives',
              },
            ],
          },
        ],
      });

      expect(dummyGoalValidation.grantId).toBe(grantTwo.id);
      expect(dummyGoalValidation.status).toBe(GOAL_STATUS.CLOSED);
      expect(dummyGoalValidation.activityReportGoals.length).toBe(1);
      expect(dummyGoalValidation.objectives.length).toBe(1);
      expect(dummyGoalValidation.objectives[0].activityReportObjectives.length).toBe(1);
    });

    it('updates what is returned for an AR', async () => {
      const goals = await getGoalsForReport(report.id);

      expect(goals.length).toBe(2);

      const goalForGrantOne = mergedGoals.find((g) => g.grantId === grantOne.id);
      const expectedGoalIds = [goalForGrantOne.id, dummyGoal.id].sort();
      const actualGoalIds = goals.map((goal) => goal.id).sort();
      expect(actualGoalIds).toEqual(expectedGoalIds);
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
