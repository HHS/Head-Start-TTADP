import { Op } from 'sequelize';
import { TOPICS, GOAL_STATUS } from '../../constants';
import {
  // @ts-ignore
  Goal, Topic,
} from '../../models';

type Tpc = typeof TOPICS[number];

type Status = keyof typeof GOAL_STATUS;

type Topics = {
  [topic: string]: {
    [S in Status]: number;
  }
};

export default async function topicsByGoalStatus(scopes) {
}
