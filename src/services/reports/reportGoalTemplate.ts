export {};
const { Op } = require('sequelize');
const {
  GoalTemplate,
  Grant,
  ReportGoalTemplate,
} = require('../../models');
const { auditLoger } = require('../../logger');

// TODO: this needs alot of work
const syncGoalTemplates = async (
  report: { id: number, type: string, regionId: number },
  goalTemplates: ({ goalTemplateId?: number, name: string })[],
) => {
  try {
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
      ReportGoalTemplate.findAll({
        attributes: [
          // filter this down to whats needed.
        ],
        where: {
          reportId: report.id, // Filter by report id
          regionId: report.regionId, // Filter by region id
        },
        include: [
          {
            model: GoalTemplate,
            as: 'goalTemplate',
          },
        ],
      }),
      GoalTemplate.findAll({
        attributes: [
          ['id', 'goalTemplateId'], // Rename id column to goalTemplateId
          ['templateName', 'name'], // Rename templateName column to name
          ['regionId'], // Include regionId column
        ],
        where: {
          regionId: report.regionId, // Filter by region id
          [Op.or]: {
            // Filter goalTemplates array for objects with goalTemplateId property and map to an
            // array of goalTemplateIds
            id: goalTemplates
              .filter((goalTemplate) => Object.keys(goalTemplate).includes('goalTemplateId'))
              .map((goalTemplate) => goalTemplate?.goalTemplateId),
            // Filter goalTemplates array for objects with name property and map to an
            // array of names
            name: goalTemplates
              .filter((goalTemplate) => Object.keys(goalTemplate).includes('name'))
              .map(({ name }) => name),
          },
        },
        raw: true, // Return raw data instead of Sequelize models
      }),
    ]);
    // make any needed new goalTemplates
    const newGoalTemplates = await Promise.all(goalTemplates // Array of goal templates
      .filter((goalTemplate) => ( // Filter out existing goal templates
        !(
          (
            goalTemplate?.goalTemplateId // Check if goal template has an ID
            && matchingGoalTemplates
              .map(({ goalTemplateId }) => goalTemplateId)
              .includes(goalTemplate)
          ) || (
            goalTemplate?.name // Check if goal template has a name
            && matchingGoalTemplates
              .map(({ name }) => name)
              .includes(goalTemplate.name)
          )
        )
      ))
      .map(async (goalTemplate) => GoalTemplate.create( // Create new goal templates
        {
          templateName: goalTemplate.name, // Set the template name
          regionId: report.regionId, // Set the region ID
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
      ...goalTemplates.reduce((acc, goalTemplate) => {
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
        if (!goalTemplates
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
        deltaLists.creationList.map(async (createItem) => ReportGoalTemplate.create({
          reportId: report.id,
          goalTemplateId: createItem.goalTemplateId,
        }))
      ),
      ...(
        deltaLists.updateList
        && deltaLists.updateList.length
        && ReportGoalTemplate.update() // TODO: is update required
      ),
    ]);
  } catch (err) {
    auditLoger.error(err);
    throw err;
  }
};

const getGoalTemplates = async (
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

const getGoalTemplate = async (
  report: { id: number, type: string, regionId: number },
  goalTemplateId: number,
):Promise<object[]> => getGoalTemplates(report, [goalTemplateId]);

module.exports = {
  syncGoalTemplates,
  getGoalTemplates,
  getGoalTemplate,
};
