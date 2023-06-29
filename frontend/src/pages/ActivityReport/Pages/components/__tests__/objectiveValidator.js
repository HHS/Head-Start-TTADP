import {
  validateObjectives,
} from '../objectiveValidator';
import { OBJECTIVES_EMPTY } from '../../../../../components/GoalForm/constants';

import { UNFINISHED_OBJECTIVES } from '../goalValidator';

const missingTitle = {
  title: '',
  ttaProvided: 'ttaProvided',
  topics: ['Coaching'],
  resources: ['Resource'],
};

const validObjective = {
  title: 'title',
  ttaProvided: 'ttaProvided',
  topics: ['Coaching'],
  resources: ['Resource'],
};

describe('validateObjectives', () => {
  it('returns invalid if no objectives', () => {
    const res = validateObjectives();
    expect(res).toEqual(OBJECTIVES_EMPTY);
  });
  it('returns invalid if empty', () => {
    const res = validateObjectives([]);
    expect(res).toEqual(OBJECTIVES_EMPTY);
  });

  it('returns invalid for incomplete objectives', () => {
    const res = validateObjectives([missingTitle]);
    expect(res).toEqual(UNFINISHED_OBJECTIVES);
  });

  it('returns true for valid objectives', () => {
    const res = validateObjectives([validObjective]);
    expect(res).toBeTruthy();
  });
});
