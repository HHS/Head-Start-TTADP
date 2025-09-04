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
  ActivityReportObjectiveCitation,
  sequelize,
  Resource,
  ActivityReportGoal,
  Topic,
  Course,
  File,
  Program,
} = db;
// TODO: TTAHUB-3970: This might need to be changed to ensure we
//  return the selected goal template name for display.
export default async function getGoalsForReport(reportId: number) {
  const goals = await Goal.findAll({
    attributes: {
      exclude: [
        'timeframe',
        'isFromSmartsheetTtaPlan',
        'isRttapa',
        'mapsToParentGoalId',
        'createdAt',
        'updatedAt',
        'createdVia',
        'deletedAt',
      ],
      include: [

        [sequelize.col('grant.regionId'), 'regionId'],
        [sequelize.col('grant.recipient.id'), 'recipientId'],
        [sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`), 'isCurated'],
        [sequelize.literal('"goalTemplate"."standard"'), 'standard'],
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
              'reportResponse', argfr.response,
              'grantId', "Goal"."grantId"
            ))
          FROM "GoalTemplateFieldPrompts" gtfp
          LEFT JOIN "GoalFieldResponses" gfr
          ON gtfp.id = gfr."goalTemplateFieldPromptId"
          AND gfr."goalId" = "Goal".id
          LEFT JOIN "ActivityReportGoalFieldResponses" argfr
          ON gtfp.id = argfr."goalTemplateFieldPromptId"
          AND argfr."activityReportGoalId" = "activityReportGoals".id
          WHERE "goalTemplate".id = gtfp."goalTemplateId"
          GROUP BY 1=1
        )`), 'prompts'],
        [
          sequelize.literal(`(
          SELECT COUNT(*) > 0
          FROM "Goals" g2
          WHERE g2."goalTemplateId" = "Goal"."goalTemplateId"
            AND g2."grantId" = "Goal"."grantId"
            AND g2."status" = 'Closed'
            AND g2."id" != "Goal"."id"
        )`),
          'isReopened',
        ],
        [
          sequelize.literal(`(
            SELECT COUNT(*) = 1
            FROM "ActivityReportGoals" arg
            WHERE arg."goalId" = "Goal".id
          )`),
          'firstUsage',
        ],
      ],
    },
    include: [
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        attributes: ['oldStatus', 'newStatus', 'reason'],
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
        include: [{
          model: Program,
          as: 'programs',
          attributes: ['programType'],
        }],
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
                    attributes: ['id', 'name', 'mapsTo'],
                    model: Topic,
                    as: 'topic',
                    paranoid: false,
                  },
                ],
              },
              {
                separate: true,
                model: ActivityReportObjectiveCitation,
                as: 'activityReportObjectiveCitations',
                required: false,
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
