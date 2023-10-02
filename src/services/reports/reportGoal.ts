import { filterDataToModel, collectChangedValues } from '../../lib/modelUtils';
import db from '../../models';
import { auditLogger } from '../../logger';

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
} = db;

// TODO: this needs alot of work
const syncReportGoals = async (
  reportId: number,
  data,
) => {
  try {
    const { matched, unmatched } = await filterDataToModel(data, ReportGoal);
  // in parallel:
  //    validate that the type is valid for the report type
  //    get current collaborators for this report having this type
  // filter to the positive, nuteral, and negative lists
  // in parallel:
  //    perform in insert/update/delete based on the sub lists
  //        if a sublist is empty, do not call the db at all for that sublist
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

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

export {
  syncReportGoals,
  getReportGoals,
  includeReportGoals,
};
