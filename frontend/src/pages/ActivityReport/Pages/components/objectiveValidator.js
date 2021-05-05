import { unfinishedObjectives } from './goalValidator';

export const OBJECTIVES_EMPTY = 'Every report must have at least one objective';

export const validateObjectives = (objectives) => {
  if (objectives.length < 1) {
    return OBJECTIVES_EMPTY;
  }

  const unfinishedMessage = unfinishedObjectives(objectives);

  if (unfinishedMessage) {
    return unfinishedMessage;
  }
  return true;
};
