import { Sequelize, Op } from 'sequelize';
import { GOAL_STATUS } from '../../constants';
import db from '../../models';

const {
  Goal,
  Objective,
  Topic,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReport,
} = db;

type Status = keyof typeof GOAL_STATUS;

type TopicResponse = {
  [topic: string]: {
    [S in Status]: number;
  } & { total: number };
};

export default async function topicsByGoalStatus(scopes): Promise<TopicResponse[]> {
  const queryResults = await Goal.findAll({
    attributes: [
      [Sequelize.literal('COALESCE("%2"."name", "%1"."name")'), 'topic'],
      // eslint-disable-next-line @typescript-eslint/quotes
      [Sequelize.literal(`COUNT(DISTINCT "Goal"."id") FILTER (WHERE "Goal"."status" = 'Not Started')`), 'Not Started'],
      // eslint-disable-next-line @typescript-eslint/quotes
      [Sequelize.literal(`COUNT(DISTINCT "Goal"."id") FILTER (WHERE "Goal"."status" = 'In Progress')`), 'In Progress'],
      // eslint-disable-next-line @typescript-eslint/quotes
      [Sequelize.literal(`COUNT(DISTINCT "Goal"."id") FILTER (WHERE "Goal"."status" = 'Closed')`), 'Closed'],
      // eslint-disable-next-line @typescript-eslint/quotes
      [Sequelize.literal(`COUNT(DISTINCT "Goal"."id") FILTER (WHERE "Goal"."status" = 'Suspended')`), 'Suspended'],
      [Sequelize.literal('COUNT(DISTINCT "Goal"."id")'), 'total'],
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
        required: true,
        attributes: [],
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            required: true,
            attributes: [],
            include: [
              {
                model: ActivityReportObjectiveTopic,
                as: 'activityReportObjectiveTopics',
                required: true,
                attributes: [],
                include: [
                  {
                    model: Topic,
                    as: 'topic',
                    required: true,
                    attributes: [],
                    include: [
                      {
                        model: Topic,
                        as: 'mapsToTopic',
                        required: false,
                        attributes: [],
                      },
                    ],
                  },
                ],
              },
              {
                model: ActivityReport,
                as: 'activityReport',
                required: true,
                attributes: [],
                where: {
                  calculatedStatus: 'approved',
                },
              },
            ],
          },
        ],
      },
    ],
    group: [Sequelize.literal('COALESCE("%2"."name", "%1"."name")')],
    raw: true,
  });

  // Transform queryResults to TopicResponse[]
  const response: TopicResponse[] = queryResults.map((result) => {
    const { topic, total, ...statuses } = result;
    return {
      topic,
      statuses,
      total,
    };
  });

  return response;
}
