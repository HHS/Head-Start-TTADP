import faker from '@faker-js/faker';
import {
  ActivityReportGoal,
  Grant,
  Recipient,
  Goal,
  GoalTemplate,
  GoalFieldResponse,
  GoalTemplateFieldPrompt,
  GoalSimilarityGroup,
  GoalSimilarityGroupGoal,
  sequelize,
} from '../models';
import {
  createGoal,
  createGoalTemplate,
  createRecipient,
  createGrant,
  createReport,
  destroyReport,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
import {
  getGoalIdsBySimilarity,
  getReportCountForGoals,
  hasMultipleGoalsOnSameActivityReport,
} from './goals';
import { similarGoalsForRecipient } from '../services/similarity';

jest.mock('../services/similarity');

describe('getGoalIdsBySimilarity', () => {
  let goalGroupOne = [];
  let goalGroupTwo = [];
  let goalGroupThree = [];

  const goalTitleOne = faker.lorem.sentence();
  const goalTitleTwo = faker.lorem.sentence();
  const goalTitleThree = faker.lorem.sentence();
  const goalTitleFour = faker.lorem.sentence();
  const goalTitleFive = faker.lorem.sentence();

  let groupIneligibleForSimilarityForReportCount = [];
  let groupIneligibleForSimilarityViaResponse = [];

  let recipient;
  let recipientTwo;
  let activeGrant;
  let inactiveGrantWithReplacement;
  let inactiveGrantWithoutReplacement;
  let replacementGrant;

  let template;
  let report;

  beforeAll(async () => {
    recipient = await createRecipient();
    recipientTwo = await createRecipient();

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

    report = await createReport({
      regionId: activeGrant.regionId,
      activityRecipients: [{
        grantId: activeGrant.id,
      }],
    });

    const ineligibleReportGoalOne = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitleFour,
      grantId: activeGrant.id,
    });

    const ineligibleReportGoalTwo = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitleFour,
      grantId: activeGrant.id,
    });

    await ActivityReportGoal.bulkCreate([{
      activityReportId: report.id,
      goalId: ineligibleReportGoalOne.id,
    }, {
      activityReportId: report.id,
      goalId: ineligibleReportGoalTwo.id,
    }]);

    groupIneligibleForSimilarityForReportCount = [
      ineligibleReportGoalOne,
      ineligibleReportGoalTwo,
    ];

    const ineligibleResponseGoalOne = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitleFive,
      grantId: activeGrant.id,
    });

    const ineligibleResponseGoalTwo = await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      name: goalTitleFive,
      grantId: activeGrant.id,
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

    await GoalFieldResponse.bulkCreate([{
      goalTemplateFieldPromptId: prompt.id,
      goalId: ineligibleResponseGoalOne.id,
      response: [faker.datatype.string(100), faker.datatype.string(100)],
      onAR: false,
      onApprovedAR: false,
    }, {
      goalTemplateFieldPromptId: prompt.id,
      goalId: ineligibleResponseGoalTwo.id,
      response: [faker.datatype.string(100), faker.datatype.string(100)],
      onAR: false,
      onApprovedAR: false,
    }]);

    groupIneligibleForSimilarityViaResponse = [
      ineligibleResponseGoalOne,
      ineligibleResponseGoalTwo,
    ];
  });

  afterAll(async () => {
    const goals = [
      ...goalGroupOne,
      ...goalGroupTwo,
      ...goalGroupThree,
      ...groupIneligibleForSimilarityForReportCount,
      ...groupIneligibleForSimilarityViaResponse,
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

    await ActivityReportGoal.destroy({
      where: {
        goalId: goals.map((g) => g.id),
      },
      force: true,
    });

    await GoalFieldResponse.destroy({
      where: {
        goalId: goals.map((g) => g.id),
      },
      force: true,
    });

    await GoalSimilarityGroupGoal.destroy({
      where: {
        goalId: goals.map((g) => g.id),
      },
    });

    await Goal.destroy({
      where: {
        id: goals.map((g) => g.id),
      },
      force: true,
    });

    await GoalTemplateFieldPrompt.destroy({
      where: {
        goalTemplateId: template.id,
      },
      force: true,
    });

    await GoalTemplate.destroy({
      where: {
        id: template.id,
      },
      force: true,
    });

    await destroyReport(report);

    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
      force: true,
      individualHooks: true,
    });

    await GoalSimilarityGroup.destroy({
      where: {
        recipientId: [recipient.id, recipientTwo.id],
      },
    });

    await Recipient.destroy({
      where: {
        id: [...recipients.map((r) => r.id), recipientTwo.id],
      },
      force: true,
    });

    await sequelize.close();
  });

  afterEach(async () => {
    similarGoalsForRecipient.mockClear();

    const goals = [
      ...goalGroupOne,
      ...goalGroupTwo,
      ...goalGroupThree,
      ...groupIneligibleForSimilarityForReportCount,
      ...groupIneligibleForSimilarityViaResponse,
    ];

    await GoalSimilarityGroupGoal.destroy({
      where: {
        goalId: goals.map((g) => g.id),
      },
    });

    await GoalSimilarityGroup.destroy({
      where: {
        recipientId: [recipient.id, recipientTwo.id],
      },
    });
  });

  it('handles undefined response', async () => {
    similarGoalsForRecipient.mockResolvedValue(null);
    const idsSets = await getGoalIdsBySimilarity(recipientTwo.id);
    expect(idsSets).toHaveLength(1);
    expect(idsSets[0].goals).toHaveLength(0);
  });

  it('shapes the similarity response when the user does not have permission to merge closed curated goals', async () => {
    const similarityResponse = [
      goalGroupOne,
      goalGroupTwo,
      goalGroupThree,
      groupIneligibleForSimilarityForReportCount,
      groupIneligibleForSimilarityViaResponse,
    ].map((group) => ({
      id: group[0].id,
      name: group[0].name,
      matches: group.map((g) => ({
        id: g.id,
        name: g.name,
      })),
    }));

    similarGoalsForRecipient.mockResolvedValue({ result: similarityResponse });

    const idsSets = await getGoalIdsBySimilarity(recipient.id);

    // we expect goal group three to be eliminated, so we should have two sets + an empty
    expect(idsSets).toHaveLength(3);

    // we expect one empty set, removing it leaves two
    const filteredSet = idsSets.filter((set) => set.goals.length);
    expect(filteredSet).toHaveLength(2);

    // sort set by goals length descending
    filteredSet.sort((a, b) => b.goals.length - a.goals.length);

    const [setOne, setTwo] = filteredSet;

    expect(setOne.goals.length).toBe(4);
    expect(setTwo.goals.length).toBe(4);

    const goalIds = [...setOne.goals, ...setTwo.goals];

    const closedCuratedGoalsWithinSet = await Goal.findAll({
      where: {
        id: goalIds,
        status: GOAL_STATUS.CLOSED,
      },
      attributes: ['id', 'name', 'status', 'goalTemplateId'],
      include: [{
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: ['id', 'creationMethod'],
        where: {
          creationMethod: CREATION_METHOD.CURATED,
        },
      }],
    });

    expect(closedCuratedGoalsWithinSet).toHaveLength(0);

    // test to make sure that we don't double tap the similarity API
    expect(similarGoalsForRecipient).toHaveBeenCalledTimes(1);

    const theSetsAgain = await getGoalIdsBySimilarity(recipient.id);
    expect(similarGoalsForRecipient).toHaveBeenCalledTimes(1);

    expect(theSetsAgain).toEqual(idsSets);
  });

  it('shapes the similarity response when a user has the power to merge the closed', async () => {
    const similarityResponse = [
      goalGroupOne,
      goalGroupTwo,
      goalGroupThree,
      groupIneligibleForSimilarityForReportCount,
      groupIneligibleForSimilarityViaResponse,
    ].map((group) => ({
      id: group[0].id,
      name: group[0].name,
      matches: group.map((g) => ({
        id: g.id,
        name: g.name,
      })),
    }));

    similarGoalsForRecipient.mockResolvedValue({ result: similarityResponse });

    const user = {
      permissions: [],
      flags: ['closed_goal_merge_override'],
    };

    const idsSets = await getGoalIdsBySimilarity(recipient.id, user);

    // we expect goal group three to be eliminated, so we should have two sets + an empty
    expect(idsSets).toHaveLength(3);

    // we expect one empty set, removing it leaves two
    const filteredSet = idsSets.filter((set) => set.goals.length);
    expect(filteredSet).toHaveLength(2);

    // sort set by goals length descending
    filteredSet.sort((a, b) => b.goals.length - a.goals.length);

    const [setOne, setTwo] = filteredSet;

    expect(setOne.goals.length).toBe(5);
    expect(setTwo.goals.length).toBe(4);
  });

  describe('getReportCountForGoals', () => {
    it('tallies the goals/report count, inluding goals without reports', () => {
      const goals = [
        {
          grantId: 1,
          activityReportGoals: [
            {
              id: 1,
              activityReportId: 1,
              goalId: 1,
            },
            {
              id: 2,
              activityReportId: 2,
              goalId: 1,
            },
          ],
        },
        {
          grantId: 1,
          activityReportGoals: [
            {
              id: 3,
              activityReportId: 1,
              goalId: 2,
            },
            {
              id: 4,
              activityReportId: 3,
              goalId: 2,
            },
          ],
        },
        {},
      ];

      const counts = getReportCountForGoals(goals);

      expect(counts).toEqual({
        1: { 1: 2 },
        2: { 1: 1 },
        3: { 1: 1 },
      });

      expect(hasMultipleGoalsOnSameActivityReport(counts)).toBe(true);

      expect(hasMultipleGoalsOnSameActivityReport(getReportCountForGoals([{
        activityReportGoals: [
          {
            id: 3,
            activityReportId: 1,
            goalId: 2,
          },
          {
            id: 4,
            activityReportId: 3,
            goalId: 2,
          },
        ],
      }, {
        activityReportGoals: [
          {
            id: 5,
            activityReportId: 4,
            goalId: 3,
          },
          {
            id: 6,
            activityReportId: 5,
            goalId: 3,
          },
        ],
      }]))).toBe(false);
    });
  });
});
