import db from '../../models';
import { REPORT_TYPE, COLLABORATOR_TYPES, NEXTSTEP_NOTETYPE } from '../../constants';
import { syncReport } from './report';
import { syncReportApproval, includeReportApproval } from './reportApproval';
import { syncReportAudiences, includeReportAudience } from './reportAudience';
import { syncReportCollaboratorsForType, includeReportCollaborator } from './reportCollaborator';
import { syncReportGoals, includeReportGoal } from './reportGoal';
import { syncReportGoalTemplates, includeReportGoalTemplate } from './reportGoalTemplate';
import { syncReportImport, includeReportImport } from './reportImport';
import { syncReportNationalCenter, includeReportNationalCenter } from './reportNationalCenter';
import { syncReportNextStep, includeReportNextStep } from './reportNextStep';
import { syncReportObjective, includeReportObjective } from './reportObjective';
import { syncReportObjectiveTemplate, includeReportObjectiveTemplate } from './reportObjectiveTemplate';
import { syncReportPageStates, includeReportPageStates } from './reportPageState';
import { syncReportParticipation, includeReportParticipation } from './reportParticipation';
import { syncReportReasons, includeReportReasons } from './reportReason';
import { syncReportRecipients, includeReportRecipients } from './reportRecipient';
import { syncReportResources, includeReportResources } from './reportResource';
import { syncReportTargetPopulations, includeReportTargetPopulations } from './reportTargetPopulation';
import { syncReportTrainingEvent, includeReportTrainingEvent } from './reportTrainingEvent';
import { syncReportTrainingSession, includeReportTrainingSession } from './reportTrainingSession';
import { RemappingDefinition, remap } from '../../lib/modelUtils';

const {
  Report,
  ReportApproval,
  ReportAudience,
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

type Actions = {
  [key: string]: {
    report: {
      remapDef: RemappingDefinition,
    },
    syncers: {
      func: Function,
      type?: string,
      remapDef: RemappingDefinition
    }[],
    includes: {
      func: Function,
      type?: string,
    }[],
  },
};

const actions:Actions = {
  [REPORT_TYPE.REPORT_TRAINING_EVENT]: {
    report: {
      remapDef: {
        'data.id': 'id',
        'data.status': 'status.name',
        'data.startDate': 'startDate',
        'data.endDate': 'endDate',
      },
    },
    syncers: [
      {
        func: syncReportTrainingEvent,
        remapDef: {
          'data."Event ID': 'eventId',
          'regionId': 'regionId',
          'data."Edit Title"': 'name',
          'data.eventOrganizer': 'organizer.name',
          'data."Audience"': 'audience.*',
          'data.vision': 'vision',
        },
      },
      { func: syncReportAudiences, remapDef: { 'data.audience.*': '*.name' } },
      { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.INSTANTIATOR, remapDef: { 'data.owner': `0` } },
      { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.OWNER, remapDef: { 'ownerId': `0.id` } },
      { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.EDITOR, remapDef: { 'collaboratorIds.*': `*.id` } },
      { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.POC, remapDef: { 'pocIds.*': `*.id` } },
      { func: syncReportGoalTemplates, remapDef: { 'data.goal': '0.name', 'regionId': '0.regionId' } },
      { func: syncReportImport, remapDef: { 'imported': 'import' } },
      { func: syncReportNationalCenter, remapDef: { 'data."National Center(s) Requested".*': '*.name'} },
      { func: syncReportPageStates, remapDef: { 'data.pageState': 'pageState' } },
      { func: syncReportReasons, remapDef: { 'data.reasons.*': '*.name' } },
      { func: syncReportResources, remapDef: { } },
      { func: syncReportTargetPopulations, remapDef: { 'data."Target Population(s)".*': '*.name'} },
    ],
    includes: [
      { func: includeReportTrainingEvent },
      { func: includeReportAudience },
      { func: includeReportCollaborator, type: COLLABORATOR_TYPES.OWNER },
      { func: includeReportCollaborator, type: COLLABORATOR_TYPES.INSTANTIATOR },
      { func: includeReportCollaborator, type: COLLABORATOR_TYPES.EDITOR },
      { func: includeReportCollaborator, type: COLLABORATOR_TYPES.POC },
      { func: includeReportGoalTemplate },
      { func: includeReportImport },
      { func: includeReportNationalCenter},
      { func: includeReportPageStates },
      { func: includeReportReasons },
      { func: includeReportTargetPopulations },
    ],
  },
  [REPORT_TYPE.REPORT_TRAINING_SESSION]: {
    report: {
      remapDef: {
        'data.id': 'id',
        'data.status': 'status.name',
        'data.context': 'context',
        'data.startDate': 'startDate',
        'data.endDate': 'endDate',
      },
    },
    syncers: [
        {
        func: syncReportTrainingSession,
        remapDef: {
          'data.eventDisplayId': 'id',
          'regionId': 'regionId',
          'eventId': 'reportTrainingEventId',
          'data.sessionName': 'name',
        },
      },
      { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.INSTANTIATOR, remapDef: { 'data.ownerId': `0.id`, 'data.eventOwner': '0.id' } },
      { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.OWNER, remapDef: { 'ownerId': `0.id`} },
      // { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.EDITOR, remapDef: { 'collaboratorIds.*': `*.id`} },
      // { func: syncReportCollaboratorsForType, type: COLLABORATOR_TYPES.POC, remapDef: { 'pocIds.*': `*.id`} },
      { func: syncReportRecipients, remapDef: { 'data.recipients.*': '*' } },
      {
        func: syncReportObjectiveTemplate,
        remapDef: {
          'data.objective': '0.title',
          'data.ttaProvided': '0.ttaProvided',
          'data.supportType': '0.supportType',
          'data.files': '0.files',
          'data.objectiveResources': '0.resources',
          'data.topics': '0.topics',
          'data.objectiveTrainers': '0.trainers',
        },
      },
      { func: syncReportNextStep, type: NEXTSTEP_NOTETYPE.RECIPIENT, remapDef: { 'data.recipientNextSteps.*': '*' } },
      { func: syncReportNextStep, type: NEXTSTEP_NOTETYPE.SPECIALIST, remapDef: { 'data.specialistNextSteps.*': '*' } },
      {
        func: syncReportParticipation,
        remapDef: {
          'data.deliveryMethod': 'deliveryMethod',
          'data.numberOfParticipants': 'numberOfParticipants',
          'data.numberOfParticipantsInPerson': 'numberOfParticipantsInPerson',
          'data.numberOfParticipantsVirtually': 'numberOfParticipantsVirtually',
          'data.participants': 'participants',
        },
      },
      { func: syncReportPageStates, remapDef: { 'data.pageState': 'pageState' } },
    ],
    includes: [
      { func: includeReportTrainingSession },
      { func: includeReportCollaborator, type: COLLABORATOR_TYPES.OWNER },
      { func: includeReportCollaborator, type: COLLABORATOR_TYPES.INSTANTIATOR },
      { func: includeReportGoal },
      { func: includeReportGoalTemplate },
      { func: includeReportNextStep, type: NEXTSTEP_NOTETYPE.RECIPIENT },
      { func: includeReportNextStep, type: NEXTSTEP_NOTETYPE.SPECIALIST },
      { func: includeReportObjective },
      { func: includeReportObjectiveTemplate },
      { func: includeReportPageStates },
      { func: includeReportParticipation },
      { func: includeReportRecipient },
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
    scope, // Filter by scope if provided
  },
  includes,
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

const syncMetaData = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  syncer: { func: Function, type?: string, remapDef?: RemappingDefinition },
  data,
): Promise<{ promises: Promise<any>[], unmapped: object | object[] }> => {
  const { func, type, remapDef } = syncer;
  let dataToSync;
  let dataNotUsed;
  if (remapDef) {
    ({
      mapped: dataToSync,
      unmapped: dataNotUsed,
    } = remap(
      data,
      remapDef,
      { keepUnmappedValues: false },
    ));
  } else {
    dataToSync = data;
    dataNotUsed = null;
  }

  const { promises, unmatched } = await func(report, dataToSync, type);

  if (remapDef && unmatched && Object.keys(unmatched).length > 0) {
    const { mapped: reverseMapped } = remap(
      unmatched,
      remapDef,
      { reverse: true, keepUnmappedValues: false },
    );
    // TODO: some how merge reverseMapped and dataNotUsed
  }

  return { promises, unmapped: dataNotUsed };
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
  const { report: reportDef, syncers } = actions[reportType];

  const {
    mapped: reportData,
    unmapped: reportUnmappedData,
  } = remap(
    data,
    reportDef.remapDef,
    { keepUnmappedValues: false },
  );

  // Call syncReport to get the report and unmatched data
  const { report, unmatched: unmatchedFromReport } = await syncReport({
    ...reportData,
    ...(!Object.keys(data).includes('reportType') && { reportType }),
  });

  const metaDataResults:{
    promises: Promise<any>[],
    unmapped: object | object[],
  }[] = await Promise.all(syncers
    .map(async (syncer) => syncMetaData(
      { id: report.id, type: reportType },
      syncer,
      data,
    )));

  // await all remaining promises in parallel
  const metadataPromises = await Promise
    .all(metaDataResults.map(({ promises }) => promises).flat());
  const unmatchedFromMetaData = metaDataResults.map(({ unmapped }) => unmapped);

  // Calculate the unmatched data by intersecting the unmatched data from the report and the
  // typed unmatched sets
  const unmatchedData = intersectObjects([
    unmatchedFromReport,
    ...unmatchedFromMetaData,
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
