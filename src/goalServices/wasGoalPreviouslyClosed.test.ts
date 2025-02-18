import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';
import { GOAL_STATUS } from '../constants';

describe('wasGoalPreviouslyClosed', () => {
  it('returns true if the goal was previously closed', () => {
    const goal = {
      statusChanges: [
        { oldStatus: GOAL_STATUS.IN_PROGRESS },
        { oldStatus: GOAL_STATUS.CLOSED },
      ],
    };
    expect(wasGoalPreviouslyClosed(goal)).toBe(true);
  });

  it('returns false if the goal was never closed', () => {
    const goal = {
      statusChanges: [
        { oldStatus: GOAL_STATUS.IN_PROGRESS },
        { oldStatus: GOAL_STATUS.NOT_STARTED },
      ],
    };
    expect(wasGoalPreviouslyClosed(goal)).toBe(false);
  });

  it('returns false if there are no status changes', () => {
    const goal = {};
    expect(wasGoalPreviouslyClosed(goal)).toBe(false);
  });

  it('returns false if status changes do not contain closed status', () => {
    const goal = {
      statusChanges: [
        { oldStatus: 'Archived' },
        { oldStatus: 'Completed' },
      ],
    };
    expect(wasGoalPreviouslyClosed(goal)).toBe(false);
  });
});
