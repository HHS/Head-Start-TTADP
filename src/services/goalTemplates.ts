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

interface FieldPrompts {
  promptId: number,
  ordinal: number,
  title: string,
  question: string;
  hint: string;
  caution: string;
  fieldType: string;
  options: string[] | null;
  validations: Validation[];
  response: string[];
}

interface PromptResponse {
  promptId: number,
  response: string[] | null;
  goalIds: number[];
  grantId: number;
}

/**
Retrieves all curated goal templates that either have a null regionId or a grant within the
specified region.
@param grantIds - An array of grant IDs to filter by. If null, all grants will be included.
@returns A Promise that resolves to an array of GoalTemplate objects.
*/
export async function getCuratedTemplates(
  grantIds: number[] | null,
  includeClosedAndSuspendedGoals = false,
): Promise<GoalTemplate[]> {
  // Collect all the templates that either have a null regionId or a grant within the specified
  // region.

  let monitoringGoalIds = [];
  const monitoringGoals = await GoalModel.findAll({
    attributes: ['id'],
    where: {
      goalTemplateId: {
        [Op.in]: sequelize.literal('(SELECT id FROM "GoalTemplates" WHERE standard = \'Monitoring\')'),
      },
      grantId: grantIds,
    },
  });
  monitoringGoalIds = monitoringGoals.map((goal) => goal.id);

  const goalWhere = {
    grantId: grantIds,
  } as {
    grantId: number[],
    status?: {
      [Op.notIn]: string[]
    },
  };

  if (!includeClosedAndSuspendedGoals) {
    goalWhere.status = {
      [Op.notIn]: [
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.CLOSED,
      ],
    };
  }

  return GoalTemplateModel.findAll({
    attributes: [
      'id',
      'source',
      'isSourceEditable',
      'standard',
      ['templateName', 'label'],
      ['id', 'value'],
      ['templateName', 'name'],
      ['id', 'goalTemplateId'],
      [Sequelize.literal('ARRAY[]::int[]'), 'goalIds'],
      [Sequelize.literal('NULL::varchar'), 'isRttapa'],
      [Sequelize.literal(`'${GOAL_STATUS.NOT_STARTED}'`), 'status'],
      [Sequelize.literal('ARRAY[]::int[]'), 'grantIds'],
      [Sequelize.literal('ARRAY[]::int[]'), 'oldGrantIds'],
      [Sequelize.literal('TRUE'), 'isCurated'], // setting this tells the frontnd to check for conditional prompts
      [Sequelize.literal('FALSE'), 'isNew'],
    ],
    include: [
      {
        model: Region,
        as: 'region',
        attributes: [],
        required: false,
        include: [{
          model: Grant.unscoped(), // remove recipient from response
          as: 'grants',
          attributes: [],
          required: false,
          where: { id: grantIds },
          include: [],
        }],
      },
      {
        model: GoalModel,
        as: 'goals',
        attributes: [
          'id',
          'name',
          'source',
          'status',
          'grantId',
          'goalTemplateId',
          'prestandard',
        ],
        required: false,
        where: goalWhere,
      },
    ],
    where: {
      creationMethod: CREATION_METHOD.CURATED,
      [Op.and]: [
        {
          [Op.or]: [
            { '$"region.grants"."id"$': { [Op.not]: null } },
            { regionId: null },
          ],
        },
        {
          [Op.or]: [
            { '$goals.id$': monitoringGoalIds },
            {
              standard: {
                [Op.not]: 'Monitoring',
              },
            },
          ],
        },
      ],
    },
    order: [['templateName', 'ASC']],
  });
}

export async function getSourceFromTemplate(
  goalTemplateId: number,
  grantIds: number[],
) {
  const goal = await GoalModel.findOne({
    where: {
      goalTemplateId,
      grantId: grantIds,
    },
    attributes: ['source'],
    include: {
      model: GoalTemplateModel,
      as: 'goalTemplate',
      attributes: ['source'],
    },
  });

  return goal?.source || goal?.goalTemplate?.source;
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
        'prompt',
        'hint',
        'caution',
        'fieldType',
        'options',
        'validations',
        'goalTemplateId',
      ],
      where: { goalTemplateId },
      order: [['ordinal', 'asc']],
      raw: true,
    }),
    GoalFieldResponseModel.findAll({
      attributes: [
        ['goalTemplateFieldPromptId', 'promptId'],
        'response',
        [
          sequelize.fn('ARRAY_AGG', sequelize.fn('DISTINCT', sequelize.col('"GoalFieldResponse"."goalId"'))),
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
          where: { id: goalTemplateId },
        }],
      }],
      group: [
        '"GoalFieldResponse"."goalTemplateFieldPromptId"',
        '"GoalFieldResponse"."response"',
      ],
      raw: true,
    }),
  ]);

  // restructure the collected data into one object with all responses for the passed goalIds if
  // any exists

  const restructuredPrompts = responses.reduce(
    (
      promptsWithResponses: FieldPrompts[],
      response: PromptResponse,
    ) => {
      const exists = promptsWithResponses
        .find((pwr) => pwr.promptId === response.promptId);

      if (exists) {
        exists.response = [...exists.response, ...response.response];
      }
      return promptsWithResponses;
    },
    // the inital set of prompts, which can't have a response yet
    // because `prompts` is an array of GoalTemplateFieldPromptModel, which both
    // doesn't include a response and doesn't join with GoalFieldResponseModel.
    prompts.map((p: FieldPrompts) => ({ ...p, response: [] })),
  );
  return restructuredPrompts;
}

/**
Retrieves field prompts for a curated goal template and associated goals for Activity Reports.
We need things a little bit differently for Activity Reports as we need it per grant.
@param goalTemplateId - The ID of the goal template to retrieve prompts for.
@param goalIds - An array of goal IDs to retrieve responses for. Can be null if no
  responses are needed.
@returns Any array of field prompt responses and prompts.
*/
export async function getFieldPromptsForActivityReports(
  goalTemplateId: number,
  goalIds: number[] | null,
): Promise<FieldPrompts[]> {
  // Collect the data from the DB for the passed goalTemplate and goalIds
  // and return the prompts with the responses for the passed goalIds
  const [prompts, responses] = await Promise.all([
    GoalTemplateFieldPromptModel.findAll({
      attributes: [
        ['id', 'promptId'],
        'ordinal',
        'title',
        'prompt',
        'hint',
        'caution',
        'fieldType',
        'options',
        'validations',
        'goalTemplateId',
      ],
      where: { goalTemplateId },
      order: [['ordinal', 'asc']],
      raw: true,
    }),
    GoalFieldResponseModel.findAll({
      attributes: [
        ['goalTemplateFieldPromptId', 'promptId'],
        'response',
        [
          sequelize.fn('ARRAY_AGG', sequelize.fn('DISTINCT', sequelize.col('"GoalFieldResponse"."goalId"'))),
          'goalIds',
        ],
        [
          sequelize.col('"goal"."grantId"'),
          'grantId',
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
          where: { id: goalTemplateId },
        }],
      },
      {
        model: GoalModel,
        as: 'goal',
        required: true,
        attributes: [],
      }],
      group: [
        '"GoalFieldResponse"."goalTemplateFieldPromptId"',
        '"GoalFieldResponse"."response"',
        '"goal"."grantId"',
      ],
      raw: true,
    }),
  ]);

  // restructure the collected data into one object with all responses for the passed goalIds if
  // any exists

  const restructuredPrompts = responses.reduce(
    (
      promptsWithResponses: FieldPrompts[],
      response: PromptResponse,
    ) => {
      // Find the matching prompt for this response.
      const matchingPrompt = prompts.find((p) => p.promptId === response.promptId);
      if (matchingPrompt) {
        promptsWithResponses.push({
          ...matchingPrompt,
          grantId: response.grantId,
          response: response.response ? [...response.response] : [],
        });
      }
      return promptsWithResponses;
    },
    [],
  );
  return [restructuredPrompts, prompts];
}

/**
 * Validates the response for a given prompt based on its requirements.
 * @param {string[]} response - The response to validate.
 * @param {any} promptRequirements - The requirements of the prompt.
 * @throws Will throw an error if the response is invalid.
 */
export function validatePromptResponse(response: string[], promptRequirements) {
  if (promptRequirements.fieldType === PROMPT_FIELD_TYPE.MULTISELECT) {
    if (response && response.filter((r) => !promptRequirements.options.includes(r)).length > 0) {
      throw new Error(
        `Response for '${promptRequirements.title}' contains invalid values. Invalid values: ${
          response.filter((r) => !promptRequirements.options.includes(r)).map((r) => `'${r}'`).join(', ')
        }.`,
      );
    }

    if (promptRequirements.validations) {
      const { rules } = promptRequirements.validations;

      if (rules) {
        const maxSelections = (() => {
          const max = rules?.find((r) => r.name === 'maxSelections');
          if (max) {
            return max.value;
          }
          return false;
        })();

        if (maxSelections && response && response.length > maxSelections) {
          throw new Error(
            `Response for '${promptRequirements.title}' contains more than max allowed selections. ${response.length} found, ${maxSelections} or less expected.`,
          );
        }
      }
    }
  }
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
        [sequelize.col('Goal.id'), 'goalId'],
        [sequelize.col('prompts.id'), 'promptId'],
        [sequelize.col('prompts.ordinal'), 'ordinal'],
        [sequelize.col('responses.response'), 'response'],
      ],
      where: {
        id: goalIds,
        [Op.or]: [
          { '$prompts.id$': { [Op.eq]: sequelize.col('responses.goalTemplateFieldPromptId') } },
          { '$"responses"."id"$': null },
        ],
      },
      include: [{
        attributes: [],
        model: GoalFieldResponseModel,
        as: 'responses',
        required: false,
        where: {
          goalTemplateFieldPromptId: promptId,
        },
      }, {
        attributes: [],
        model: GoalTemplateFieldPromptModel,
        as: 'prompts',
        required: true,
        where: { id: promptId },
      }],
      raw: true,
    }),
    GoalTemplateFieldPromptModel.findOne({
      attributes: [
        ['id', 'promptId'],
        'title',
        'fieldType',
        'options',
        'validations',
      ],
      where: { id: promptId },
      raw: true,
    }),
  ]);
  if (!promptRequirements) {
    throw new Error(`No prompt found with ID ${promptId}`);
  }

  // We always want to update the goal field response when saving the report.
  const goalIdsToUpdate = currentResponses
    .map((r) => r.goalId);

  const recordsToCreate = goalIds.filter((id) => currentResponses.every((r) => r.goalId !== id))
    .map((goalId) => ({
      goalId,
      goalTemplateFieldPromptId: promptId,
      response,
    }));
  if (goalIdsToUpdate.length || recordsToCreate.length) {
    validatePromptResponse(response, promptRequirements);

    return Promise.all([
      GoalFieldResponseModel.update(
        { response },
        {
          where: {
            // GoalFieldResponses should always be updated regardless of on approved ar.
            goalTemplateFieldPromptId: promptId,
            goalId: goalIdsToUpdate,
          },
          individualHooks: true,
        },
      ),
      ...recordsToCreate.map(async (rtc) => GoalFieldResponseModel.create(rtc)),
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

/**
Retrieves field prompts for template name.
@param name - Name of the goal field template prompt to retrieve templates.
@returns An array of Field Prompts for the named goal template prompt.
*/
export async function getOptionsByGoalTemplateFieldPromptName(
  name: string,
): Promise<FieldPrompts[]> {
  return GoalTemplateFieldPromptModel.findOne({
    attributes: ['options'],
    where: { title: name },
  });
}
