import { Op } from 'sequelize';
import { TOPICS } from '@ttahub/common';
import { GOAL_STATUS } from '../../constants';
import {
  // @ts-ignore
  Goal, Objective, Topic, ActivityReportObjective, ActivityReportObjectiveTopic,
} from '../../models';

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
    'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.id': number;
    'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': typeof TOPICS[number];
  };

  const allTopics = await Goal.findAll({
    attributes: ['id', 'status'],
    where: {
      [Op.and]: [
        scopes.goal,
        {
          onApprovedAR: {
            [Op.eq]: true,
          },
        },
      ],
    },
    include: [
      {
        model: Objective,
        as: 'objectives',
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: [],
            include: [
              {
                model: ActivityReportObjectiveTopic,
                as: 'activityReportObjectiveTopics',
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
      },
    ],
    raw: true,
  }) as QueryResults[];

  let sanitized = allTopics.reduce((acc, goal) => {
    const { status, 'objectives.activityReportObjectives.activityReportObjectiveTopics.topic.topic': topic } = goal;
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
