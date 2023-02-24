import { Op } from 'sequelize';
import { TOPICS, GOAL_STATUS } from '../../constants';
import {
  // @ts-ignore
  Goal, Topic, Objective, ObjectiveTopic,
} from '../../models';

type Tpc = typeof TOPICS[number];

type Status = keyof typeof GOAL_STATUS;

type Topics = {
  [topic: string]: {
    [S in Status]: number;
  }
};

export default async function topicsByGoalStatus(scopes): Promise<Topics> {
  const topics = {};

  // Goal -> Objective -> ObjectiveTopic -> Topic
  // Legacy solution:
  // Goal -> ARGoal -> AR -> AR.topics (array of enums)

  type QueryResults = {
    id: number;
    status: Status;
    'objectives.objectiveTopics.topic.id': number;
    'objectives.objectiveTopics.topic.topic': Tpc;
  };

  const allTopics = await Goal.findAll({
    attributes: ['id', 'status'],
    where: {
      [Op.and]: [scopes.goal],
    },
    include: [
      {
        model: Objective,
        as: 'objectives',
        attributes: [],
        include: [
          {
            model: ObjectiveTopic,
            as: 'objectiveTopics',
            attributes: [],
            include: [
              {
                model: Topic,
                as: 'topic',
                attributes: [['name', 'topic']],
              },
            ],
          },
        ],
      },
    ],
    raw: true,
  }) as QueryResults[];

  let sanitized = allTopics.reduce((acc, goal) => {
    const { status, 'objectives.objectiveTopics.topic.topic': topic } = goal;
    if (!acc[topic]) {
      acc[topic] = { ...Object.values(GOAL_STATUS).reduce((a, s) => ({ ...a, [s]: 0 }), {}) };
    }

    acc[topic][status] += 1;

    return acc;
  }, {});

  sanitized = Object.entries(sanitized).reduce((acc, [topic, statuses]) => {
    acc[topic].total = Object.values(statuses).reduce((a, s) => a + s, 0);
    return acc;
  }, sanitized);

  return topics;
}
