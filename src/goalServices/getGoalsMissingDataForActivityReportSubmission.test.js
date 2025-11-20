import faker from '@faker-js/faker';
import { uniq } from 'lodash';
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
  let goalThree;
  let recipient;
  let activeGrant;

  let template;
  let templateTwo;
  let templateThree;

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

    templateTwo = await createGoalTemplate({
      name: `${goalTitle} 2`,
      creationMethod: CREATION_METHOD.CURATED,
    });

    templateThree = await createGoalTemplate({
      name: `${goalTitle} 3`,
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
      goalTemplateId: templateTwo.id,
    });

    goalThree = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitle,
      grantId: activeGrant.id,
      goalTemplateId: templateThree.id,
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

    await GoalFieldResponse.create({
      goalTemplateFieldPromptId: prompt.id,
      goalId: goalThree.id,
      response: [],
      onAR: false,
      onApprovedAR: false,
    });
  });

  afterAll(async () => {
    await GoalFieldResponse.destroy({
      where: {
        goalId: [goalOne.id, goalTwo.id, goalThree.id],
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
        id: [goalOne.id, goalTwo.id, goalThree.id],
      },
      force: true,
      individualHooks: true,
    });

    await GoalTemplate.destroy({
      where: {
        id: [template.id, templateTwo.id, templateThree.id],
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
    const goals = await getGoalsMissingDataForActivityReportSubmission(
      [goalOne.id, goalTwo.id, goalThree.id],
    );
    expect(goals).toHaveLength(2);

    const goalIds = goals.map((g) => g.id);
    expect(goalIds).toContain(goalTwo.id);
    expect(goalIds).toContain(goalThree.id);

    const recipientIds = uniq(goals.map((g) => g.recipientId));
    expect(recipientIds).toHaveLength(1);
    expect(recipientIds).toContain(recipient.id);

    const recipientNames = uniq(goals.map((g) => g.recipientName));
    expect(recipientNames).toHaveLength(1);
    expect(recipientNames).toContain(recipient.name);

    const grantNumbers = uniq(goals.map((g) => g.grantNumber));
    expect(grantNumbers).toHaveLength(1);
    expect(grantNumbers).toContain(activeGrant.number);

    const regionIds = uniq(goals.map((g) => g.regionId));
    expect(regionIds).toHaveLength(1);
    expect(regionIds).toContain(activeGrant.regionId);
  });
});
