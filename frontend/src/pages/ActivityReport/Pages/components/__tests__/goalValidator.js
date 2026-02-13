import { SUPPORT_TYPES } from '@ttahub/common'
import {
  unfinishedObjectives,
  unfinishedGoals,
  validateGoals,
  GOALS_EMPTY,
  UNFINISHED_OBJECTIVES,
  GOAL_MISSING_OBJECTIVE,
  OBJECTIVE_TOPICS,
  OBJECTIVE_CITATIONS,
  OBJECTIVE_TITLE,
  OBJECTIVE_TTA,
  OBJECTIVE_RESOURCES,
  validatePrompts,
  validateOnlyWithFlag,
  OBJECTIVE_COURSES,
  OBJECTIVE_FILES,
} from '../goalValidator'
import { GOAL_NAME_ERROR } from '../../../../../components/GoalForm/constants'

const missingTitle = {
  title: '',
  ttaProvided: 'ttaProvided',
  topics: ['Hello'],
  resources: [],
}

const missingTTAProvided = {
  title: 'title',
  ttaProvided: '<p></p>',
  topics: ['Hello'],
  resources: [],
}

const validObjective = {
  title: 'title',
  ttaProvided: 'ttaProvided',
  topics: ['Hello'],
  resources: [],
  supportType: SUPPORT_TYPES[1],
}

const missingSupportType = {
  ...validObjective,
  supportType: '',
}

const goalUnfinishedObjective = {
  name: 'Test goal',
  endDate: '2021-01-01',
  isRttapa: 'No',
  source: 'source',
  objectives: [{ ...validObjective }, { ...missingTTAProvided }],
}

const goalNoObjectives = {
  name: 'Test goal',
  endDate: '2021-01-01',
  isRttapa: 'No',
  source: 'source',
  objectives: [],
}

const goalValid = {
  name: 'Test goal',
  endDate: '2021-01-01',
  isRttapa: 'No',
  source: 'Source',
  objectives: [{ ...validObjective }, { ...validObjective }],
}

describe('validateGoals', () => {
  describe('unfinishedObjectives', () => {
    describe('returns invalid', () => {
      it('if one objective has "title" undefined', () => {
        const objectives = [{ ...missingTitle }, { ...validObjective }]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${0}].title`, { message: OBJECTIVE_TITLE })
      })

      it('if one objective has "ttaProvided" undefined', () => {
        const objectives = [{ ...missingTTAProvided }, { ...validObjective }]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${0}].ttaProvided`, { message: OBJECTIVE_TTA })
      })

      it('if one objective has no "topics"', () => {
        const objectives = [{ ...validObjective }, { ...validObjective, topics: [] }]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].topics`, { message: OBJECTIVE_TOPICS })
      })

      it('if one objective has no "citations"', () => {
        const objectives = [{ ...validObjective }, { ...validObjective, citations: [] }]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError, 'goalForEditing.objectives', true)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${0}].citations`, { message: OBJECTIVE_CITATIONS })
      })

      it('if one objective has no "supportType"', () => {
        const objectives = [{ ...validObjective }, missingSupportType]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].supportType`, { message: 'Select a support type' })
      })

      it('if one objective has invalid "resources"', () => {
        const objectives = [{ ...validObjective }, { ...validObjective, resources: [{ value: '234runwf78n' }] }]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].resources`, { message: OBJECTIVE_RESOURCES })
      })

      it('if one objective is set to use IPD courses but has none selected', () => {
        const objectives = [
          { ...validObjective },
          {
            ...validObjective,
            useIpdCourses: true,
            courses: [],
          },
        ]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].courses`, { message: OBJECTIVE_COURSES })
      })

      it('if one objective is set to use files but has none uploaded', () => {
        const objectives = [
          { ...validObjective },
          {
            ...validObjective,
            useFiles: true,
            files: [],
          },
        ]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives, setError)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].files`, { message: OBJECTIVE_FILES })
      })

      it("doesn't die if there is no setError", () => {
        const objectives = [{ ...validObjective }, { ...validObjective, resources: [{ value: '234runwf78n' }] }]

        const setError = jest.fn()
        const result = unfinishedObjectives(objectives)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
        expect(setError).not.toHaveBeenCalled()
      })
    })

    describe('returns false', () => {
      it('if "ttaProvided" and "title" are defined for every objective and every goal has at least one objective', () => {
        const objectives = [
          { ...validObjective },
          {
            ...validObjective,
            useIpdCourses: true,
            courses: [{ id: 1 }],
            useFiles: true,
            files: [{ id: 1 }],
          },
        ]

        const result = unfinishedObjectives(objectives)
        expect(result).toEqual(false)
      })
    })
  })

  describe('unfinishedGoals', () => {
    describe('returns invalid', () => {
      it('if one goal has no name', () => {
        const goals = [{ ...goalValid, name: null, endDate: new Date('09/06/2022') }]
        const setError = jest.fn()
        unfinishedGoals(goals, setError)
        expect(setError).toHaveBeenCalledWith('goalName', { message: GOAL_NAME_ERROR })
      })

      it('if one goal has no objectives', () => {
        const goals = [{ ...goalValid }, { ...goalNoObjectives }]

        const result = unfinishedGoals(goals)
        expect(result).toEqual(GOAL_MISSING_OBJECTIVE)
      })

      it('if one objective is unfinished', () => {
        const goals = [{ ...goalValid }, { ...goalUnfinishedObjective }]

        const result = unfinishedGoals(goals)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
      })
    })

    describe('returns false', () => {
      it('if all objectives are finished and all goals have at least one objective', () => {
        const goals = [{ ...goalValid }, { ...goalValid }]

        const result = unfinishedGoals(goals)
        expect(result).toEqual(false)
      })
    })
  })

  describe('validatePrompts', () => {
    it('returns true if no prompts', async () => {
      const trigger = jest.fn(() => true)
      const prompts = []
      const result = await validatePrompts(prompts, trigger)
      expect(result).toBeTruthy()
    })

    it('returns true if prompts are undefined', async () => {
      const trigger = jest.fn(() => true)
      const prompts = undefined
      const result = await validatePrompts(prompts, trigger)
      expect(result).toBeTruthy()
    })

    it('returns the result of trigger when true', async () => {
      const trigger = jest.fn(() => true)
      const prompts = [{ trigger: 'trigger', prompt: 'prompt' }]
      const result = await validatePrompts(prompts, trigger)
      expect(result).toBeTruthy()
    })

    it('returns the result of trigger when false', async () => {
      const trigger = jest.fn(() => false)
      const prompts = [{ trigger: 'trigger', prompt: 'prompt' }]
      const result = await validatePrompts(prompts, trigger)
      expect(result).toBeFalsy()
    })
  })

  describe('validateGoals', () => {
    describe('returns invalid', () => {
      it('if there are zero goals', () => {
        const goals = []
        const result = validateGoals(goals)
        expect(result).toEqual(GOALS_EMPTY)
      })

      it('if one goal is unfinished', () => {
        const goals = [{ ...goalValid }, { ...goalNoObjectives }]

        const result = validateGoals(goals)
        expect(result).toEqual(GOAL_MISSING_OBJECTIVE)
      })

      it('if one objective is unfinished', () => {
        const goals = [{ ...goalValid }, { ...goalUnfinishedObjective }]

        const result = validateGoals(goals)
        expect(result).toEqual(UNFINISHED_OBJECTIVES)
      })
    })

    describe('returns true', () => {
      it('if all goals are finished and there is at least one goal', () => {
        const goals = [{ ...goalValid }, { ...goalValid }]

        const result = validateGoals(goals)
        expect(result).toEqual(true)
      })
    })
  })

  describe('validateOnlyWithFlag', () => {
    it('returns true if no flags on user', () => {
      const result = validateOnlyWithFlag({}, 'flag', false)
      expect(result).toEqual(true)
    })
    it('returns true if user does not have flag', () => {
      const result = validateOnlyWithFlag({ flags: [] }, 'flag', false)
      expect(result).toEqual(true)
    })
    it('returns true if flag is valid', () => {
      const result = validateOnlyWithFlag({ flags: ['flag'] }, 'flag', 1)
      expect(result).toEqual(true)
    })
    it('returns false if flag is invalid', () => {
      const result = validateOnlyWithFlag({ flags: ['flag'] }, 'flag', false)
      expect(result).toEqual(false)
    })
  })
})
