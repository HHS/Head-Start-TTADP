import { Op } from 'sequelize';
import { TOPICS, GOAL_STATUS, REPORT_STATUSES } from '../../constants';
import {
  // @ts-ignore
  Goal, Topic, Objective, ObjectiveTopic, ActivityReportGoal, ActivityReport,
} from '../../models';

type Tpc = typeof TOPICS[number];

type Status = keyof typeof GOAL_STATUS;

type TopicResponse = {
  [topic: string]: {
    [S in Status]: number;
  } & { total: number };
};

export default async function topicsByGoalStatus(scopes): Promise<TopicResponse[]> {
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
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        required: true,
        attributes: [],
        include: [
          {
            model: ActivityReport,
            as: 'activityReport',
            attributes: [],
            where: {
              [Op.and]: {
                calculatedStatus: {
                  [Op.eq]: REPORT_STATUSES.APPROVED,
                },
              },
            },
          },
        ],
      },
    ],
    raw: true,
  }) as QueryResults[];

  let sanitized = allTopics.reduce((acc, goal) => {
    const { status, 'objectives.objectiveTopics.topic.topic': topic } = goal;
    if (topic && !acc[topic]) {
      acc[topic] = { ...Object.values(GOAL_STATUS).reduce((a, s) => ({ ...a, [s]: 0 }), {}) };
    }

    if (acc[topic]) {
      acc[topic][status] += 1;
    }

    return acc;
  }, {});

  sanitized = Object.entries(sanitized).reduce((acc, [topic, statuses]) => {
    acc[topic].total = Object.values(statuses).reduce((a, s) => a + s, 0);
    return acc;
  }, sanitized);

  // Format this so it's more easily digestible by the frontend
  const response: TopicResponse[] = Object.entries(sanitized)
    .map(([topic, statuses]) => ({ topic, statuses }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((obj: any) => {
      const { statuses } = obj;
      const { total } = statuses;
      delete statuses.total;
      return { ...obj, total };
    });

  return response;
}
