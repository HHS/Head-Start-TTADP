import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import db from '../../models';
import {
  REPORT_TYPE,
  TRAINING_TYPE,
} from '../../constants';

const {
  ReportTrainingEvent,
  Organizer,
} = db;

interface ReportTrainingEventDataType {
  id?: number,
  regionId?: number,
  name?: string,
  organizerId?: number,
  trainingType?: typeof TRAINING_TYPE[keyof typeof TRAINING_TYPE],
  vision?: string,
}

/**
 * Represents a mapping between keys and values for remapping training event reports.
 * @remarks
 * The keys represent the original property names, while the values represent the new
 * property names.
 */
const reportTrainingEventRemapping: Record<string, string> = {
  reportTrainingEventId: 'id',
};

/**
 * Creates or updates a report training event.
 * @param data - The data for the report training event.
 * @returns A promise that resolves when the operation is complete.
 */
const createOrUpdateReportTrainingEvent = async (
  data: ReportTrainingEventDataType,
) => {
  let reportTrainingEvent;

  // Check if data has an id to determine if it's a new report or an update
  if (data.id) {
    // If it's an update, find the existing report training event by id
    reportTrainingEvent = await ReportTrainingEvent.findById(data.id);

    // Collect the changed values between the new data and the existing report training event
    const changedData = collectChangedValues(data, reportTrainingEvent);

    // If there are changed values, update the report training event
    if (changedData.length) {
      return ReportTrainingEvent.update(
        changedData,
        { individualHooks: true },
      );
    }
  } else {
    // If it's a new report, create a new report training event
    return ReportTrainingEvent
      .create(data);
  }

  // Return a resolved promise if no action is taken
  return Promise.resolve();
};

/**
 * This function takes a report object and data, filters the data to match the model,
 * creates or updates the report training event, and returns the promises for the
 * createOrUpdateReportTrainingEvent operation and the unmatched data.
 *
 * @param report - The report object containing the id and type.
 * @param data - The data to filter and process.
 * @returns An object with the promises for createOrUpdateReportTrainingEvent and the
 * unmatched data.
 */
const syncReportTrainingEvent = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data: ReportTrainingEventDataType,
) => {
  // Filter the data to match the model and get the matched and unmatched data
  const {
    matched,
    unmatched,
  } = await filterDataToModel(
    {
      ...data,
      reportId: report.id,
      reportType: report.type,
    },
    ReportTrainingEvent,
  );

  return {
    // Return the promises for createOrUpdateReportTrainingEvent
    promises: Promise.all([
      createOrUpdateReportTrainingEvent(matched),
    ]),
    // Return the unmatched data
    unmatched,
  };
};

/**
 * Returns an object that represents the inclusion of a ReportTrainingEvent model in a query.
 * The included ReportTrainingEvent model is required and has specific attributes.
 * It also includes the Organizer model with specific attributes.
 */
const includeReportTrainingEvent = () => ({
  // Define the model to be included
  model: ReportTrainingEvent,
  // Set an alias for the included model
  as: 'reportTrainingEvents',
  // Specify that the included model is required
  required: true,
  // Define the attributes to be selected from the included model
  attributes: [
    'id',
    'regionId',
    'name',
    'trainingType',
    'vision',
    'createdAt',
    'updatedAt',
  ],
  // Include the Organizer model
  include: [
    {
      // Define the model to be included
      model: Organizer,
      // Set an alias for the included model
      as: 'organizer',
      // Specify that the included model is required
      required: true,
      // Define the attributes to be selected from the included model
      attributes: [
        'id',
        'name',
      ],
    },
  ],
});

/**
 * Retrieves a report training event.
 * @param reportId - The ID of the report.
 * @returns A promise that resolves to the report training event.
 */
const getReportTrainingEvent = async (
  reportId: number,
) => includeToFindAll(
  includeReportTrainingEvent, // Include the report training event in the query
  {
    reportId, // Filter the query by report ID
  },
);

export {
  syncReportTrainingEvent,
  includeReportTrainingEvent,
  getReportTrainingEvent,
};
