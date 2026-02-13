import { INTERNAL_SERVER_ERROR } from 'http-codes'
import {
  getGoalTemplates,
  getSource,
  getPrompts,
  getOptionsByPromptName,
  getStandardGoal,
  useStandardGoal,
  updateStandardGoal,
  getStandardGoalsByRecipientId,
} from './handlers'
import {
  getCuratedTemplates,
  getSourceFromTemplate,
  getFieldPromptsForCuratedTemplate,
  getFieldPromptsForActivityReports,
  getOptionsByGoalTemplateFieldPromptName,
} from '../../services/goalTemplates'
import { goalForRtr, newStandardGoal, updateExistingStandardGoal, standardGoalsForRecipient } from '../../services/standardGoals'
import { GOAL_STATUS } from '../../constants'

jest.mock('../../services/goalTemplates')
jest.mock('../../services/standardGoals')

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
    send: jest.fn(),
  })),
}

describe('goalTemplates handlers', () => {
  describe('getStandardGoal', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        query: {},
      }

      const goal = { id: 1, name: 'Goal 1' }
      goalForRtr.mockResolvedValue(goal)

      await getStandardGoal(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(goal)
    })

    it('uses status from query', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        query: {
          status: GOAL_STATUS.NOT_STARTED,
        },
      }

      const goal = { id: 1, name: 'Goal 1' }
      goalForRtr.mockResolvedValue(goal)

      await getStandardGoal(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(goal)
    })

    it('handles errors', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
          grantId: 1,
        },
        query: {
          status: GOAL_STATUS.NOT_STARTED,
        },
      }

      goalForRtr.mockRejectedValue(new Error('error'))

      await getStandardGoal(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })
  })

  describe('useStandardGoal', () => {
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
      }

      const goal = { id: 1, name: 'Goal 1' }
      newStandardGoal.mockResolvedValue(goal)

      await useStandardGoal(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(goal)
    })

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
      }

      newStandardGoal.mockRejectedValue(new Error('error'))

      await useStandardGoal(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })
  })

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
      }

      const goals = [{ id: 1, name: 'Goal 1' }]
      standardGoalsForRecipient.mockResolvedValue(goals)

      await getStandardGoalsByRecipientId(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(goals)
    })

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
      }

      standardGoalsForRecipient.mockRejectedValue(new Error('error'))

      await getStandardGoalsByRecipientId(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })
  })

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
      }

      const goal = { id: 1, name: 'Goal 1' }
      updateExistingStandardGoal.mockResolvedValue(goal)

      await updateStandardGoal(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(goal)
    })

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
      }

      updateExistingStandardGoal.mockRejectedValue(new Error('error'))

      await updateStandardGoal(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })
  })

  describe('getSource', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          grantIds: [1],
        },
      }

      getSourceFromTemplate.mockResolvedValue('RTTAPA Development')

      await getSource(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith({ source: 'RTTAPA Development' })
    })
    it('handles null source', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          grantIds: [1],
        },
      }

      getSourceFromTemplate.mockResolvedValue(undefined)

      await getSource(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith({ source: '' })
    })
  })
  it('handles error', async () => {
    const req = {
      params: {
        goalTemplateId: 1,
      },
      query: {
        grantIds: [1],
      },
    }

    getSourceFromTemplate.mockRejectedValue(new Error('error'))

    await getSource(req, mockResponse)

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
  })

  describe('getGoalTemplates', () => {
    it('handles success', async () => {
      const req = {
        query: {
          grantIds: '1,2,3',
        },
      }

      const templates = [{ id: 1, name: 'Template 1' }]
      getCuratedTemplates.mockResolvedValue(templates)

      await getGoalTemplates(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(templates)
    })

    it('handles error', async () => {
      const req = {
        query: {
          grantIds: '1,2,3',
        },
      }

      getCuratedTemplates.mockRejectedValue(new Error('error'))

      await getGoalTemplates(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })
  })

  describe('getPrompts', () => {
    it('handles success', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          goalIds: '1,2,3',
        },
      }

      const prompts = [{ id: 1, prompt: 'Prompt 1' }]
      getFieldPromptsForCuratedTemplate.mockResolvedValue(prompts)

      await getPrompts(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith([prompts, null])
    })

    it('handles error', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          goalIds: '1,2,3',
        },
      }

      getFieldPromptsForCuratedTemplate.mockRejectedValue(new Error('error'))

      await getPrompts(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })

    it('correctly calls getFieldPromptsForActivityReports when the parameter is true', async () => {
      const req = {
        params: {
          goalTemplateId: 1,
        },
        query: {
          goalIds: '1,2,3',
          isForActivityReport: true,
        },
      }

      const prompts = [[{ id: 1, prompt: 'Prompt 1' }], []]
      getFieldPromptsForActivityReports.mockResolvedValue(prompts)

      await getPrompts(req, mockResponse)
      expect(mockResponse.json).toHaveBeenCalledWith(prompts)
    })
  })

  describe('getOptionsByPromptName', () => {
    it('handles success', async () => {
      const req = {
        query: {
          name: 'promptName',
        },
      }

      const options = [{ id: 1, option: 'Option 1' }]
      getOptionsByGoalTemplateFieldPromptName.mockResolvedValue(options)

      await getOptionsByPromptName(req, mockResponse)

      expect(mockResponse.json).toHaveBeenCalledWith(options)
    })

    it('handles error', async () => {
      const req = {
        query: {
          name: 'promptName',
        },
      }

      getOptionsByGoalTemplateFieldPromptName.mockRejectedValue(new Error('error'))

      await getOptionsByPromptName(req, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR)
    })
  })
})
