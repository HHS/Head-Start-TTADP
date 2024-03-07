import faker from '@faker-js/faker';
import { expect } from '@playwright/test';
import db, {
  Recipient,
  Grant,
  Goal,
  GoalCollaborator,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  GoalResource,
  Objective,
  ObjectiveCollaborator,
  ObjectiveResource,
  ObjectiveFile,
  ObjectiveTopic,
  ActivityReportGoal,
  ActivityReportObjective,
  Resource,
  Topic,
  File,
  CollaboratorType,
  GoalSimilarityGroup,
  GoalSimilarityGroupGoal,
} from '../models';
import {
  mergeGoals,
  getGoalsForReport,
} from './goals';
import { createReport, destroyReport, createGoalTemplate } from '../testUtils';
import { createSimilarityGroup } from '../services/goalSimilarityGroup';
import {
  OBJECTIVE_STATUS,
  FILE_STATUSES,
  GOAL_STATUS,
  GOAL_COLLABORATORS,
  OBJECTIVE_COLLABORATORS,
} from '../constants';

// Mocking express-http-context
jest.mock('express-http-context', () => {
  const httpContext = jest.requireActual('express-http-context');

  // Mock the get function to return 1
  httpContext.get = jest.fn(() => 1);

  return httpContext;
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
  let objectiveTwoForGoalOne;
  let objectiveThreeForGoalOne;
  let objectiveOneForGoalTwo;
  let objectiveOneForGoalThree;

  const fileName = faker.system.fileName();
  const resourceUrl = faker.internet.url();

  let mergedGoals;
  let mergedGoalIds;

  let oldGoal;
  let dummyGoal;
  let dummyGoalObjective;
  const dummyGoalName = `dummy goal ${faker.animal.cetacean()} ${faker.datatype.string()}`;
  let similarityGroup;

  beforeAll(async () => {
    // Recipient.
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 9999 }),
      name: faker.name.firstName(),
      startDate: new Date(),
      endDate: new Date(),
    });

    // Grant.
    grantOne = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
    });

    grantTwo = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Inactive',
    });

    grantThree = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
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

    oldGoal = await Goal.create({
      name: `old goal${faker.animal.dog() + faker.datatype.string(100)}}`,
      status: GOAL_STATUS.IN_PROGRESS,
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grantOne.id,
      createdVia: 'rtr',
    });

    goalOne = await Goal.create({
      name: `Selected goal 1${faker.animal.dog() + faker.datatype.string(100)}`,
      status: GOAL_STATUS.IN_PROGRESS,
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grantOne.id,
      createdVia: 'rtr',
    });

    goalTwo = await Goal.create({
      name: `Selected goal 2${faker.animal.dog() + faker.datatype.string(100)}`,
      status: GOAL_STATUS.NOT_STARTED,
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grantOne.id,
      createdVia: 'rtr',
      goalTemplateId: template.id,
    });

    goalThree = await Goal.create({
      name: `Selected goal 3${faker.animal.dog() + faker.datatype.string(100)}`,
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
      originalGoalId: oldGoal.id,
    });

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goalTwo.id,
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

    dummyGoalObjective = await Objective.create({
      goalId: dummyGoal.id,
      title: faker.datatype.string(100),
      status: OBJECTIVE_STATUS.NOT_STARTED,
    });

    await ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: dummyGoalObjective.id,
    });

    objectiveTwoForGoalOne = await Objective.create({
      goalId: goalOne.id,
      title: faker.datatype.string(100),
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    await ObjectiveResource.create({
      objectiveId: objectiveTwoForGoalOne.id,
      resourceId: resource.id,
    });

    objectiveThreeForGoalOne = await Objective.create({
      goalId: goalOne.id,
      title: faker.datatype.string(100),
      status: OBJECTIVE_STATUS.NOT_STARTED,
    });

    await ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: objectiveThreeForGoalOne.id,
      originalObjectiveId: dummyGoalObjective.id,
    });

    objectiveOneForGoalTwo = await Objective.create({
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

    objectiveOneForGoalThree = await Objective.create({
      goalId: goalThree.id,
      title: faker.datatype.string(100),
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    await ObjectiveFile.create({
      objectiveId: objectiveOneForGoalThree.id,
      fileId: file.id,
    });

    await GoalCollaborator.update(
      { userId: 2 },
      {
        where: {
          goalId: [
            oldGoal.id,
            goalOne.id,
            goalTwo.id,
            goalThree.id,
            dummyGoal.id,
          ],
        },
      },
    );

    await ObjectiveCollaborator.update(
      { userId: 2 },
      {
        where: {
          objectiveId: [
            objectiveOneForGoalOne.id,
            objectiveTwoForGoalOne.id,
            objectiveThreeForGoalOne.id,
            objectiveOneForGoalTwo.id,
            objectiveOneForGoalThree.id,
            dummyGoalObjective.id,
          ],
        },
      },
    );

    similarityGroup = await createSimilarityGroup(
      recipient.id,
      [{ ids: [goalOne.id, goalTwo.id, goalThree.id], excludedIfNotAdmin: false }],
    );

    mergedGoals = await mergeGoals(
      goalOne.id,
      [goalOne.id, goalTwo.id, goalThree.id],
      similarityGroup.id,
    );
    mergedGoalIds = mergedGoals.map((goal) => goal.id);
  });

  it('goalSimilarityGroup is updated', async () => {
    const updatedSimilarityGroup = await GoalSimilarityGroup.findOne({
      where: {
        id: similarityGroup.id,
      },
    });

    expect(updatedSimilarityGroup).not.toBeNull();
    expect(updatedSimilarityGroup.finalGoalId).not.toBeNull();
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
      include: [
        {
          model: GoalCollaborator,
          as: 'goalCollaborators',
          include: [{
            model: CollaboratorType,
            as: 'collaboratorType',
          }],
        },
        {
          model: Objective,
          as: 'objectives',
          attributes: ['id', 'mapsToParentObjectiveId', 'goalId'],
          include: [
            {
              model: ObjectiveCollaborator,
              as: 'objectiveCollaborators',
              include: [{
                model: CollaboratorType,
                as: 'collaboratorType',
              }],
            },
          ],
        },
      ],
    });

    expect(goalsThatAreMergedAway.length).toBe(3);
    const mapsToParentGoalIds = goalsThatAreMergedAway.map((goal) => goal.mapsToParentGoalId)
      .sort();

    const mergedGoalFromGrantOne = mergedGoals.find((g) => g.grantId === grantOne.id);
    const otherMergedGoal = mergedGoals.find((g) => g.id !== mergedGoalFromGrantOne.id);

    expect(
      [mergedGoalFromGrantOne.id, mergedGoalFromGrantOne.id, otherMergedGoal.id].sort(),
    ).toEqual(mapsToParentGoalIds);

    goalsThatAreMergedAway.forEach((goal) => {
      const creator = goal.goalCollaborators
        .filter((gc) => gc.collaboratorType.dataValues.name === GOAL_COLLABORATORS.CREATOR);
      const linkers = goal.goalCollaborators
        .filter((gc) => gc.collaboratorType.dataValues.name === GOAL_COLLABORATORS.LINKER);
      const mergeDeprecator = goal.goalCollaborators
        .filter((
          gc,
        ) => gc.collaboratorType.dataValues.name === GOAL_COLLABORATORS.MERGE_DEPRECATOR);
      /* eslint-disable jest/no-conditional-expect */
      if (goal.id === goalOne.id || goal.id === goalTwo.id) {
        expect(creator[0].dataValues.userId).toBe(2);
        expect(linkers[0].dataValues.userId).toBe(2);
        expect(mergeDeprecator[0].dataValues.userId).toBe(1);
      } else if (goal.id === goalThree.id) {
        expect(creator[0].dataValues.userId).toBe(2);
        expect(mergeDeprecator[0].dataValues.userId).toBe(1);
      }
      /* eslint-enable jest/no-conditional-expect */
    });

    const objectivesThatAreMergedAway = goalsThatAreMergedAway
      .map((g) => g.objectives).flat();

    expect(objectivesThatAreMergedAway.length).toBe(5);
    objectivesThatAreMergedAway.forEach((objective) => {
      expect([goalOne.id, goalTwo.id, goalThree.id]).toContain(objective.goalId);
      expect(objective.mapsToParentObjectiveId).not.toBeNull();
      expect(objective.mapsToParentObjectiveId).not.toBe(objective.id);

      const creator = objective.objectiveCollaborators
        .filter((oc) => oc.collaboratorType.dataValues.name === OBJECTIVE_COLLABORATORS.CREATOR);
      const linkers = objective.objectiveCollaborators
        .filter((oc) => oc.collaboratorType.dataValues.name === OBJECTIVE_COLLABORATORS.LINKER);
      const mergeDeprecator = objective.objectiveCollaborators
        .filter((
          oc,
        ) => oc.collaboratorType.dataValues.name === OBJECTIVE_COLLABORATORS.MERGE_DEPRECATOR);

      /* eslint-disable jest/no-conditional-expect */
      if (objective.id === objectiveOneForGoalOne.id
        && objective.id === objectiveThreeForGoalOne.id) {
        expect(creator?.[0].dataValues.userId).toBe(2);
        expect(linkers?.[0].dataValues.userId).toBe(2);
        expect(mergeDeprecator?.[0].dataValues.userId).toBe(1);
      } else if (objective.id === objectiveTwoForGoalOne.id
        && objective.id === objectiveOneForGoalTwo.id
        && objective.id === objectiveOneForGoalThree.id) {
        expect(creator?.[0].dataValues.userId).toBe(2);
        expect(mergeDeprecator?.[0].dataValues.userId).toBe(1);
      }
      /* eslint-enable jest/no-conditional-expect */
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
          model: GoalCollaborator,
          as: 'goalCollaborators',
          include: [{
            model: CollaboratorType,
            as: 'collaboratorType',
          }],
        },
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
              model: ObjectiveCollaborator,
              as: 'objectiveCollaborators',
              include: [{
                model: CollaboratorType,
                as: 'collaboratorType',
              }],
            },
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
    expect(goalForGrantOne.objectives.length).toBe(4);
    expect(goalForGrantOne.responses.length).toBe(0);
    expect(goalForGrantOne.goalResources.length).toBe(1);
    expect(goalForGrantOne.activityReportGoals.length).toBe(2);

    const arGoalOne = goalForGrantOne.activityReportGoals.find((g) => g.goalId === goalOne.id);
    expect(arGoalOne).toBe(undefined);
    // eslint-disable-next-line max-len
    const arOldGoal = goalForGrantOne.activityReportGoals.find((g) => g.originalGoalId === oldGoal.id);
    expect(arOldGoal.activityReportId).toBe(report.id);
    // eslint-disable-next-line max-len
    const arGoalTwo = goalForGrantOne.activityReportGoals.find((g) => g.originalGoalId === goalTwo.id);
    expect(arGoalTwo.activityReportId).toBe(report.id);

    goalsWithData.forEach((goal) => {
      const mergeCreator = goal.goalCollaborators
        .filter((gc) => gc.collaboratorType.dataValues.name === GOAL_COLLABORATORS.MERGE_CREATOR);

      expect(mergeCreator[0].dataValues.userId).toBe(1);
    });

    goalForGrantOne.objectives.forEach((objective) => {
      const mergeCreator = objective.objectiveCollaborators
        .filter((
          oc,
        ) => oc.collaboratorType.dataValues.name === OBJECTIVE_COLLABORATORS.MERGE_CREATOR);

      expect(mergeCreator?.[0].dataValues.userId).toBe(1);
    });

    const aroForGoalForGrantOne = goalForGrantOne.objectives
      .map((o) => o.activityReportObjectives).flat();
    expect(aroForGoalForGrantOne.length).toBe(2);

    // eslint-disable-next-line max-len
    const newlyMerged = aroForGoalForGrantOne.find((o) => o.originalObjectiveId === objectiveOneForGoalOne.id);
    // eslint-disable-next-line max-len
    const oldlyMerged = aroForGoalForGrantOne.find((o) => o.originalObjectiveId === dummyGoalObjective.id);

    expect(newlyMerged).not.toBe(undefined);
    expect(oldlyMerged).not.toBe(undefined);

    expect(newlyMerged.activityReportId).toBe(report.id);
    expect(newlyMerged.originalObjectiveId).toBe(objectiveOneForGoalOne.id);
    expect(oldlyMerged.activityReportId).toBe(report.id);

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
    expect(goalForGrantTwo.responses.length).toBe(0);
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

    await GoalSimilarityGroupGoal.destroy({
      where: {
        goalId: allGoalIds,
      },
    });

    await GoalSimilarityGroup.destroy({
      where: {
        id: similarityGroup.id,
      },
    });

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
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await db.sequelize.close();
  });
});
