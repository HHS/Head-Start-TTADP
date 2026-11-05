import { INTERNAL_SERVER_ERROR } from 'http-codes';
import { GOAL_STATUS } from '../../constants';
import { goalRegionsById } from '../../goalServices/goals';
import SCOPES from '../../middleware/scopeConstants';
import { getUserReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  getCuratedTemplates,
  getFieldPromptsForActivityReports,
  getFieldPromptsForCuratedTemplate,
  getOptionsByGoalTemplateFieldPromptName,
  getSourceFromTemplate,
} from '../../services/goalTemplates';
import {
  goalForRtr,
  newStandardGoal,
  standardGoalsForRecipient,
  updateExistingStandardGoal,
} from '../../services/standardGoals';
import { userById } from '../../services/users';
import {
  getGoalTemplates,
  getOptionsByPromptName,
  getPrompts,
  getSource,
  getStandardGoal,
  getStandardGoalsByRecipientId,
  updateStandardGoal,
  useStandardGoal,
} from './handlers';

jest.mock('../../goalServices/goals');
jest.mock('../../services/accessValidation');
jest.mock('../../services/goalTemplates');
jest.mock('../../services/standardGoals');
jest.mock('../../services/currentUser');
jest.mock('../../services/users');

let mockResponse;
let mockStatusJson;

const createMockResponse = () => {
  const response = {
    attachment: jest.fn(),
    end: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(),
    locals: {},
  };
  response.status.mockReturnValue(response);
  return response;
};

describe('goalTemplates handlers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockResponse = createMockResponse();
    mockStatusJson = mockResponse.json;
  });

  describe('getStandardGoal', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        query: {},
      };

      const goal = { id: 1, name: 'Goal 1' };
      goalForRtr.mockResolvedValue(goal);

      await getStandardGoal(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(goal);
    });

    it('uses status from query', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        query: {
          status: GOAL_STATUS.NOT_STARTED,
        },
      };

      const goal = { id: 1, name: 'Goal 1' };
      goalForRtr.mockResolvedValue(goal);

      await getStandardGoal(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(goal);
    });

    it('handles errors', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        query: {
          status: GOAL_STATUS.NOT_STARTED,
        },
      };

      goalForRtr.mockRejectedValue(new Error('error'));

      await getStandardGoal(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('useStandardGoal', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        session: { userId: 42 },
        body: {
          objectives: [],
          rootCauses: [],
        },
      };

      const goal = { id: 1, name: 'Goal 1' };
      currentUserId.mockResolvedValue(42);
      newStandardGoal.mockResolvedValue(goal);

      await useStandardGoal(req, mockResponse);

      expect(newStandardGoal).toHaveBeenCalledWith(1, 1, [], [], undefined, { userId: 42 });
      expect(mockResponse.json).toHaveBeenCalledWith(goal);
    });

    it('handles errors', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        body: {
          objectives: [],
          rootCauses: [],
        },
      };

      currentUserId.mockResolvedValue(42);
      newStandardGoal.mockRejectedValue(new Error('error'));

      await useStandardGoal(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });

    it.each([
      [
        'STANDARD_GOAL_ON_ACTIVITY_REPORT',
        {
          blockingActivityReports: [
            {
              displayId: 'R14-AR-67433',
              creatorName: 'Annika Lewis, GS',
              href: '/activity-reports/123',
            },
          ],
          code: 'STANDARD_GOAL_ON_ACTIVITY_REPORT',
        },
      ],
      [
        'STANDARD_GOAL_ALREADY_USED',
        {
          code: 'STANDARD_GOAL_ALREADY_USED',
        },
      ],
    ])('returns structured %s conflicts from the service', async (_code, responseBody) => {
      currentUserId.mockResolvedValue(42);
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        body: {
          objectives: [],
          rootCauses: [],
        },
      };
      newStandardGoal.mockRejectedValue(
        Object.assign(new Error('Standard goal conflict'), {
          statusCode: 409,
          responseBody,
        })
      );

      await useStandardGoal(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockStatusJson).toHaveBeenCalledWith(responseBody);
    });
  });

  describe('getStandardGoalsByRecipientId', () => {
    it('handles success', async () => {
      const req = {
        params: {
          regionId: 1,
          recipientId: 1,
        },
        query: {
          limit: 10,
          offset: 0,
          sortBy: 'createdAt',
          sortDir: 'desc',
        },
      };

      const goals = [{ id: 1, name: 'Goal 1' }];
      standardGoalsForRecipient.mockResolvedValue(goals);

      await getStandardGoalsByRecipientId(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(goals);
    });

    it('handles errors', async () => {
      const req = {
        params: {
          regionId: 1,
          recipientId: 1,
        },
        query: {
          limit: 10,
          offset: 0,
          sortBy: 'createdAt',
          sortDir: 'desc',
        },
      };

      standardGoalsForRecipient.mockRejectedValue(new Error('error'));

      await getStandardGoalsByRecipientId(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateStandardGoal', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        body: {
          objectives: [],
          rootCauses: [],
        },
      };

      const goal = { id: 1, name: 'Goal 1' };
      updateExistingStandardGoal.mockResolvedValue(goal);

      await updateStandardGoal(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(goal);
    });

    it('handles errors', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        body: {
          objectives: [],
          rootCauses: [],
        },
      };

      updateExistingStandardGoal.mockRejectedValue(new Error('error'));

      await updateStandardGoal(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('getSource', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          grantIds: [1],
        },
      };

      getSourceFromTemplate.mockResolvedValue('RTTAPA Development');

      await getSource(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({ source: 'RTTAPA Development' });
    });
    it('handles null source', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          grantIds: [1],
        },
      };

      getSourceFromTemplate.mockResolvedValue(undefined);

      await getSource(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({ source: '' });
    });
  });
  it('handles error', async () => {
    const req = {
      params: {
        goalTemplateId: 1,
      },
      query: {
        grantIds: [1],
      },
    };

    getSourceFromTemplate.mockRejectedValue(new Error('error'));

    await getSource(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });

  describe('getGoalTemplates', () => {
    it('does not enrich templates when both flags are omitted', async () => {
      const req = {
        query: {
          grantIds: ['1', '2', '3'],
        },
      };

      const templates = [{ id: 1, name: 'Template 1' }];
      getCuratedTemplates.mockResolvedValue(templates);

      await getGoalTemplates(req, mockResponse);

      expect(getCuratedTemplates).toHaveBeenCalledWith([1, 2, 3], {
        includeBlockingActivityReports: false,
        includeClosedAndSuspendedGoals: false,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(templates);
    });

    it('treats explicit false query values as false', async () => {
      const req = {
        query: {
          grantIds: '1',
          includeBlockingActivityReports: 'false',
          includeClosedSuspendedGoals: 'false',
        },
      };
      getCuratedTemplates.mockResolvedValue([]);

      await getGoalTemplates(req, mockResponse);

      expect(getCuratedTemplates).toHaveBeenCalledWith([1], {
        includeBlockingActivityReports: false,
        includeClosedAndSuspendedGoals: false,
      });
      expect(currentUserId).not.toHaveBeenCalled();
    });

    it('opts into blocking report enrichment with the current user', async () => {
      const req = {
        query: {
          grantIds: '1',
          includeBlockingActivityReports: 'true',
          includeClosedSuspendedGoals: 'true',
        },
      };
      currentUserId.mockResolvedValue(42);
      getCuratedTemplates.mockResolvedValue([]);

      await getGoalTemplates(req, mockResponse);

      expect(currentUserId).toHaveBeenCalledWith(req, mockResponse);
      expect(getCuratedTemplates).toHaveBeenCalledWith([1], {
        includeBlockingActivityReports: true,
        includeClosedAndSuspendedGoals: true,
        userId: 42,
      });
    });

    it('handles error', async () => {
      const req = {
        query: {
          grantIds: '1,2,3',
        },
      };

      getCuratedTemplates.mockRejectedValue(new Error('error'));

      await getGoalTemplates(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('getPrompts', () => {
    beforeEach(() => {
      goalRegionsById.mockResolvedValue([1]);
      getUserReadRegions.mockResolvedValue([1]);
      userById.mockResolvedValue({
        permissions: [{ regionId: 1, scopeId: SCOPES.READ_REPORTS }],
      });
    });

    it('lets an administrator without regional report permissions read any region', async () => {
      userById.mockResolvedValue({ permissions: [{ regionId: 14, scopeId: SCOPES.ADMIN }] });
      getUserReadRegions.mockResolvedValue([]);
      goalRegionsById.mockResolvedValue([2]);
      getFieldPromptsForCuratedTemplate.mockResolvedValue(['curated']);
      await getPrompts(
        { params: { goalTemplateId: '1' }, query: { goalIds: '20', isForActivityReport: 'false' } },
        mockResponse
      );
      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
      expect(getFieldPromptsForCuratedTemplate).toHaveBeenCalledWith(1, [20]);
      expect(mockResponse.json).toHaveBeenCalledWith([['curated'], null]);
    });

    it('still rejects a user without the administrator permission', async () => {
      getUserReadRegions.mockResolvedValue([]);
      goalRegionsById.mockResolvedValue([2]);
      await getPrompts({ params: { goalTemplateId: '1' }, query: { goalIds: '20' } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      expect(getFieldPromptsForCuratedTemplate).not.toHaveBeenCalled();
    });

    it.each(['false', 'true', undefined])(
      'authorizes all goal regions before reading prompts (%s)',
      async (flag) => {
        goalRegionsById.mockResolvedValue([1, 2]);
        const req = {
          params: { goalTemplateId: '1' },
          query: { goalIds: ['10', '20'], isForActivityReport: flag },
        };
        await getPrompts(req, mockResponse);
        expect(goalRegionsById).toHaveBeenCalledWith([10, 20]);
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
        expect(getFieldPromptsForActivityReports).not.toHaveBeenCalled();
        expect(getFieldPromptsForCuratedTemplate).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
      }
    );

    it('rejects access when every goal is in another region', async () => {
      goalRegionsById.mockResolvedValue([2]);
      await getPrompts({ params: { goalTemplateId: '1' }, query: { goalIds: '20' } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('uses the curated branch for the string false', async () => {
      getFieldPromptsForCuratedTemplate.mockResolvedValue(['curated']);
      await getPrompts(
        { params: { goalTemplateId: '1' }, query: { goalIds: '10', isForActivityReport: 'false' } },
        mockResponse
      );
      expect(getFieldPromptsForCuratedTemplate).toHaveBeenCalledWith(1, [10]);
      expect(getFieldPromptsForActivityReports).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith([['curated'], null]);
    });

    it('returns template prompts when no goals are selected', async () => {
      await getPrompts({ params: { goalTemplateId: '1' }, query: {} }, mockResponse);
      expect(goalRegionsById).not.toHaveBeenCalled();
      expect(getFieldPromptsForCuratedTemplate).toHaveBeenCalledWith(1, []);
    });

    it('rejects goals without a resolvable region', async () => {
      goalRegionsById.mockResolvedValue([]);
      await getPrompts({ params: { goalTemplateId: '1' }, query: { goalIds: '20' } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
      expect(getFieldPromptsForCuratedTemplate).not.toHaveBeenCalled();
    });

    it.each([
      { goalIds: '1junk' },
      { goalIds: ['1', 'bad'] },
      { goalIds: '-1' },
      { goalIds: { value: '1' } },
      { isForActivityReport: 'yes' },
      { isForActivityReport: ['true', 'false'] },
    ])('rejects malformed query parameters: %j', async (query) => {
      await getPrompts({ params: { goalTemplateId: '1' }, query }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
      expect(getFieldPromptsForActivityReports).not.toHaveBeenCalled();
      expect(getFieldPromptsForCuratedTemplate).not.toHaveBeenCalled();
    });

    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          goalIds: ['1', '2', '3'],
        },
      };

      const prompts = [{ id: 1, prompt: 'Prompt 1' }];
      getFieldPromptsForCuratedTemplate.mockResolvedValue(prompts);

      await getPrompts(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith([prompts, null]);
    });

    it('handles error', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          goalIds: ['1', '2', '3'],
        },
      };

      getFieldPromptsForCuratedTemplate.mockRejectedValue(new Error('error'));

      await getPrompts(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });

    it('correctly calls getFieldPromptsForActivityReports when the parameter is true', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          goalIds: ['1', '2', '3'],
          isForActivityReport: 'true',
        },
      };

      const prompts = [[{ id: 1, prompt: 'Prompt 1' }], []];
      getFieldPromptsForActivityReports.mockResolvedValue(prompts);

      await getPrompts(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(prompts);
    });
  });

  describe('getOptionsByPromptName', () => {
    it('handles success', async () => {
      const req = {
        query: {
          name: 'promptName',
        },
      };

      const options = [{ id: 1, option: 'Option 1' }];
      getOptionsByGoalTemplateFieldPromptName.mockResolvedValue(options);

      await getOptionsByPromptName(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(options);
    });

    it('handles error', async () => {
      const req = {
        query: {
          name: 'promptName',
        },
      };

      getOptionsByGoalTemplateFieldPromptName.mockRejectedValue(new Error('error'));

      await getOptionsByPromptName(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });
});
