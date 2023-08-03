export {};
const {
  Grant,
  ReportGoal,
} = require('../../models');
const { auditLoger } = require('../../logger');

// TODO: this needs alot of work
const syncGoals = async (
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

const getGoals = async (
  reportId: number,
  goalIds: number[] | null = null,
):Promise<object[]> => ReportGoal.findAll({
  attributes: [
    // filter this down to whats needed.
  ],
  where: {
    reportId,
    ...(goalIds && { goalIds }),
  },
  include: [
    // fill out anything thats needed
  ],
});

const getGoal = async (
  reportId: number,
  goalId: number,
):Promise<object[]> => getGoals(reportId, [goalId]);

module.exports = {
  syncGoals,
  getGoals,
  getGoal,
};
