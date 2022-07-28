/* eslint-disable import/prefer-default-export */
import { unfinishedObjectives } from './goalValidator';

import { OBJECTIVES_EMPTY } from '../../../../components/GoalForm/constants';

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
