export {};
const {
  Grant,
  ReportGoalTemplate,
} = require('../../models');
const { auditLoger } = require('../../logger');

// TODO: this needs alot of work
const syncGoalTemplates = async (
  reportId: number,
) => {
  try {
  // in parallel:
  //    validate that the type is valid for the report type
  //    get current collaborators for this report having this type
  // filter to the positive, nuteral, and negative lists
  // in parallel:
  //    perform in insert/update/delete based on the sub lists
  //        if a sublist is empty, do not call the db at all for that sublist
  } catch (err) {
    auditLoger.error(err);
    throw err;
  }
};

const getGoalTemplates = async (
  reportId: number,
  goalTemplateIds: number[] | null = null,
):Promise<object[]> => ReportGoalTemplate.findAll({
  attributes: [
    // filter this down to whats needed.
  ],
  where: {
    reportId,
    ...(goalTemplateIds && { goalTemplateIds }),
  },
  include: [
    // fill out anything thats needed
  ],
});

const getGoalTemplate = async (
  reportId: number,
  goalTemplateId: number,
):Promise<object[]> => getGoalTemplates(reportId, [goalTemplateId]);

module.exports = {
  syncGoalTemplates,
  getGoalTemplates,
  getGoalTemplate,
};
