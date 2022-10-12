import {
  unfinishedObjectives,
  unfinishedGoals,
  validateGoals,
  GOALS_EMPTY,
  UNFINISHED_OBJECTIVES,
  GOAL_MISSING_OBJECTIVE,
  OBJECTIVE_TOPICS,
  OBJECTIVE_ROLE,
  OBJECTIVE_TITLE,
  OBJECTIVE_TTA,
  OBJECTIVE_RESOURCES,
} from '../goalValidator';
import {
  GOAL_NAME_ERROR,
} from '../../../../../components/GoalForm/constants';

const missingTitle = {
  title: '',
  ttaProvided: 'ttaProvided',
  topics: ['Hello'],
  resources: [],
  roles: ['Chief Inspector'],
};

const missingTTAProvided = {
  title: 'title',
  ttaProvided: '<p></p>',
  topics: ['Hello'],
  resources: [],
  roles: ['Chief Inspector'],
};

const validObjective = {
  title: 'title',
  ttaProvided: 'ttaProvided',
  topics: ['Hello'],
  resources: [],
  roles: ['Chief Inspector'],
};

const goalUnfinishedObjective = {
  name: 'Test goal',
  endDate: '2021-01-01',
  isRttapa: 'no',
  objectives: [
    { ...validObjective },
    { ...missingTTAProvided },
  ],
};

const goalNoObjectives = {
  name: 'Test goal',
  endDate: '2021-01-01',
  isRttapa: 'no',
  objectives: [],
};

const goalValid = {
  name: 'Test goal',
  endDate: '2021-01-01',
  isRttapa: 'no',
  objectives: [
    { ...validObjective },
    { ...validObjective },
  ],
};

describe('validateGoals', () => {
  describe('unfinishedObjectives', () => {
    describe('returns invalid', () => {
      it('if one objective has "title" undefined', () => {
        const objectives = [
          { ...missingTitle },
          { ...validObjective },
        ];

        const setError = jest.fn();
        const result = unfinishedObjectives(objectives, setError);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${0}].title`, { message: OBJECTIVE_TITLE });
      });

      it('if one objective has "ttaProvided" undefined', () => {
        const objectives = [
          { ...missingTTAProvided },
          { ...validObjective },
        ];

        const setError = jest.fn();
        const result = unfinishedObjectives(objectives, setError);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${0}].ttaProvided`, { message: OBJECTIVE_TTA });
      });

      it('if one objective has no "topics"', () => {
        const objectives = [
          { ...validObjective },
          { ...validObjective, topics: [] },
        ];

        const setError = jest.fn();
        const result = unfinishedObjectives(objectives, setError);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].topics`, { message: OBJECTIVE_TOPICS });
      });

      it('if one objective has no "roles"', () => {
        const objectives = [
          { ...validObjective },
          { ...validObjective, roles: [] },
        ];

        const setError = jest.fn();
        const result = unfinishedObjectives(objectives, setError);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].roles`, { message: OBJECTIVE_ROLE });
      });

      it('if one objective has invalid "resources"', () => {
        const objectives = [
          { ...validObjective },
          { ...validObjective, resources: [{ value: '234runwf78n' }] },
        ];

        const setError = jest.fn();
        const result = unfinishedObjectives(objectives, setError);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
        expect(setError).toHaveBeenCalledWith(`goalForEditing.objectives[${1}].resources`, { message: OBJECTIVE_RESOURCES });
      });
    });

    describe('returns false', () => {
      it('if "ttaProvided" and "title" are defined for every objective and every goal has at least one objective', () => {
        const objectives = [
          { ...validObjective },
          { ...validObjective },
        ];

        const result = unfinishedObjectives(objectives);
        expect(result).toEqual(false);
      });
    });
  });

  describe('unfinishedGoals', () => {
    describe('returns invalid', () => {
      it('if one goal has no name', () => {
        const goals = [
          { ...goalValid, name: null, endDate: new Date('09/06/2022') },
        ];
        const setError = jest.fn();
        unfinishedGoals(goals, setError);
        expect(setError).toHaveBeenCalledWith('goalName', { message: GOAL_NAME_ERROR });
      });
      it('if one goal has no objectives', () => {
        const goals = [
          { ...goalValid },
          { ...goalNoObjectives },
        ];

        const result = unfinishedGoals(goals);
        expect(result).toEqual(GOAL_MISSING_OBJECTIVE);
      });

      it('if one objective is unfinished', () => {
        const goals = [
          { ...goalValid },
          { ...goalUnfinishedObjective },
        ];

        const result = unfinishedGoals(goals);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
      });
    });

    describe('returns false', () => {
      it('if all objectives are finished and all goals have at least one objective', () => {
        const goals = [
          { ...goalValid },
          { ...goalValid },
        ];

        const result = unfinishedGoals(goals);
        expect(result).toEqual(false);
      });
    });
  });

  describe('validateGoals', () => {
    describe('returns invalid', () => {
      it('if there are zero goals', () => {
        const goals = [];
        const result = validateGoals(goals);
        expect(result).toEqual(GOALS_EMPTY);
      });

      it('if one goal is unfinished', () => {
        const goals = [
          { ...goalValid },
          { ...goalNoObjectives },
        ];

        const result = validateGoals(goals);
        expect(result).toEqual(GOAL_MISSING_OBJECTIVE);
      });

      it('if one objective is unfinished', () => {
        const goals = [
          { ...goalValid },
          { ...goalUnfinishedObjective },
        ];

        const result = validateGoals(goals);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
      });
    });

    describe('returns true', () => {
      it('if all goals are finished and there is at least one goal', () => {
        const goals = [
          { ...goalValid },
          { ...goalValid },
        ];

        const result = validateGoals(goals);
        expect(result).toEqual(true);
      });
    });
  });
});
