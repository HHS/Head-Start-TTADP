import db from '../models';
import { CREATION_METHOD } from '../constants';
import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';
import { reduceGoals } from './reduceGoals';
import {
  IGoalModelInstance,
  IObjectiveModelInstance,
} from './types';
import extractObjectiveAssociationsFromActivityReportObjectives from './extractObjectiveAssociationsFromActivityReportObjectives';

const {
  Goal,
  GoalCollaborator,
  GoalFieldResponse,
  GoalTemplate,
  GoalStatusChange,
  GoalTemplateFieldPrompt,
  Grant,
  Objective,
  ActivityReportObjective,
  sequelize,
  Recipient,
  Resource,
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  Topic,
  Program,
  File,
  User,
  UserRole,
  Role,
  CollaboratorType,
  Course,
} = db;

export const OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR = [
  'id',
  'title',
  'status',
  'goalId',
  'onApprovedAR',
  'onAR',
  'rtrOrder',
];

const OPTIONS_FOR_GOAL_FORM_QUERY = (id: number[] | number, recipientId: number) => ({
  attributes: [
    'name',
    'status',
    'source',
    'isSourceEditable',
    'onAR',
    'onApprovedAR',
    'id',
    [sequelize.col('grant.regionId'), 'regionId'],
    [sequelize.col('grant.recipient.id'), 'recipientId'],
    'goalTemplateId',
    [sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`), 'isCurated'],
    'rtrOrder',
    'createdVia',
    'goalTemplateId',
  ],
  order: [['rtrOrder', 'asc']],
  where: {
    id,
  },
  include: [
    {
      model: GoalStatusChange,
      as: 'statusChanges',
      attributes: ['oldStatus'],
      required: false,
    },
    {
      model: GoalCollaborator,
      as: 'goalCollaborators',
      attributes: ['id'],
      required: false,
      include: [
        {
          model: CollaboratorType,
          as: 'collaboratorType',
          where: {
            name: 'Creator',
          },
          attributes: ['name'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
          required: true,
          include: [
            {
              model: UserRole,
              as: 'userRoles',
              include: [
                {
                  model: Role,
                  as: 'role',
                  attributes: ['name'],
                },
              ],
              attributes: ['id'],
            },
          ],
        },
      ],
    },
    {
      model: Objective,
      attributes: OBJECTIVE_ATTRIBUTES_TO_QUERY_ON_RTR,
      as: 'objectives',
      order: [['rtrOrder', 'ASC']],
      include: [
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          attributes: ['id', 'objectiveId'],
          include: [
            {
              model: Topic,
              as: 'topics',
              attributes: ['name'],
              through: {
                attributes: [],
              },
            },
            {
              model: Resource,
              as: 'resources',
              attributes: ['url', 'title'],
              through: {
                attributes: [],
              },
            },
            {
              model: File,
              as: 'files',
              attributes: ['originalFileName', 'key', 'url'],
              through: {
                attributes: [],
              },
            },
            {
              model: Course,
              as: 'courses',
              attributes: ['name'],
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    },
    {
      model: Grant,
      as: 'grant',
      attributes: [
        'id',
        'number',
        'regionId',
        'recipientId',
        'numberWithProgramTypes',
      ],
      include: [
        {
          attributes: ['programType'],
          model: Program,
          as: 'programs',
        },
        {
          attributes: ['id', 'name'],
          model: Recipient,
          as: 'recipient',
          where: {
            id: recipientId,
          },
          required: true,
        },
      ],
    },
    {
      model: GoalTemplate,
      as: 'goalTemplate',
      attributes: [],
      required: false,
    },
    {
      model: GoalTemplateFieldPrompt,
      as: 'prompts',
      attributes: [
        ['id', 'promptId'],
        'ordinal',
        'title',
        'prompt',
        'hint',
        'fieldType',
        'options',
        'validations',
      ],
      required: false,
      include: [
        {
          model: GoalFieldResponse,
          as: 'responses',
          attributes: ['response'],
          required: false,
          where: { goalId: id },
        },
        {
          model: ActivityReportGoalFieldResponse,
          as: 'reportResponses',
          attributes: ['response'],
          required: false,
          include: [{
            model: ActivityReportGoal,
            as: 'activityReportGoal',
            attributes: ['activityReportId', ['id', 'activityReportGoalId']],
            required: true,
            where: { goalId: id },
          }],
        },
      ],
    },
  ],
});

export default async function goalsByIdAndRecipient(ids: number | number[], recipientId: number) {
  const goals = await Goal
    .findAll(OPTIONS_FOR_GOAL_FORM_QUERY(ids, recipientId)) as IGoalModelInstance[];

  const reformattedGoals = goals.map((goal) => ({
    ...goal,
    isSourceEditable: goal.isSourceEditable,
    isReopenedGoal: wasGoalPreviouslyClosed(goal),
    objectives: goal.objectives
      .map((objective: IObjectiveModelInstance) => ({
        ...objective.toJSON(),
        topics: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'topics',
        ),
        courses: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'courses',
        ),
        resources: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'resources',
        ),
        files: extractObjectiveAssociationsFromActivityReportObjectives(
          objective.activityReportObjectives,
          'files',
        ),
      })),
  }));

  return reduceGoals(reformattedGoals);
}
