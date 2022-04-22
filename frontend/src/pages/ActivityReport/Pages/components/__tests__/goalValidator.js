import {
  unfinishedObjectives,
  unfinishedGoals,
  validateGoals,
  GOALS_EMPTY,
  UNFINISHED_OBJECTIVES,
  GOAL_MISSING_OBJECTIVE,
} from '../goalValidator';

const missingTitle = {
  title: '',
  ttaProvided: 'ttaProvided',
  topics: ['Coaching'],
  resources: ['Resource'],
  roles: ['Central Office'],
};

const missingTTAProvided = {
  title: 'missing tta',
  ttaProvided: '<p></p>',
  topics: ['Coaching'],
  resources: ['Resource'],
  roles: ['Central Office'],
};

const validObjective = {
  title: 'title',
  ttaProvided: 'ttaProvided',
  topics: ['Coaching'],
  resources: ['Resource'],
  roles: ['Central Office'],
};

const goalUnfinishedObjective = {
  name: 'Goal name',
  objectives: [
    { ...validObjective },
    { ...missingTTAProvided },
  ],
};

const goalNoObjectives = {
  name: 'Goal name',
  objectives: [],
};

const goalValid = {
  name: 'Goal name',
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

        const result = unfinishedObjectives(objectives);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
      });

      it('if one objective has "ttaProvided" undefined', () => {
        const objectives = [
          { ...missingTTAProvided },
          { ...validObjective },
        ];

        const result = unfinishedObjectives(objectives);
        expect(result).toEqual(UNFINISHED_OBJECTIVES);
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
