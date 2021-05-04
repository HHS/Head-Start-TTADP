import {
  validateObjectives,
  OBJECTIVES_EMPTY,
} from '../objectiveValidator';

import { UNFINISHED_OBJECTIVES } from '../goalValidator';

const missingTitle = {
  title: '',
  ttaProvided: 'ttaProvided',
};

const validObjective = {
  title: 'title',
  ttaProvided: 'ttaProvided',
};

describe('validateObjectives', () => {
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
