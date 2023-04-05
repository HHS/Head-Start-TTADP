/* eslint-disable import/prefer-default-export */
import { Sequelize, Op } from 'sequelize';
import db from '../models';
import { CURATED_CREATION, GOAL_STATUS, PROMPT_FIELD_TYPE } from '../constants';

const {
  GoalTemplate: GoalTemplateModel,
  GoalTemplateFieldPrompt: GoalTemplateFieldPromptModel,
  GoalFieldResponse: GoalFieldResponseModel,
  Goal: GoalModel,
  Grant,
  sequelize,
} = db;

interface GoalTemplate {
  id: number;
  label: string;
  value: number;
  name: string;
  goalIds: number[];
  isRttapa: string;
  status: string;
  endDate: string | null;
  grantIds: [];
  oldGrantIds: [];
  onApprovedAR: true;
  isNew: false;
  isTemplate: true,
}
interface Validation {
  [key: string]: number | string | boolean;
  message: string;
}

interface ResponseSet {
  response: string[] | null;
  goalIds: number[];
}

interface FieldPrompts {
  promptId: number,
  ordinal: number,
  title: string,
  question: string;
  type: string;
  options: string[] | null;
  validations: Validation[];
  responses: ResponseSet[];
}

interface PromptResponse {
  promptId: number,
  response: string[] | null;
}

export async function getCuratedTemplates(grantIds: number[] | null): Promise<GoalTemplate[]> {
  // Collect the distinct list of regionIds from the list of passed grantIds
  const regionIds = grantIds && grantIds.length
    ? await Grant.scope().findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('regionId')), 'regionId'],
      ],
      where: { id: grantIds },
      raw: true,
    })
    : [];

  // Collect all the templates that either have a null regionId or a regionId from the list
  // collected above.
  return GoalTemplateModel.findAll({
    attributes: [
      'id',
      ['templateName', 'label'],
      ['id', 'value'],
      ['templateName', 'name'],
      [Sequelize.literal('ARRAY[]::int[]'), 'goalIds'],
      [Sequelize.literal('NULL::varchar'), 'isRttapa'],
      [Sequelize.literal(GOAL_STATUS.NOT_STARTED), 'status'],
      [Sequelize.literal('NULL::varchar'), 'endDate'],
      [Sequelize.literal('ARRAY[]::int[]'), 'grantIds'],
      [Sequelize.literal('ARRAY[]::int[]'), 'oldGrantIds'],
      [Sequelize.literal('TRUE'), 'onApprovedAR'],
      [Sequelize.literal('FALSE'), 'isNew'],
      [Sequelize.literal('TRUE'), 'isTemplate'], // setting this tells the frontnd to check for conditional prompts
    ],
    where: {
      creationMethod: CURATED_CREATION,
      [Op.or]: [
        { regionId: regionIds },
        { regionId: null },
      ],
    },
    ORDER: [['name', 'ASC']],
    raw: true,
  });
}

export async function getFieldPromptsForCuratedTemplate(
  goalTemplateId: number,
  goalIds: number[] | null,
): Promise<FieldPrompts[]> {
  // Collect the data from the DB for the passed goalTemplate and goalIds
  const [prompts, responses] = await Promise.all([
    GoalTemplateFieldPromptModel.findAll({
      attributes: [
        ['id', 'promptId'],
        'ordinal',
        'title',
        'question',
        ['fieldType', 'type'],
        'options',
        'validations',
      ],
      where: { goalTemplateId },
      order: [['"GoalTemplateFieldPromptModel"."ordinal"']],
      raw: true,
    }),
    GoalFieldResponseModel.findAll({
      attributes: [
        ['goalTemplateFieldPromptId', 'promptId'],
        'ordinal',
        'response',
        [
          sequelize.fn('ARRAY_AGG', sequelize.fn('DISTINCT', 'goalId')),
          'goalIds',
        ],
      ],
      where: { goalId: goalIds },
      include: [{
        model: GoalTemplateFieldPromptModel,
        as: 'prompt',
        required: true,
        attributes: [],
        include: [{
          model: GoalTemplateModel,
          as: 'goalTemplate',
          required: true,
          attributes: [],
          where: { goalTemplateId },
        }],
      }],
      group: [
        '"GoalFieldResponseModel"."goalTemplateFieldPromptId"',
        '"GoalFieldResponseModel"."ordinal"',
        '"GoalFieldResponseModel"."response"',
      ],
      order: [['"GoalFieldResponseModel"."ordinal"']],
      raw: true,
    }),
  ]);

  // todo - add initial value below & add types

  // restructure the collected data into one object with all responses for the passed goalIds if
  // any exists
  const restructuredPrompts = responses.reduce(
    (
      promptsWithResponses,
      response,
    ) => {
      const exists = promptsWithResponses
        .find((pwr) => pwr.promptId === response.promptId
        && pwr.ordinal === response.ordinal);
      if (exists) {
        exists.response.push({
          response: response.response,
          goalIds: response.goalIds,
        });
      }
      return promptsWithResponses;
    },
    prompts,
  );
  return restructuredPrompts;
}

export async function setFieldPromptForCuratedTemplate(
  goalIds: number[],
  promptId: number,
  response: string[] | null,
) {
  const [currentResponses, promptRequirements] = await Promise.all([
    GoalModel.findAll({
      attributes: [
        ['$"Goal"."id"$', 'goalId'],
        ['$"fieldPrompt"."id"$', 'promptId'],
        ['$"fieldPrompt"."ordinal"$', 'ordinal'],
        ['$"fieldResponses"."response"$', 'response'],
        [
          sequelize.literal(`"GoalFieldResponseModel"."response" != ARRAY[${response?.map((r) => `'${r}'`).join(',')}]`),
          'isChanged',
        ],
      ],
      where: {
        id: goalIds,
        [Op.or]: [
          { '$"fieldPrompt"."id"$': '$"fieldResponses"."goalTemplateFieldPromptId"$' },
          { '$"fieldResponses"."goalTemplateFieldPromptId"$': null },
        ],
      },
      include: [{
        attributes: [],
        model: GoalFieldResponseModel,
        as: 'fieldResponses',
        required: false,
        where: {
          goalTemplateFieldPromptId: promptId,
        },
      }, {
        attributes: [],
        model: GoalTemplateFieldPromptModel,
        as: 'fieldPrompt',
        required: true,
        where: { id: promptId },
      }],
      raw: true,
    }),
    GoalTemplateFieldPromptModel.findOne({
      attributes: [
        ['id', 'promptId'],
        ['fieldType', 'type'],
        'options',
        'validations',
      ],
      where: { id: promptId },
      raw: true,
    }),
  ]);

  if (promptRequirements.type === PROMPT_FIELD_TYPE.MULTISELECT) {
    if (response
      && response
        .filter((r) => promptRequirements.options.includes(r))
        .length !== response.length) {
      // fail - invalid values
    }

    const maxSelections = promptRequirements.validations
      .find((v) => Object.keys(v).includes('maxSelections'))
      ?.maxSelections || Number.MAX_VALUE;
    if (response && response.length <= maxSelections) {
      // fail - more then max selections
    }

    const minSelections = promptRequirements.validations
      .find((v) => Object.keys(v).includes('minSelections'))
      ?.minSelections || 0;
    if (response && response.length >= minSelections) {
      // fail - less then min selections
    }
  }

  const isRequired = promptRequirements.validations
    .find((v) => Object.keys(v).includes('isRequired'))
    ?.isRequired || false;
  if (isRequired && !response) {
    // fail - is required
  }

  const goalIdsToUpdate = currentResponses
    .filter((r) => r.isChanged && r.response)
    .map((r) => r.goalId);

  const recordsToCreate = currentResponses
    .filter((r) => r.isChanged && !r.response)
    .map((r) => ({
      goalId: r.goalId,
      goalTemplateFieldPromptId: promptId,
      ordinal: r.ordinal,
      response,
    }));

  await Promise.all([
    GoalFieldResponseModel.update(
      { response },
      {
        where: {
          goalTemplateFieldPromptId: promptId,
          goalId: goalIdsToUpdate,
        },
      },
    ),
    ...recordsToCreate.map((rtc) => GoalFieldResponseModel.create(rtc)),
  ]);
}

export async function setFieldPromptsForCuratedTemplate(
  goalIds: number[],
  promptResponses: PromptResponse[],
) {
  return Promise.all(
    promptResponses
      .map(({
        promptId,
        response,
      }) => setFieldPromptForCuratedTemplate(goalIds, promptId, response)),
  );
}
