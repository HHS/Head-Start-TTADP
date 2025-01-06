import { Sequelize, Op } from 'sequelize';
import { TOPICS } from '@ttahub/common';
import { GOAL_STATUS } from '../../constants';
import {
  // @ts-ignore
  Goal,
  Objective,
  Topic,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReport,
} from '../../models';

type Status = keyof typeof GOAL_STATUS;

type TopicResponse = {
  [topic: string]: {
    [S in Status]: number;
  } & { total: number };
};

export default async function topicsByGoalStatus(scopes): Promise<TopicResponse[]> {
  const queryResults = await Goal.findAll({
    attributes: [
      [Sequelize.literal('COALESCE("Topic2"."name", "Topic"."name")'), 'topic'],
      [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('"Goal"."id"')), { filter: { where: { status: 'Not Started' } } }), 'Not Started'],
      [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('"Goal"."id"')), { filter: { where: { status: 'In Progress' } } }), 'In Progress'],
      [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('"Goal"."id"')), { filter: { where: { status: 'Closed' } } }), 'Closed'],
      [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('"Goal"."id"')), { filter: { where: { status: 'Suspended' } } }), 'Suspended'],
      [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('"Goal"."id"'))), 'total'],
    ],
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
        attributes: [],
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
                    attributes: ['name'],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: ActivityReport,
        as: 'activityReports',
        attributes: [],
        where: {
          calculatedStatus: 'approved',
        },
      },
      {
        model: Topic,
        as: 'topic2', // Alias for the LEFT JOIN
        attributes: ['name'],
        required: false,
        on: Sequelize.literal('"Topic"."mapsTo" = "Topic2"."id"'),
      },
    ],
    group: [Sequelize.literal('COALESCE("Topic2"."name", "Topic"."name")')],
    raw: true,
  });

  // Transform queryResults to TopicResponse[]
  const response: TopicResponse[] = queryResults.map(( result ) => {
    const { topic, total, ...statuses } = result;
    return {
      topic,
      statuses,
      total,
    };
  });

  return response;
}
