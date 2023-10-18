import {
  filterDataToModel,
  collectChangedValues,
  includeToFindAll,
} from '../../lib/modelUtils';
import db from '../../models';
import {
  REPORT_TYPE,
} from '../../constants';
import {
  includeReportTrainingEvent,
} from './reportTrainingEvent';

const {
  ReportTrainingSession,
  Organizer,
} = db;

/**
 * Creates or updates a report training session.
 * @param {object} data - The data for the report training session.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
const createOrUpdateReportTrainingSession = async (
  data,
) => {
  let reportTrainingSession;

  // Check if data has an id to determine if it's a new report or an update
  if (data.id) {
    reportTrainingSession = await ReportTrainingSession.findById(data.id);

    // Collect the changed values between the existing report and the updated data
    const changedData = collectChangedValues(data, reportTrainingSession);

    // If there are changes, update the report training session
    if (changedData.length) {
      return ReportTrainingSession.update(
        changedData,
        { individualHooks: true },
      );
    }
  } else {
    // If no id is present, it's a new report, so create it
    return ReportTrainingSession
      .create(data); // TODO: have create return the object
  }

  // Return a resolved promise if no action is taken
  return Promise.resolve();
};

/**
 * This function synchronously reports a training session by filtering the data to the corresponding
 * model and creating or updating the report.
 * @param report - The report object containing the id and type of the report.
 * @param data - The data to be filtered and reported.
 * @returns An object with promises for creating or updating the report and any unmatched data.
 */
const syncReportTrainingSession = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data,
) => {
  // Filter the data to the corresponding model and get the matched and unmatched data
  const {
    matched,
    unmatched,
  } = await filterDataToModel(
    {
      ...data,
      reportId: report.id,
      reportType: report.type,
    },
    ReportTrainingSession,
  );

  return {
    // Create or update the report using the matched data and return the promise
    promises: Promise.all([
      createOrUpdateReportTrainingSession(matched),
    ]),
    // Return the unmatched data
    unmatched,
  };
};

/**
 * Returns an async function that includes a report training session with specified
 * attributes and associations.
 * @returns {Promise<Object>} - The included report training session object.
 */
const includeReportTrainingSession = async () => ({
  model: ReportTrainingSession, // The model to include
  as: 'reportTrainingSession', // The alias for the included model
  required: true, // Specifies if the inclusion is required or optional
  attributes: [ // The attributes of the included model to retrieve
    'id',
    'regionId',
    'name',
    'reportTrainingEventId',
    'createdAt',
    'updatedAt',
  ],
  include: [ // The associations to include
    includeReportTrainingEvent(), // Function call to include report training event
  ],
});

/**
 * Retrieves the report training session for a given report ID.
 * @param reportId - The ID of the report.
 * @returns A promise that resolves to the report training session.
 */
const getReportTrainingSession = async (
  reportId: number,
) => includeToFindAll(
  includeReportTrainingSession,
  {
    reportId,
  },
);

export {
  syncReportTrainingSession,
  includeReportTrainingSession,
  getReportTrainingSession,
};
