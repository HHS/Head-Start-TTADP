import faker from '@faker-js/faker';
import {
  Grant, Recipient, Goal, GoalTemplate, sequelize,
} from '../models';
import {
  createGoal,
  createGoalTemplate,
  createRecipient,
  createGrant,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
import { getGoalIdsBySimilarity } from './goals';

describe('getGoalIdsBySimilarity', () => {
  let goalGroupOne = [];
  let goalGroupTwo = [];
  let goalGroupThree = [];

  const goalTitleOne = faker.lorem.sentence();
  const goalTitleTwo = faker.lorem.sentence();
  const goalTitleThree = faker.lorem.sentence();

  let recipient;
  let activeGrant;
  let inactiveGrantWithReplacement;
  let inactiveGrantWithoutReplacement;
  let replacementGrant;

  let template;

  beforeAll(async () => {
    recipient = createRecipient();

    activeGrant = await createGrant({
      recipientId: recipient.id,
      status: 'Active',
    });

    inactiveGrantWithReplacement = await createGrant({
      recipientId: recipient.id,
      status: 'Inactive',
    });

    inactiveGrantWithoutReplacement = await createGrant({
      recipientId: recipient.id,
      status: 'Inactive',
    });

    replacementGrant = await createGrant({
      recipientId: recipient.id,
      status: 'Active',
      oldGrantId: inactiveGrantWithReplacement.id,
    });

    goalGroupOne = await Promise.all([
      createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        name: goalTitleOne,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        name: goalTitleOne,
        grantId: replacementGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        name: goalTitleOne,
        grantId: inactiveGrantWithoutReplacement.id,
      }),
      createGoal({
        status: GOAL_STATUS.NOT_STARTED,
        name: goalTitleOne,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.NOT_STARTED,
        name: goalTitleOne,
        grantId: inactiveGrantWithReplacement.id,
      }),
    ]);

    template = await createGoalTemplate({
      name: goalTitleTwo,
      creationMethod: CREATION_METHOD.CURATED,
    });

    goalGroupTwo = await Promise.all([
      createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        name: goalTitleTwo,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.DRAFT,
        name: goalTitleTwo,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.CLOSED,
        name: goalTitleTwo,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.NOT_STARTED,
        name: goalTitleTwo,
        goalTemplateId: template.id,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.CLOSED,
        name: goalTitleTwo,
        goalTemplateId: template.id,
        grantId: activeGrant.id,
      }),
    ]);

    goalGroupThree = await Promise.all([
      createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        name: goalTitleThree,
        grantId: activeGrant.id,
      }),
      createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        name: goalTitleThree,
        grantId: activeGrant.id,
      }),
    ]);
  });

  afterAll(async () => {
    const goals = [
      ...goalGroupOne,
      ...goalGroupTwo,
      ...goalGroupThree,
    ];
    const grants = await Grant.findAll({
      attributes: ['id', 'recipientId'],
      where: {
        id: goals.map((g) => g.grantId),
      },
    });

    const recipients = await Recipient.findAll({
      attributes: ['id'],
      where: {
        id: grants.map((g) => g.recipientId),
      },
    });

    await Goal.destroy({
      where: {
        id: goals.map((g) => g.id),
      },
      force: true,
    });

    await GoalTemplate.destroy({
      where: {
        id: template.id,
      },
      force: true,
    });

    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
      force: true,
    });

    await Recipient.destroy({
      where: {
        id: recipients.map((r) => r.id),
      },
      force: true,
    });

    await sequelize.close();
  });

  it('shapes the similiarty response', async () => {
    const similarityResponse = [goalGroupOne, goalGroupTwo, goalGroupThree].map((group) => ({
      id: group[0].id,
      name: group[0].name,
      matches: group.map((g) => ({
        id: g.id,
        name: g.name,
      })),
    }));

    const idsSets = await getGoalIdsBySimilarity(similarityResponse);
    // we expect goal group three to be eliminated, so we should have two sets
    expect(idsSets).toHaveLength(2);

    const [setOne, setTwo] = idsSets;

    // set one has been partially de-duped
    expect(setOne.goals.length).toBe(2);
    expect(setOne.ids).toHaveLength(4);
    // set two is all distinct
    expect(setTwo.goals.length).toBe(4);
    expect(setTwo.ids).toHaveLength(4);
  });
});
