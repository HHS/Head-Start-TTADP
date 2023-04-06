/* eslint-disable import/prefer-default-export */
import { Sequelize, Op } from 'sequelize';
import db from '../models';
import { CREATION_METHOD, GOAL_STATUS, PROMPT_FIELD_TYPE } from '../constants';

const {
  GoalTemplate: GoalTemplateModel,
  GoalTemplateFieldPrompt: GoalTemplateFieldPromptModel,
  GoalFieldResponse: GoalFieldResponseModel,
  Goal: GoalModel,
  Grant,
  Region,
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
  isNew: false;
  isCurated: true;
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

/**
Retrieves all curated goal templates that either have a null regionId or a grant within the
specified region.
@param grantIds - An array of grant IDs to filter by. If null, all grants will be included.
@returns A Promise that resolves to an array of GoalTemplate objects.
*/
export async function getCuratedTemplates(grantIds: number[] | null): Promise<GoalTemplate[]> {
  // Collect all the templates that either have a null regionId or a grant within the specified
  // region.
  return GoalTemplateModel.findAll({
    attributes: [
      'id',
      ['templateName', 'label'],
      ['id', 'value'],
      ['templateName', 'name'],
      ['id', 'goalTemplateId'],
      [Sequelize.literal('ARRAY[]::int[]'), 'goalIds'],
      [Sequelize.literal('NULL::varchar'), 'isRttapa'],
      [Sequelize.literal(`'${GOAL_STATUS.NOT_STARTED}'`), 'status'],
      [Sequelize.literal('NULL::varchar'), 'endDate'],
      [Sequelize.literal('ARRAY[]::int[]'), 'grantIds'],
      [Sequelize.literal('ARRAY[]::int[]'), 'oldGrantIds'],
      [Sequelize.literal('TRUE'), 'isCurated'],
      [Sequelize.literal('FALSE'), 'isNew'],
    ],
    include: [{
      model: Region,
      as: 'region',
      attributes: [],
      required: false,
      include: [{
        model: Grant,
        as: 'grants',
        attributes: [],
        required: false,
        where: { id: grantIds },
      }],
    }],
    where: {
      creationMethod: CREATION_METHOD.CURATED,
      [Op.or]: [
        { '$"region.grants"."id"$': { [Op.not]: null } },
        { regionId: null },
      ],
    },
    ORDER: [['name', 'ASC']],
    raw: true,
  });
}

/**
Retrieves field prompts for a curated goal template and associated goals.
@param goalTemplateId - The ID of the goal template to retrieve prompts for.
@param goalIds - An array of goal IDs to retrieve responses for. Can be null if no
  responses are needed.
@returns An array of FieldPrompts objects containing prompt information and associated
  responses (if any).
*/
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

/**

Sets the field prompt response for a curated template for a list of goals.

@param {number[]} goalIds - The IDs of the goals to update.

@param {number} promptId - The ID of the field prompt to update.

@param {string[] | null} response - The response to set for the field prompt.

@returns {Promise} A Promise that resolves when the update is complete.
*/
export async function setFieldPromptForCuratedTemplate(
  goalIds: number[],
  promptId: number,
  response: string[] | null,
) {
  // Retrieve the current responses and prompt requirements for the given goals and prompt ID.
  const [currentResponses, promptRequirements] = await Promise.all([
    GoalModel.findAll({
      attributes: [
        ['$"Goal"."id"$', 'goalId'],
        ['$"fieldPrompt"."id"$', 'promptId'],
        ['$"fieldPrompt"."ordinal"$', 'ordinal'],
        ['$"fieldResponses"."response"$', 'response'],
        [
          sequelize.literal(`"GoalFieldResponseModel"."response" != ARRAY[${response
            ?.map((r) => sequelize
              .getQueryInterface()
              .queryGenerator
              .escape(r))
            .join(',')}]`),
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
        'title',
        ['fieldType', 'type'],
        'options',
        'validations',
      ],
      where: { id: promptId },
      raw: true,
    }),
  ]);

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

  if (goalIdsToUpdate.length || recordsToCreate.length) {
    if (promptRequirements.type === PROMPT_FIELD_TYPE.MULTISELECT) {
      if (response
        && response
          .filter((r) => !promptRequirements.options.includes(r))
          .length > 0) {
        return Promise.reject(new Error(
          `Response for '${promptRequirements.title}' contains invalid values. Invalid values: ${
            response
              .filter((r) => !promptRequirements.options.includes(r))
              .map((r) => `'${r}'`)
              .join(', ')
          }.`,
        ));
      }

      const maxSelections = promptRequirements.validations
        .find((v) => Object.keys(v).includes('maxSelections'))
        ?.maxSelections || Number.MAX_VALUE;
      if (response && response.length <= maxSelections) {
        return Promise.reject(new Error(
          `Response for '${promptRequirements.title}' contains more than max allowed selections. ${response.length} found, ${maxSelections} or less expected.`,
        ));
      }

      const minSelections = promptRequirements.validations
        .find((v) => Object.keys(v).includes('minSelections'))
        ?.minSelections || 0;
      if (response && response.length >= minSelections) {
        return Promise.reject(new Error(`Response for '${promptRequirements.title}' contains less than min selections. ${response.length} found, ${maxSelections} or more expected.`));
      }
    }

    const isRequired = promptRequirements.validations
      .find((v) => Object.keys(v).includes('isRequired'))
      ?.isRequired || false;
    if (isRequired
      && (response === null
        || response === undefined
        || (Array.isArray(response)
          && response.length === 0))) {
      return Promise.reject(new Error(`Response for '${promptRequirements.title}' is required.`));
    }

    return Promise.all([
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

  return Promise.resolve();
}

/**
Sets field prompts for a list of curated templates and their associated goals.
@param {number[]} goalIds - An array of goal IDs to set field prompts for.
@param {PromptResponse[]} promptResponses - An array of prompt responses containing the prompt
  ID and response for each field prompt.
@returns {Promise} - A promise that resolves with an array of voids once all field prompts have
  been set.
*/
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
