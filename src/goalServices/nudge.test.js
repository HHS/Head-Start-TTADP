import db from '../models';
import nudge, { determineSimilarityAlpha } from './nudge';
import { GOAL_STATUS } from '../constants';
import { similarGoalsForRecipient } from '../services/similarity';
import { createGoal, createGrant, createRecipient } from '../testUtils';

const { Goal, Grant, Recipient } = db;

jest.mock('../services/similarity', () => ({
  similarGoalsForRecipient: jest.fn(),
}));

/**
 * writing this test with the expectation that the seed data is present
 *
 */
describe('nudge', () => {
  let recipient;
  let grant;
  let goal;

  beforeAll(async () => {
    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id });
    goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.NOT_STARTED });
  });

  afterAll(async () => {
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await db.sequelize.close();
  });

  it('should return a nudge', async () => {
    const goalName = goal.name;
    const goalId = goal.id;
    const { goalTemplateId } = goal;

    const grantNumber = grant.number;
    const recipientId = recipient.id;
    const grantId = grant.id;

    const curatedName = '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)';
    const templateId = 1;

    similarGoalsForRecipient.mockReturnValueOnce({
      result: [
        {
          goal: {
            grantId,
            id: goalId,
            name: goalName,
            isTemplate: false,
          },
          similarity: 0.8,
        },
        {
          goal: {
            id: templateId,
            name: curatedName,
            isTemplate: true,
            source: 'Regional office priority',
            endDate: '',
          },
          similarity: 0.7,
        },
      ],
    });

    const results = await nudge(recipientId, 'It does not matter what this is', [grantNumber]);

    // sort results by name
    results.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });

    expect(results).toEqual([
      {
        ids: [templateId],
        name: curatedName,
        status: GOAL_STATUS.NOT_STARTED,
        goalTemplateId: templateId,
        isCuratedTemplate: true,
        endDate: '',
        source: 'Regional office priority',
        closeSuspendReasons: [null],
      },
      {
        ids: [goalId],
        name: goalName,
        status: GOAL_STATUS.NOT_STARTED,
        isCuratedTemplate: false,
        goalTemplateId,
        closeSuspendReasons: [null],
      },
    ]);
  });

  describe('determineSimilarityAlpha', () => {
    it('returns a minimum value of 0.5', () => {
      const alpha = determineSimilarityAlpha(1);
      expect(alpha).toBe(0.5);
    });

    it('returns a maximum value of 0.9', () => {
      const alpha = determineSimilarityAlpha(20);
      expect(alpha).toBe(0.9);
    });

    it('otherwise, it returns a value of numberOfWords/10', () => {
      const alpha = determineSimilarityAlpha(6);
      expect(alpha).toBe(0.6);
    });
  });
});
