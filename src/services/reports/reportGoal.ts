export {};
const {
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Grant,
  ReportGoal,
  ReportGoalFieldResponse,
  ReportGoalTemplate,
  ReportGoalTemplateFieldPrompt,
} = require('../../models');
const { auditLoger } = require('../../logger');

// TODO: this needs alot of work
const syncReportGoals = async (
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

const getReportGoals = async (
  reportId: number,
  goalIds: number[] | null = null,
):Promise<object[]> => ReportGoal.findAll({
  attributes: [
    // TODO: filter this down to whats needed.
  ],
  where: {
    reportId,
    ...(goalIds && { goalIds }),
  },
  include: [
    // TODO: fill out anything thats needed
  ],
});

const getReportGoal = async (
  reportId: number,
  goalId: number,
):Promise<object[]> => getReportGoals(reportId, [goalId]);

const includeReportGoals = () => ({
  model: ReportGoal,
  as: 'reportGoals',
  required: false,
  attributes: [], // TODO: fill this out
  include: [
    {
      model: ReportGoalTemplate,
    },
    {
      model: GoalTemplate,
    },
    {
      model: Goal,
    },
  ],
});

module.exports = {
  syncReportGoals,
  getReportGoals,
  getReportGoal,
};
