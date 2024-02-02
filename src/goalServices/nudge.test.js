import nudge, { determineSimilarityAlpha } from './nudge';
import { GOAL_STATUS } from '../constants';
import { similarGoalsForRecipient } from '../services/similarity';

jest.mock('../services/similarity', () => ({
  similarGoalsForRecipient: jest.fn(),
}));

/**
 * writing this test with the expectation that the seed data is present
 *
 */
describe('nudge', () => {
  it('should return a nudge', async () => {
    const goalName = 'Identify strategies to support Professional Development with an emphasis on Staff Wellness and Social Emotional Development.';
    const goalId = 1;
    const grantNumber = '14CH1234';
    const goalTemplateId = 2;
    const recipientId = 1;
    const grantId = 1;

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
      },
      {
        ids: [goalId],
        name: goalName,
        status: GOAL_STATUS.NOT_STARTED,
        isCuratedTemplate: false,
        goalTemplateId,
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
