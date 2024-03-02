import { Model, Op } from 'sequelize';
import { Readable } from 'stream';
import {
  remap,
  collectChangedValues,
  lowercaseKeys,
  createRanges,
} from '../dataObjectUtils';
import { filterDataToModel, modelForTable } from '../modelUtils';
import EncodingConverter from '../stream/encoding';
import Hasher, { getHash } from '../stream/hasher';
import S3Client from '../stream/s3';
import XMLStream, { SchemaNode } from '../stream/xml';
import ZipStream, { FileInfo as ZipFileInfo } from '../stream/zip';
import {
  getNextFileToProcess,
  recordAvailableDataFiles,
  setImportFileStatus,
  setImportDataFileStatusByPath,
  updateAvailableDataFileMetadata,
} from './record';
import { IMPORT_DATA_STATUSES, IMPORT_STATUSES } from '../../constants';
import db from '../../models';
import { auditLogger } from '../../logger';

type ProcessDefinition = {
  fileName: string,
  encoding: string,
  tableName: string,
  keys: string[],
  remapDef: Record<string, string>;
};

/**
 * Process records according to the given process definition and XML client.
 * @param processDefinition - The process definition object.
 * @param xmlClient - The XML client object.
 * @param fileDate -  the data the file was modified
 * @param recordActions - The record actions object containing arrays of promises for
 * inserts, updates, and deletes.
 * @param schema - the name of each of the columns within the data
 * @returns A promise that resolves to the updated recordActions object and schema.
 */
const processRecords = async (
  processDefinition: ProcessDefinition,
  xmlClient: XMLStream,
  fileDate: Date,
  recordActions: {
    inserts,
    updates,
    deletes,
    errors,
  } = {
    inserts: [],
    updates: [],
    deletes: [],
    errors: [],
  },
): Promise<{
  inserts,
  updates,
  deletes,
  errors,
}> => {
  let record;
  try {
    record = await xmlClient.getNextObject(true);
  } catch (err) {
    // record the error into the recordActions and continue on successfully as
    // other entries may be process successfully
    recordActions.errors.push(err.message);
    auditLogger.log('error', ` processRecords getNextObject ${err.message}`, err);
  }

  // @ts-ignore
  let model;
  try {
    model = modelForTable(db, processDefinition.tableName);
  } catch (err) {
    // record the error into the recordActions
    recordActions.errors.push(err.message);
    auditLogger.log('error', ` processRecords modelForTable ${err.message}`, err);

    // Unable to continue as a model is required to record any information
    return Promise.reject(recordActions);
  }

  if (record) {
    try {
      // TODO: column/key alpha sort to retain order
      // 1. use the remap method to format data to structure needed
      // 2. use the filterDataToModel to match what is expected
      // 3. check for existing record
      // 4a. if new
      //   1. insert
      //   2. recordActions.inserts.push(uuid)
      // 4b. if found
      //   1. use the collectChangedValues to find the values to update
      //   2. update
      //   2. recordActions.update.push(uuid)

      // Format the record data using the remap method
      // This changes the attribute names and structure into what will be saved
      const { mapped: data } = remap(
        record,
        lowercaseKeys(processDefinition.remapDef),
        {
          keepUnmappedValues: false,
          // defines a custom fuction that will replace the resulting structure
          // with the result of each function.
          targetFunctions: {
            // take in an object and generate a hash of that object
            'toHash.*': (toHash) => ({ hash: getHash(toHash) }),
          },
        },
      );

      // Filter the data to match the expected model
      const {
        matched: filteredData,
        unmatched: droppedData,
      } = await filterDataToModel(data, model);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordKey: Record<string, any> = {};
      processDefinition.keys.forEach((key) => {
        const value = filteredData[key];
        if (value) {
          recordKey[key] = value;
        }
        // TODO: handle case where all/part of the key may have been dropped
      });
      if (Object.keys(droppedData).length > 0) {
        // TODO: add some kind of note/warning that mapped data was filtered out at the model level
        // The message should include the importDataFileId, the recordKey, and the column names.
        // The column values should be excluded to prevent posable display of PII
      }

      // Check if there is an existing record with the same key value
      const currentData = await model.findOne({
        where: {
          ...recordKey,
        },
      });

      if (!currentData) {
        // If the record is new, create it
        const insert = model.create(
          {
            ...filteredData,
            sourceCreatedAt: fileDate,
            sourceUpdatedAt: fileDate,
          },
          {
            individualHooks: true,
            returning: true,
          },
        );
        recordActions.inserts.push(insert);
      } else if (fileDate > currentData.sourceUpdatedAt) {
        // If the record already exists, find the delta then update it
        const delta = collectChangedValues(filteredData, currentData);
        const update = model.update(
          {
            ...delta,
            sourceUpdatedAt: fileDate,
            ...(currentData.sourceDeletedAt && { sourceDeletedAt: null }),
            updatedAt: new Date(),
          },
          {
            where: { id: currentData.id },
            individualHooks: true,
            returning: true,
          },
        );
        recordActions.updates.push(update);
      }
    } catch (err) {
      // record the error into the recordActions and continue on successfully as
      // other entries may be process successfully
      recordActions.errors.push(err.message);
      auditLogger.log('error', ` processRecords create/update ${err.message}`, err);
    }
  } else {
    try {
      // 1. Find all records not in recordActions.inserts and recordActions.update
      // 2. delete
      // 3. recordActions.delete.push(promises)
      // 4. pass back recordActions

      const [
        affectedDataInserts,
        affectedDataUpdates,
      ] = await Promise.all([
        Promise.all(recordActions.inserts),
        Promise.all(recordActions.updates),
      ]);

      // Flatten the affectedDataUpdates array and extract the objects
      const flattenedUpdates = affectedDataUpdates.flatMap(
        // Assuming the second element of each sub-array is the array of objects
        (update) => (Array.isArray(update[1]) ? update[1] : []),
      );

      // Combine the affected data from inserts and flattened updates
      const affectedData = [
        ...affectedDataInserts,
        ...flattenedUpdates,
      ];

      const affectedDataIds = affectedData?.map(({ id }) => id).filter((id) => id) || [];
      const affectedRanges = createRanges(affectedDataIds);

      // mark the source date when the records no longer are present in the processed file
      // "Delete" all records that are not in the affectedData array
      if (affectedDataIds.length) {
        const destroys = model.update(
          {
            sourceDeletedAt: fileDate,
          },
          {
            where: {
              [Op.and]: affectedRanges.map((range) => ({
                id: { [Op.notBetween]: range },
              })),
              sourceDeletedAt: null,
            },
            individualHooks: true,
          },
        );

        recordActions.deletes.push(destroys);
      }
    } catch (err) {
      // record the error into the recordActions
      recordActions.deletes.push(err.message);
      auditLogger.log('error', ` processRecords destroy ${err.message}`, err);
    }

    return Promise.resolve(recordActions);
  }

  // Recursively call the processRecords function to process the next record
  return processRecords(
    processDefinition,
    xmlClient,
    fileDate,
    recordActions,
  );
};

/**
 * Processes a file based on the provided process definition.
 *
 * @param processDefinition - The process definition object that contains information
 * about how to process the file.
 * @param fileInfo - Information about the file being processed.
 * @param fileStream - The stream of the file being processed.
 * @returns A promise that resolves to an object containing arrays of promises for
 * inserts, updates, and deletes.
 * @throws An error if the remapDefs property is not found in the processDefinition.
 * @throws An error if the model property is not found in the processDefinition.
 * @throws An error if the key property is not found in the processDefinition.
 */
const processFile = async (
  processDefinition: ProcessDefinition,
  fileInfo: ZipFileInfo,
  fileStream: Readable,
): Promise<{
  hash?: string,
  schema?: SchemaNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inserts?: Promise<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates?: Promise<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deletes?: Promise<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Promise<any>[],
}> => {
  let result: {
    hash?: string,
    schema?: SchemaNode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inserts?: Promise<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates?: Promise<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deletes?: Promise<any>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: Promise<any>[],
  } = {
    errors: [],
  };

  try {
    // Check if remapDefs property exists in processDefinition, if not throw an error
    if (!processDefinition?.remapDef) throw new Error('Remapping definitions not found');
    // Check if model property exists in processDefinition, if not throw an error
    if (!processDefinition?.tableName) throw new Error('Model not found');
    // Check if key property exists in processDefinition, if not throw an error
    if (!processDefinition?.keys) throw new Error('Keys not found');
    // Check if key property exists in processDefinition, if not throw an error
    if (!processDefinition?.encoding) throw new Error('Encoding not found');

    const hashStream = new Hasher('sha256');

    const encodingConverter = new EncodingConverter('utf8', processDefinition.encoding);

    // Convert the fileStream to a usable stream while also calculation the hash
    const usableStream = fileStream.pipe(hashStream).pipe(encodingConverter);

    // Create a new instance of XMLStream using the usableStream
    const xmlClient = new XMLStream(usableStream, true);
    await xmlClient.initialize();

    // Check if key property exists in processDefinition, if not throw an error
    if (!xmlClient) throw new Error('XMLStream failed');

    const processedRecords = await processRecords(processDefinition, xmlClient, fileInfo.date);

    // hash needs to be collected after processRecords returns to make sure all the data has
    // been processed for all records in the file
    const hash = await hashStream.getHash();
    const schema = await xmlClient.getObjectSchema();

    result = {
      hash,
      schema,
      ...processedRecords,
    };
  } catch (err) {
    result.errors.push(err.message);
    auditLogger.log('error', ` processFile ${err.message}`, err);
  }

  return result;
};

/**
 * Processes the files using the provided ZipStream object and the array of files to process.
 *
 * @param zipClient - The ZipStream object used to interact with the zip files.
 * @param filesToProcess - An array of ZipFileInfo objects representing the files to be processed.
 * @param processDefinitions - An array of strings representing the names of the files to
 * be processed.
 * @returns - A Promise that resolves when all files have been processed.
 * @throws - If there is an error while processing a file.
 */
const processFilesFromZip = async (
  importFileId, // The ID of the import file
  zipClient: ZipStream, // The client for working with ZIP files
  filesToProcess: (ZipFileInfo)[], // An array of files to process
  processDefinitions: ProcessDefinition[], // An array of process definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  // If there are no more files to process, exit the function
  if (processDefinitions.length === 0) return Promise.resolve();

  // Get the next file to process from the end of the processDefinitions array
  const nextToProcess = processDefinitions.pop();

  try {
    const fileInfoToProcess = filesToProcess
      // Find the ZipFileInfo object that matches the next file to process
      .find(({ name }) => name === nextToProcess.fileName);

    if (fileInfoToProcess) { // If the file to process is found
      setImportDataFileStatusByPath(
        importFileId,
        fileInfoToProcess,
        IMPORT_DATA_STATUSES.PROCESSING,
      );
      // Get the file stream for the file to process from the zipClient
      const fileStream = await zipClient.getFileStream(fileInfoToProcess.name);

      // Throw an error if the file stream is not available
      if (!fileStream) throw new Error(`Failed to get stream from ${fileInfoToProcess.name}`);

      const processingData = await processFile(
        nextToProcess, // Pass the name of the file to process
        fileInfoToProcess, // Pass the ZipFileInfo object of the file to process
        fileStream, // Pass the file stream of the file to process
      );

      const {
        schema = null, // The schema of the processed file
        hash = null, // The hash of the processed file
      } = processingData;

      const [
        inserts, // An array of insert operations
        updates, // An array of update operations
        deletes, // An array of delete operations
        errors = [], // An array of errors
      ] = await Promise.all([
        Promise.all(processingData?.inserts.map(async (i) => Promise.resolve(i))),
        Promise.all(processingData?.updates.map(async (i) => Promise.resolve(i))),
        Promise.all(processingData?.deletes.map(async (i) => Promise.resolve(i))),
        Promise.all(processingData.errors.map(async (i) => Promise.resolve(i))),
      ]);

      const [
        insertCount, // The number of insert operations
        updateCount, // The number of update operations
        deleteCount, // The number of delete operations
        errorCounts, // An object containing the count of each error
      ] = [
        inserts?.length || 0,
        updates?.length || 0,
        deletes?.length || 0,
        errors.reduce((acc, error) => {
          if (!acc[error]) {
            acc[error] = 0;
          }
          acc[error] += 1;
          return acc;
        }, {}),
      ];

      // save/log file processing data
      await updateAvailableDataFileMetadata(
        importFileId, // Pass the import file ID
        fileInfoToProcess, // Pass the ZipFileInfo object of the processed file
        IMPORT_DATA_STATUSES.PROCESSED,
        {
          schema,
          hash,
          recordCounts: {
            inserts: insertCount,
            updates: updateCount,
            deletes: deleteCount,
            errors: errorCounts,
          },
        },
      );
    } else {
      // save/log file not processed
      await updateAvailableDataFileMetadata(
        importFileId, // Pass the import file ID
        fileInfoToProcess, // Pass the ZipFileInfo object of the unprocessed file
        IMPORT_DATA_STATUSES.PROCESSING_FAILED,
        {},
      );
    }
  } catch (err) {
    await updateAvailableDataFileMetadata(
      importFileId, // Pass the import file ID
      {
        name: nextToProcess.fileName, // Pass the name of the file that caused the error
      },
      IMPORT_DATA_STATUSES.PROCESSING_FAILED,
      {
        recordCounts: {
          errors: {
            [err.message]: 1, // Add the error message to the error count object
          },
        },
      },
    );
    auditLogger.log('error', ` processFilesFromZip ${err.message}`, err);
  }

  // Recursively call the processFilesFromZip function to process the remaining files
  return processFilesFromZip(
    importFileId, // Pass the import file ID
    zipClient, // Pass the zip client
    filesToProcess, // Pass the array of files to process
    processDefinitions, // Pass the array of process definitions
  );
};

/**
 * Processes a zip file from S3.
 * @param importId - The ID of the import.
 * @throws {Error} If an error occurs while processing the zip file.
 * @returns {Promise<void>} A promise that resolves when the zip file has been processed
 * successfully.
 */
const processZipFileFromS3 = async (
  importId: number,
) => {
  const startTime = new Date(); // The start time for file collection
  // Get the next file to process based on the importId
  const importFile = await getNextFileToProcess(importId);
  if (!importFile) return Promise.resolve();

  // Destructure properties from the importFile object
  const {
    dataValues: { importFileId, processAttempts = 0 },
    file: { key },
    import: { definitions: processDefinitions },
  } = importFile;

  // These must be let to properly wrap the population in a try/catch
  let s3Client;
  let s3FileStream;

  // Set the import file status to PROCESSING and increment the processAttempts count
  await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING, null, processAttempts + 1);

  try {
    // Create a new S3Client instance and download the file as a stream
    s3Client = new S3Client();
    s3FileStream = await s3Client.downloadFileAsStream(key);
  } catch (err) {
    // If an error occurs, set the import file status to PROCESSING_FAILED
    await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    auditLogger.log('error', ` processZipFileFromS3 downloadFileAsStream ${err.message}`, err);
    return {
      error: err.message,
      duration: new Date().getTime() - startTime.getTime(),
    };
  }

  // These must be let to properly wrap the population in a try/catch
  let zipClient;
  let fileDetails;

  const neededFiles = processDefinitions.map(({ fileName: name, path }) => ({ name, path }));

  try {
    // Create a new ZipStream instance using the downloaded file stream
    zipClient = new ZipStream(
      s3FileStream,
      undefined,
      neededFiles,
    );

    // Get details of all files in the zip archive
    fileDetails = await zipClient.getAllFileDetails();
    // Record the available data files in the importFile
    await recordAvailableDataFiles(importFileId, fileDetails);
  } catch (err) {
    // If an error occurs, set the import file status to PROCESSING_FAILED
    await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    auditLogger.log('error', ` processZipFileFromS3 getAllFileDetails ${err.message}`, err);
    return {
      error: err.message,
      duration: new Date().getTime() - startTime.getTime(),
    };
  }

  // Filter out null file details, and to the ones that streams were requested for
  // then cast the remaining ones as ZipFileInfo type
  const filteredFileDetails = fileDetails
    .filter((fileDetail) => fileDetail)
    .filter(({ name, path }) => neededFiles.some((neededFile) => (
      neededFile.name === name
      && neededFile.path === path
    ))) as ZipFileInfo[];

  await Promise.all(fileDetails
    .filter(({ name, path }) => !neededFiles.some((neededFile) => (
      neededFile.name === name
      && neededFile.path === path
    )))
    .map(async (fileDetail) => setImportDataFileStatusByPath(
      importFileId,
      fileDetail,
      IMPORT_DATA_STATUSES.WILL_NOT_PROCESS,
    )));

  let results;

  try {
    // Process files from the zip archive using the importFileId, zipClient, filteredFileDetails,
    // and processDefinitions
    results = await processFilesFromZip(
      importFileId,
      zipClient,
      filteredFileDetails,
      processDefinitions,
    );
  } catch (err) {
    // If an error occurs, set the import file status to PROCESSING_FAILED
    await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    auditLogger.log('error', `processZipFileFromS3 processFilesFromZip ${err.message}`, err);
    return {
      error: err.message,
      file: {
        name: fileDetails.name,
      },
      duration: new Date().getTime() - startTime.getTime(),
    };
  }

  // Set the import file status to PROCESSED
  await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSED);
  return {
    ...results,
    file: {
      name: fileDetails.name,
    },
    duration: new Date().getTime() - startTime.getTime(),
  };
};

export {
  processRecords,
  processFile,
  processFilesFromZip,
  processZipFileFromS3,
};
