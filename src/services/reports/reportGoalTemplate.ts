import { Op } from 'sequelize';
import db from '../../models';
import { auditLogger } from '../../logger';

const {
  GoalTemplate,
  ReportGoalTemplate,
} = db;

/**
 * Retrieves the current report goal templates based on the provided reportId.
 * @param reportId - The ID of the report to filter by.
 * @returns A promise that resolves to an array of objects representing the current
 * report goal templates.
 */
const getCurrentReportGoalTemplates = async (
  reportIds: number[],
): Promise<object[]> => ReportGoalTemplate.findAll({ // Find all report goal templates
  attributes: [
    ['reportId'],
    ['goalTemplateId'],
  ],
  where: {
    reportId: reportIds, // Filter by reportId
  },
  include: [
    {
      model: GoalTemplate,
      as: 'goalTemplate',
    },
  ],
});

/**
 * Retrieves matching goal templates based on the provided regionId and goalTemplates array.
 * @param regionId - The ID of the region to filter by.
 * @param goalTemplates - An array of goal templates to filter by.
 * @returns A promise that resolves to an array of matching goal templates.
 */
const getMatchingGoalTemplates = async (
  goalTemplates: ({ goalTemplateId?: number, name?: string, regionId?: number })[],
): Promise<{
  goalTemplateId: number,
  name: string,
  regionId: number | null,
}[]> => GoalTemplate.findAll({
  attributes: [
    ['id', 'goalTemplateId'], // Rename id column to goalTemplateId
    ['templateName', 'name'], // Rename templateName column to name
    ['regionId'], // Include regionId column
  ],
  where: {
    [Op.or]: [
      ...goalTemplates.map(({ goalTemplateId, name, regionId }) => ({
        [Op.and]: {
          [Op.or]: {
            ...(goalTemplateId && { id: goalTemplateId }),
            ...(name && { templateName: name }),
          },
          ...(regionId
            ? { regionId }
            : { regionId: null }),
        },
      })),
    ],
  },
  raw: true, // Return raw data instead of Sequelize models
});

// TODO: this needs alot of work
const syncReportGoalTemplates = async (
  report: { id: number, type: string },
  data: ({ goalTemplateId?: number, name?: string, regionId?: number })[],
) => {
  try {
    const regionIds = [...new Set(
      data.filter(({ regionId }) => regionId).map(({ regionId }) => regionId),
    )];
    // in parallel:
    //    get all the current goalTemplates attached to the report
    //    look up all the passed goalTemplates, wait until the regionId is know before looking
    //      for goalTemplates by name to limit the scope of the search
    const [
      // Array of report goal templates for the current report and region
      currentReportGoalTemplates,
      // Array of goal templates that match the criteria
      matchingGoalTemplates,
    ] = await Promise.all([
      getCurrentReportGoalTemplates(regionIds), // Filter by report ids
      getMatchingGoalTemplates(data),
    ]);
    // make any needed new goalTemplates
    // TODO: issue the usecases needed to be solved here are:
    //    # a new goalTemplate was created
    //    # a existing goalTemplate is referanced wither by number or by text
    //    # a goalTemplate edit is requested... what should be done
    //        # if it is only used on this report, and no children of the report have
    //          reached a foia-able state, then allow the update
    const newGoalTemplates = await Promise.all(data // Array of goal templates
      .filter((goalTemplate) => ( // Filter out existing goal templates
        !(
          (
            goalTemplate?.goalTemplateId // Check if goal template has an ID
            && matchingGoalTemplates
              .filter(({ regionId }) => regionId === goalTemplate?.regionId)
              .map(({ goalTemplateId }) => goalTemplateId)
              .includes(goalTemplate.goalTemplateId)
          ) || (
            goalTemplate?.name // Check if goal template has a name
            && matchingGoalTemplates
              .filter(({ regionId }) => regionId === goalTemplate?.regionId)
              .map(({ name }) => name)
              .includes(goalTemplate.name)
          )
        )
      ))
      .map(async (goalTemplate) => GoalTemplate.create( // Create new goal templates
        {
          templateName: goalTemplate.name, // Set the template name
          regionId: goalTemplate.regionId, // Set the region ID
          creationMethod: null, // TODO: figure out what should go here
        },
        {
          attributes: [
            ['id', 'goalTemplateId'],
            ['templateName', 'name'],
            ['regionId'],
          ],
        },
      )));
    // filter to the positive, nuteral, and negative lists
    const deltaLists = {
      ...data.reduce((acc, goalTemplate) => {
        if (currentReportGoalTemplates
          .map(({ goalTemplateId }) => goalTemplateId)
          .includes(goalTemplate.goalTemplateId)) {
          // is updated
        } else {
          // is new
        }
        return acc;
      }, ({
        creationList: [],
        updateList: [],
      })),
      ...currentReportGoalTemplates.reduce((acc, currentReportGoalTemplate) => {
        if (!data
          .map(({ goalTemplateId }) => goalTemplateId)
          .includes(currentReportGoalTemplate.goalTemplateId)) {
          // is removed
        }
        return acc;
      }, ({ removeList: [] })),
    };
    // in parallel:
    //    perform in insert/update/delete based on the sub lists
    //        if a sublist is empty, do not call the db at all for that sublist
    return await Promise.all([
      ...(
        deltaLists.creationList
        && deltaLists.creationList.length
          ? ReportGoalTemplate.bulkCreate(
            deltaLists.creationList.map((createItem) => ({
              reportId: report.id,
              goalTemplateId: createItem.goalTemplateId,
            })),
          )
          : Promise.resolve()
      ),
      ...(
        deltaLists.updateList
        && deltaLists.updateList.length
          ? ReportGoalTemplate.update() // TODO: is update required
          : Promise.resolve()
      ),
      ...(
        deltaLists.removeList
        && deltaLists.removeList.length
          ? ReportGoalTemplate.destroy({
            where: {
              reportId: report.id,
              goalTemplateId: deltaLists.removeList.map((removeItem) => removeItem.goalTemplateId),
            },
          }) // TODO: is destroy required
          : Promise.resolve()
      ),
    ]);
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

const includeReportGoalTemplates = () => ({
  model: ReportGoalTemplate,
  as: '',
  required: false,
  attributes: [
    'id',
  ],
  includes: [
    {
      model: null, // TODO: finish
    },
  ],
});

const getReportGoalTemplates = async (
  report: { id: number, type: string, regionId: number },
  goalTemplateIds: number[] | null = null,
):Promise<object[]> => ReportGoalTemplate.findAll({
  attributes: [
    // filter this down to whats needed.
  ],
  where: {
    reportId: report.id,
    ...(goalTemplateIds && { goalTemplateIds }),
  },
  include: [
    // fill out anything thats needed
  ],
});

export {
  syncReportGoalTemplates,
  includeReportGoalTemplates,
  getReportGoalTemplates,
};
