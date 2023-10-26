/* eslint-disable @typescript-eslint/ban-types */
import { Op } from 'sequelize';
import db from '../../models';
import { REPORT_TYPE, COLLABORATOR_TYPES, NEXTSTEP_NOTETYPE } from '../../constants';
import { syncReport } from './report';
import {
  RemappingDefinition,
  remap,
  removeUndefined,
  switchKeysAndValues,
  mergeDeep,
  nestedRawish,
} from '../../lib/modelUtils';
import {
  reportIncludes,
  reportSyncers,
  reportRemapDefs,
} from './definition';

const {
  Report,
  ValidFor,
} = db;

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
  remapSet: string | null,
  reportIds?: number[],
  includes?: { [key: string]: any }[],
  scope?: object,
) => {
  const dbData: { [key: string]: any }[] = nestedRawish(await Report.findAll({
    // attributes: [], // Exclude all attributes from the result set
    where: {
      ...(reportIds?.length && { id: reportIds }), // Filter by report IDs if provided
      ...(scope && { [Op.and]: scope }), // Filter by scope if provided
    },
    include: [
      {
        model: ValidFor,
        as: 'reportType',
        attributes: [],
        required: true,
        where: { name: reportType },
      },
      ...includes,
    ],
    // raw: true,
    nest: true,
    logger: console.log,
  }));

  let formattedData;
  if (remapSet) {
    const remapDefs = reportRemapDefs(
      reportType,
      remapSet,
      undefined,
    );

    console.log('getAllTypedReports - 5', remapDefs.length, remapDefs);

    const remapDefForReport = remapDefs.find(({ model }) => model === Report);
    console.log('getAllTypedReports - 6', remapDefForReport);
    const { mapped: reportProcessedData } = remap(
      dbData,
      remapDefForReport.remapDef,
      { reverse: true, keepUnmappedValues: false },
    );

    const processedData: object[] = dbData
      .filter((data) => data)
      .map((data) => {
        if (data) {
          const remappedData = remapDefs.map(({
            model,
            remapDef,
            type,
          }) => {
            const { as } = includes.find((include) => (include.model === model
              && (type === undefined
                || type === null
                || include.as.includes(type))));

            const { mapped } = remap(
              data?.[as],
              remapDef,
              { reverse: true, keepUnmappedValues: false },
            ) || { mapped: null };

            if (mapped) {
              console.log('getAllTypedReports - 7', {
                as,
                data: data?.[as],
                remapDef,
                mapped,
              });
            }

            return mapped;
          });
          return remappedData;
        }
        return null;
      })
      .filter((data) => data !== undefined);

    processedData.push(reportProcessedData);

    console.log('getAllTypedReports - 8', JSON.stringify(removeUndefined(processedData)));
    formattedData = mergeDeep(removeUndefined(processedData));
  } else {
    formattedData = dbData;
  }

  return formattedData;
};

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
  remapSet: string,
  reportId: number,
  includes: object[],
  scope?: object,
) => getAllTypedReports(
  reportType,
  remapSet,
  [reportId],
  includes,
  scope,
);

/**
 * This function collects includes based on the given report type.
 * @param {string} reportType - The type of report.
 * @param {object[]} includeFilters - Optional array of include filters.
 * @returns {Array} - An array of includes generated based on the report type.
 */
const collectIncludes = (
  reportType,
  remapSet: string,
  includeFilters: object[] = null,
) => {
  const includes = reportIncludes(
    reportType,
    remapSet,
    { models: [Report], exclude: true },
  );

  console.log('collectIncludes', reportType);

  // Check if 'includes' is defined and not an empty array
  return (includes || [])
    .filter(({ model, type }) => (
      // Filter the includes based on the include filters
      includeFilters === null
      || includeFilters.includes((inf) => (
        inf === model
        || (inf.model === model && inf.type === type)
      ))
    ))
    // Map each include to its corresponding function call
    .map(({ include, model, type }) => include(reportType, type));
};

/** TODO:
 * This function as written does not fully take into account the partial update model.
 * Where the form might send back only the delta. In someways it does, either confirmation
 * of or implementation to treat non-existing data as undefined and not null. Then filter out
 * all the undefined values before passing the data to the syncer.
 * */
const syncMetaData = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  syncerDef: { syncer: Function, type?: string, remapDef?: RemappingDefinition },
  data,
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promises: Promise<any>[],
  unmapped: object | object[],
}> => {
  const { syncer, type, remapDef } = syncerDef;
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
    dataToSync = removeUndefined(dataToSync);
  } else {
    dataToSync = data;
    dataNotUsed = null;
  }

  const { promises, unmatched } = (dataToSync !== undefined)
    ? await syncer(report, dataToSync, type)
    : { promises: Promise.resolve(), unmatched: null };

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
  remapSet: string,
  data: object,
) => {
  // Retrieve the syncer and processorModels for the given reportType
  const [{ remapDef: reportDef }] = reportSyncers(
    reportType,
    remapSet,
    { models: [Report], exclude: false },
  );
  const syncers = reportSyncers(
    reportType,
    remapSet,
    { models: [Report], exclude: true },
  );

  const {
    mapped: reportData,
    unmapped: reportUnmappedData,
  } = remap(
    data,
    reportDef,
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
  remapSet: string,
  reportId: number,
  scope?: object,
  metaDataIncludeFilter?: object[],
  // Call the getOneTypedReport function with the provided parameters
) => getOneTypedReport(
  reportType,
  remapSet,
  reportId,
  collectIncludes(reportType, remapSet, metaDataIncludeFilter),
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
  remapSet: string,
  reportIds?: number[],
  scope?: object,
  metaDataIncludeFilter?: object[],
  // Call the function `getAllTypedReports` with the provided arguments
  // and return the result.
) => getAllTypedReports(
  reportType,
  remapSet,
  reportIds,
  collectIncludes(reportType, remapSet, metaDataIncludeFilter),
  scope,
);

export {
  sync,
  getOne,
  getAll,
};
