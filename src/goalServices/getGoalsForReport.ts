import { Op } from 'sequelize';
import db from '../models';
import {
  SOURCE_FIELD,
  CREATION_METHOD,
} from '../constants';
import { reduceGoals } from './reduceGoals';
import {
  IGoalModelInstance,
} from './types';

const {
  Goal,
  GoalTemplate,
  Grant,
  Objective,
  GoalStatusChange,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveCourse,
  sequelize,
  Resource,
  ActivityReportGoal,
  Topic,
  Course,
  File,
} = db;

export default async function getGoalsForReport(reportId: number) {
  const goals = await Goal.findAll({
    attributes: {
      include: [
        [sequelize.col('grant.regionId'), 'regionId'],
        [sequelize.col('grant.recipient.id'), 'recipientId'],
        [sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`), 'isCurated'],
        [sequelize.literal(`(
          SELECT
            jsonb_agg( DISTINCT jsonb_build_object(
              'promptId', gtfp.id ,
              'ordinal', gtfp.ordinal,
              'title', gtfp.title,
              'prompt', gtfp.prompt,
              'hint', gtfp.hint,
              'caution', gtfp.caution,
              'fieldType', gtfp."fieldType",
              'options', gtfp.options,
              'validations', gtfp.validations,
              'response', gfr.response,
              'reportResponse', argfr.response
            ))
          FROM "GoalTemplateFieldPrompts" gtfp
          LEFT JOIN "GoalFieldResponses" gfr
          ON gtfp.id = gfr."goalTemplateFieldPromptId"
          AND gfr."goalId" = "Goal".id
          LEFT JOIN "ActivityReportGoalFieldResponses" argfr
          ON gtfp.id = argfr."goalTemplateFieldPromptId"
          AND argfr."activityReportGoalId" = "activityReportGoals".id
          WHERE "goalTemplate".id = gtfp."goalTemplateId"
          GROUP BY TRUE
        )`), 'prompts'],
      ],
    },
    include: [
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        attributes: ['oldStatus'],
        required: false,
      },
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: [],
        required: false,
      },
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        where: {
          activityReportId: reportId,
        },
        required: true,
      },
      {
        model: Grant,
        as: 'grant',
        required: true,
      },
      {
        separate: true,
        model: Objective,
        as: 'objectives',
        include: [
          {
            required: true,
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            where: {
              activityReportId: reportId,
            },
            include: [
              {
                separate: true,
                model: ActivityReportObjectiveTopic,
                as: 'activityReportObjectiveTopics',
                required: false,
                include: [
                  {
                    model: Topic,
                    as: 'topic',
                  },
                ],
              },
              {
                separate: true,
                model: ActivityReportObjectiveFile,
                as: 'activityReportObjectiveFiles',
                required: false,
                include: [
                  {
                    model: File,
                    as: 'file',
                  },
                ],
              },
              {
                separate: true,
                model: ActivityReportObjectiveCourse,
                as: 'activityReportObjectiveCourses',
                required: false,
                include: [
                  {
                    model: Course,
                    as: 'course',
                  },
                ],
              },
              {
                separate: true,
                model: ActivityReportObjectiveResource,
                as: 'activityReportObjectiveResources',
                required: false,
                attributes: [['id', 'key']],
                include: [
                  {
                    model: Resource,
                    as: 'resource',
                    attributes: [['url', 'value']],
                  },
                ],
                where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.REPORTOBJECTIVE.RESOURCE] } },
              },
            ],
          },
          {
            model: Topic,
            as: 'topics',
          },
          {
            model: Resource,
            as: 'resources',
            attributes: [['url', 'value']],
            through: {
              attributes: [],
              where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.OBJECTIVE.RESOURCE] } },
              required: false,
            },
            required: false,
          },
          {
            model: File,
            as: 'files',
          },
        ],
      },
    ],
    order: [
      [[sequelize.col('activityReportGoals.createdAt'), 'asc']],
    ],
  }) as IGoalModelInstance[];

  // dedupe the goals & objectives
  const forReport = true;
  return reduceGoals(goals, forReport);
}
