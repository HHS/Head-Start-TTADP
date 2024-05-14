import db from '../models';
import { CREATION_METHOD } from '../constants';
import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';
import { reduceGoals } from './reduceGoals';

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

interface ITopicFromDB {
  name: string;
  toJSON: () => { name: string };
}

interface IResourceFromDB {
  url: string;
  title: string;
  toJSON: () => { url: string; title: string }
}

interface IFileFromDB {
  originalFileName: string;
  key: string;
  toJSON: () => { originalFileName: string; key: string }
}

interface IActivityReportObjectivesFromDB {
  topics: ITopicFromDB[];
  resources: IResourceFromDB[];
  files: IFileFromDB[];
}

interface IObjective {
  id: number;
  title: string;
  status: string;
  goalId: number;
  onApprovedAR: boolean;
  onAR: boolean;
  rtrOrder: number;
  activityReportObjectives: IActivityReportObjectivesFromDB[];
}

interface IObjectiveFromDB extends IObjective {
  toJSON: () => IObjective;
}

type IReducedObjective = Omit <IObjective, 'activityReportObjectives'> & {
  topics: {
    name: string
  }[];
  resources: {
    url: string;
    title: string;
  }[];
  files: {
    originalFileName: string;
    key: string;
  }[];
};

interface IGoal {
  id: number;
  endDate: string;
  name: string;
  status: string;
  regionId: number;
  recipientId: number;
  goalNumber: string;
  createdVia: string;
  goalTemplateId: number;
  source: string;
  onAR: boolean;
  onApprovedAR: boolean;
  isCurated: boolean;
  rtrOrder: number;
  statusChanges: { oldStatus: string }[];
  objectives: IObjectiveFromDB[];
  goalCollaborators: {
    id: number;
    collaboratorType: { name: string };
    user: {
      name: string;
      userRoles: {
        role: { name: string };
      }[];
    };
  }[];
  grant: {
    id: number;
    number: string;
    regionId: number;
    recipientId: number;
    numberWithProgramTypes: string;
    programs: { programType: string }[];
  };
  goalTemplateFieldPrompts: {
    promptId: number;
    ordinal: number;
    title: string;
    prompt: string;
    hint: string;
    fieldType: string;
    options: string;
    validations: string;
    responses: { response: string }[];
    reportResponses: {
      response: string;
      activityReportGoal: {
        activityReportId: number;
        activityReportGoalId: number;
      };
    }[];
  }[];
}

interface IGoalForForm extends IGoal {
  toJSON: () => IGoal;
}

type IGoalWithReducedObjectives = Omit <IGoal, 'objectives'> & {
  isReopenedGoal: boolean;
  objectives: IReducedObjective[];
};

const OPTIONS_FOR_GOAL_FORM_QUERY = (id: number[] | number, recipientId: number) => ({
  attributes: [
    'endDate',
    'name',
    'status',
    'source',
    'onAR',
    'onApprovedAR',
    'id',
    [sequelize.col('grant.regionId'), 'regionId'],
    [sequelize.col('grant.recipient.id'), 'recipientId'],
    'goalTemplateId',
    [sequelize.literal(`"goalTemplate"."creationMethod" = '${CREATION_METHOD.CURATED}'`), 'isCurated'],
    'rtrOrder',
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

function extractObjectiveAssociationsFromActivityReportObjectives(
  activityReportObjectives: IActivityReportObjectivesFromDB[],
  associationName: 'topics' | 'resources' | 'files' | 'courses',
) {
  return activityReportObjectives.map((aro) => aro[associationName].map((a:
  ITopicFromDB | IResourceFromDB | IFileFromDB) => a.toJSON())).flat();
}

export default async function goalsByIdAndRecipient(ids: number | number[], recipientId: number) {
  const goals = await Goal.findAll(OPTIONS_FOR_GOAL_FORM_QUERY(ids, recipientId)) as IGoalForForm[];

  const reformattedGoals = goals.map((goal: IGoalForForm) => ({
    ...goal,
    isReopenedGoal: wasGoalPreviouslyClosed(goal),
    objectives: goal.objectives
      .map((objective) => ({
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
      } as unknown as IReducedObjective)), // Convert to 'unknown' first
  })) as IGoalWithReducedObjectives[];

  return reduceGoals(reformattedGoals);
}
