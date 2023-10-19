/* eslint-disable @typescript-eslint/no-explicit-any */
import merge from 'deepmerge';
import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import db from '../../models';

const {
  ReportPageState,
} = db;

/**
 * Synchronizes the report page states by filtering and updating the data.
 * @param report - The report object containing the id and type.
 * @param data - The data to be filtered and updated.
 * @returns A promise that resolves to an object with the promises array and unmatched data.
 */
const syncReportPageStates = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data,
): Promise<{ promises: Promise<any>, unmatched }> => {
  // Array to store promises for database operations
  const promises:Promise<any>[] = [];

  // Filter the data based on the report id and get matched and unmatched data
  const {
    matched,
    unmatched,
  } = await filterDataToModel(
    {
      ...data,
      reportId: report.id,
    },
    ReportPageState,
  );

  // Find the current page state for the report
  const currentPageState = await ReportPageState.findOne({
    where: { reportId: report.id },
  });

  if (currentPageState) {
    // Merge the matched page state with the current page state
    const mergedMatched = {
      ...matched,
      pageState: merge(currentPageState.pageState, matched.pageState),
    };

    // Collect the changed values between the merged matched data and the current page state
    const changedData = collectChangedValues(mergedMatched, currentPageState);

    // Update the current page state with the changed data
    promises.push(ReportPageState.update(
      changedData,
      {
        where: {
          reportId: report.id,
        },
        individualHooks: true,
      },
    ));
  } else {
    // Create a new page state using the matched data
    promises.push(ReportPageState.create(matched));
  }

  // Return the promises array and unmatched data
  return {
    promises: Promise.all(promises),
    unmatched,
  };
};

/**
 * includeReportPageStates is a function that returns an object representing the
 * inclusion of ReportPageState model in a query. It specifies the attributes to
 * be included, sets an alias for the included model, and indicates whether it is
 * required or not.
 *
 * @returns {Object} - The inclusion object.
 */
const includeReportPageStates = () => ({
  // Specify the model to be included
  model: ReportPageState,
  // Set an alias for the included model
  as: 'reportPageStates',
  // Specify the attributes to be included
  attributes: [
    'id',
    'pageState',
    'updatedAt',
  ],
  // Indicate whether the inclusion is required or not
  required: false,
});

/**
 * Retrieves the page states for a given report.
 * @param report - The report object containing the report ID and type.
 * @returns A promise that resolves to an array of report page states.
 */
const getReportPageStates = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
) => includeToFindAll(
  includeReportPageStates,
  {
    reportId: report.id,
  },
);

export {
  syncReportPageStates,
  getReportPageStates,
  includeReportPageStates,
};
