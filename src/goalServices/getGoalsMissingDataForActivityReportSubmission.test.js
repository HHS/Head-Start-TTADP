import faker from '@faker-js/faker';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
import {
  Grant,
  Recipient,
  Goal,
  GoalTemplate,
  GoalFieldResponse,
  GoalTemplateFieldPrompt,
  sequelize,
} from '../models';
import {
  createGoal,
  createGoalTemplate,
  createRecipient,
  createGrant,
} from '../testUtils';
import getGoalsMissingDataForActivityReportSubmission from './getGoalsMissingDataForActivityReportSubmission';

describe('getGoalsMissingDataForActivityReportSubmission', () => {
  const goalTitle = faker.lorem.sentence();

  let goalOne;
  let goalTwo;
  let recipient;
  let activeGrant;

  let template;

  beforeAll(async () => {
    recipient = await createRecipient();

    activeGrant = await createGrant({
      recipientId: recipient.id,
      status: 'Active',
    });

    template = await createGoalTemplate({
      name: goalTitle,
      creationMethod: CREATION_METHOD.CURATED,
    });

    goalOne = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitle,
      grantId: activeGrant.id,
      goalTemplateId: template.id,
    });

    goalTwo = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitle,
      grantId: activeGrant.id,
      goalTemplateId: template.id,
    });

    const prompt = await GoalTemplateFieldPrompt.create({
      goalTemplateId: template.id,
      ordinal: 1,
      title: faker.lorem.sentence(),
      prompt: faker.lorem.sentence(),
      type: 'text',
      hint: faker.lorem.sentence(),
      caution: faker.lorem.sentence(),
      options: [],
    });

    await GoalFieldResponse.create({
      goalTemplateFieldPromptId: prompt.id,
      goalId: goalOne.id,
      response: [faker.datatype.string(100), faker.datatype.string(100)],
      onAR: false,
      onApprovedAR: false,
    });
  });

  afterAll(async () => {
    await GoalFieldResponse.destroy({
      where: {
        goalId: goalOne.id,
      },
      individualHooks: true,
    });

    await GoalTemplateFieldPrompt.destroy({
      where: {
        goalTemplateId: template.id,
      },
      individualHooks: true,
    });

    await Goal.destroy({
      where: {
        id: [goalOne.id, goalTwo.id],
      },
      force: true,
      individualHooks: true,
    });

    await GoalTemplate.destroy({
      where: {
        id: template.id,
      },
      individualHooks: true,
    });

    await Grant.destroy({
      where: {
        id: activeGrant.id,
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
      individualHooks: true,
    });

    await sequelize.close();
  });

  it('fetches and filters', async () => {
    const goals = await getGoalsMissingDataForActivityReportSubmission([goalOne.id, goalTwo.id]);
    expect(goals).toHaveLength(1);
    const [goal] = goals;
    expect(goal.id).toBe(goalTwo.id);
    expect(goal.recipientId).toBe(recipient.id);
    expect(goal.recipientName).toBe(recipient.name);
    expect(goal.grantNumber).toBe(activeGrant.number);
    expect(goal.regionId).toBe(activeGrant.regionId);
  });
});
