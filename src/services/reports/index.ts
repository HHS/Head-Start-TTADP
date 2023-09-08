import db from '../../models';
import { REPORT_TYPE, COLLABORATOR_TYPES, NEXTSTEP_NOTETYPE } from '../../constants';
import { syncReport } from './report';
import { syncReportCollaborator, includeReportCollaborator } from './reportCollaborator';
import { syncReportGoal, includeReportGoal } from './reportGoal';
import { syncReportGoalTemplate, includeReportGoalTemplate } from './reportGoalTemplate';
import { syncReportImport, includeReportImport } from './reportImport';
import { syncReportNationalCenter, includeReportNationalCenter } from './reportNationalCenter';
import { syncReportNextStep, includeReportNextStep } from './reportNextStep';
import { syncReportObjective, includeReportObjective } from './reportObjective';
import { syncReportObjectiveTemplate, includeReportObjectiveTemplate } from './reportObjectiveTemplate';
import { syncReportPageState, includeReportPageState } from './reportPageState';
import { syncReportParticipation, includeReportParticipation } from './reportParticipation';
import { syncReportReason, includeReportReason } from './reportReason';
import { syncReportRecipient, includeReportRecipient } from './reportRecipient';
import { syncReportTargetPopulation, includeReportTargetPopulation } from './reportTargetPopulation';
import { syncReportTrainingEvent, getReportTrainingEvent, getReportTrainingEvents } from './reportTrainingEvent';
import { syncReportTrainingSession, getReportTrainingSession, getReportTrainingSessions } from './reportTrainingSession';

const {
  Report,
  ReportCollaborator,
  ReportGoal,
  ReportGoalTemplate,
  ReportImport,
  ReportNationalCenter,
  ReportNextStep,
  ReportObjective,
  ReportObjectiveTemplate,
  ReportPageState,
  ReportParticipation,
  ReportReason,
  ReportRecipient,
  ReportTargetPopulation,
  ReportTrainingEvent,
  ReportTrainingSession,
} = db;

const actions = {
  [REPORT_TYPE.REPORT_TRAINING_EVENT]: {
    syncer: syncReportTrainingEvent,
    processorModels: [
      [syncReportNationalCenter],
      [syncReportCollaborator, [
        COLLABORATOR_TYPES.OWNER,
        COLLABORATOR_TYPES.INSTANTIATOR,
        COLLABORATOR_TYPES.EDITOR,
      ]],
      [syncReportReason],
      [syncReportTargetPopulation],
      [syncReportImport],
      [syncReportPageState],
      [syncReportGoalTemplate],
    ],
    includes: [
      [includeReportTrainingEvent],
      [includeReportNationalCenter],
      [includeReportCollaborator, [
        COLLABORATOR_TYPES.OWNER,
        COLLABORATOR_TYPES.INSTANTIATOR,
        COLLABORATOR_TYPES.EDITOR,
      ]],
      [includeReportReason],
      [includeReportTargetPopulation],
      [includeReportImport],
      [includeReportPageState],
      [includeReportGoalTemplate],
    ],
  },
  [REPORT_TYPE.REPORT_TRAINING_SESSION]: {
    syncer: syncReportTrainingSession,
    processorModels: [
      [syncReportCollaborator, [
        COLLABORATOR_TYPES.OWNER,
        COLLABORATOR_TYPES.INSTANTIATOR]],
      [syncReportRecipient],
      [syncReportGoalTemplate],
      [syncReportObjectiveTemplate],
      [syncReportGoal],
      [syncReportObjective],
      [syncReportNextStep, [
        NEXTSTEP_NOTETYPE.RECIPIENT,
        NEXTSTEP_NOTETYPE.SPECIALIST,
      ]],
      [syncReportParticipation],
      [syncReportPageState],
    ],
    includes: [
      [includeTrainingSession],
      [includeReportCollaborator, [
        COLLABORATOR_TYPES.OWNER,
        COLLABORATOR_TYPES.INSTANTIATOR]],
      [includeReportRecipient],
      [includeReportGoalTemplate],
      [includeReportObjectiveTemplate],
      [includeReportGoal],
      [includeReportObjective],
      [includeReportNextStep, [
        NEXTSTEP_NOTETYPE.RECIPIENT,
        NEXTSTEP_NOTETYPE.SPECIALIST,
      ]],
      [includeReportParticipation],
      [includeReportPageState],
    ],
  },
};

/**
 * This function takes in multiple objects and returns a new object that contains only the
 * common properties among all the objects. If a property is an object itself, the function
 * recursively applies the same logic to find the common properties within the nested objects.
 * @param objects - The objects to intersect
 * @returns An object containing the common properties among all the objects
 */
const intersectObjects = (...objects: object[]): object => objects.reduce((result, obj) => {
  const reducedResult = {}; // Create an empty object to store the common properties
  Object.keys(result).forEach((key) => { // Iterate over the keys of the result object
    if (key in obj) { // Check if the key exists in the current object
      if (typeof result[key] === 'object' && typeof obj[key] === 'object') { // Check if both values are objects
        // Recursively call the function for nested objects
        const nestedResult = intersectObjects(result[key], obj[key]);
        // Check if there are any common properties in the nested objects
        if (Object.keys(nestedResult).length > 0) {
          reducedResult[key] = nestedResult; // Add the nested result to the reduced result
        }
      } else {
        reducedResult[key] = result[key]; // Add the common property to the reduced result
      }
    }
  });
  return reducedResult; // Return the final reduced result
});

/**
 * Retrieves all reports of a specific type and with specified IDs, includes, and scope.
 * @param reportType - The type of report to retrieve.
 * @param reportIds - An array of report IDs to filter the results.
 * @param includes - An array of objects specifying the associations to include in the results.
 * @param scope - An optional object specifying additional filtering criteria.
 * @returns A promise that resolves to an array of reports matching the specified criteria.
 */
const getAllTypedReports = async (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
  reportIds: number[],
  includes: object[],
  scope?: object,
) => Report.findAll({
  attributes: [], // Exclude all attributes from the result set
  where: {
    ...(reportIds && reportIds.length && { id: reportIds }), // Filter by report IDs if provided
    reportType, // Filter by report type
    ...(scope && { scope }), // Filter by scope if provided
  },
  includes: [
    ...(includes && includes.length && { includes}), // Include associations if provided
  ],
});

/**
 * Retrieves a single typed report based on the specified report type, report ID, includes, and
 * scope.
 * @param reportType - The type of the report to retrieve.
 * @param reportId - The ID of the report to retrieve.
 * @param includes - An array of objects specifying the related data to include in the report.
 * @param scope - An optional object specifying the scope of the report.
 * @returns A promise that resolves to the retrieved report.
 */
const getOneTypedReport = async (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
  reportId: number,
  includes: object[],
  scope?: object,
) => getAllTypedReports(reportType, [reportId], includes, scope);

/**
 * This function collects includes based on the given report type.
 * @param {string} reportType - The type of report.
 * @returns {Array} - An array of includes generated based on the report type.
 */
const collectIncludes = (reportType) => {
  // Destructure the 'includes' property from the actions object for the given report type
  const { includes } = actions[reportType];

  // Check if 'includes' is defined and not an empty array
  return (includes && includes.length)
    ? includes.map(([typedInclude, metaDate]) => {
      // Check if 'metaDate' is defined and not an empty array
      if (metaDate && metaDate.length) {
        // Generate multiple includes based on the metadata
        return metaDate.map((md) => typedInclude(
          reportType,
          md,
        ));
      }
      // Generate a single include without metadata
      return typedInclude(reportType);
    })
    : [];
};

/**
 * This function performs a synchronization process for a given report type and data.
 * It first calls the `syncReport` function to retrieve a report and unmatched data from it.
 * Then, it calls the `syncer` function to synchronize the data with the processor models.
 * Finally, it calculates the unmatched data by intersecting the unmatched data from the report and
 * the typed unmatched sets.
 * TODO: The unmatched data should be stored or logged somewhere.
 *
 * @param reportType - The type of the report to sync.
 * @param data - The data to sync.
 */
const sync = async (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
  data: object,
) => {
  // Retrieve the syncer and processorModels for the given reportType
  const { syncer, processorModels } = actions[reportType];

  // Call syncReport to get the report and unmatched data
  const { report, unmatched: unmatchedFromReport } = await syncReport({
    ...data,
    ...(!Object.keys(data).includes('reportType') && { reportType }),
  });

  // Call syncer to sync the data with the processor models
  const { typedReport, unmatchedSets: typedUnmatchedSets } = await syncer(
    {
      ...data,
      reportId: report.reportId,
    },
    processorModels,
  );

  // Calculate the unmatched data by intersecting the unmatched data from the report and the
  // typed unmatched sets
  const unmatchedData = intersectObjects([
    unmatchedFromReport,
    ...typedUnmatchedSets,
  ]);

  // TODO: store/log it some where
};

/**
 * Retrieves a single report based on the given report type and ID.
 * @param reportType - The type of the report to retrieve.
 * @param reportId - The ID of the report to retrieve.
 * @param scope - Optional parameter specifying the scope of the report.
 * @returns A promise that resolves to the retrieved report.
 */
const getOne = async (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
  reportId: number,
  scope?: object,
  // Call the getOneTypedReport function with the provided parameters
) => getOneTypedReport(
  reportType,
  reportId,
  collectIncludes(reportType),
  scope,
);

const getAll = async (
  /**
   * Retrieves all reports of a given type and with specified IDs.
   * @param reportType - The type of report to retrieve.
   * @param reportIds - An array of report IDs to retrieve.
   * @param scope - Optional scope object for filtering the reports.
   * @returns A promise that resolves to an array of typed reports.
   */
  const getAll = async (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
  reportIds: number[],
  scope?: object,
  // Call the function `getAllTypedReports` with the provided arguments
  // and return the result.
) => getAllTypedReports(
    reportType,
    reportIds,
    collectIncludes(reportType),
    scope,
  );

export {
  sync,
  getOne,
  getAll,
};
