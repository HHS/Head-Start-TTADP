import { Model, Op } from 'sequelize';
import { Readable } from 'stream';
import { remap, collectChangedValues } from '../dataObjectUtils';
import { filterDataToModel } from '../modelUtils';
import EncodingConverter from '../stream/encoding';
import Hasher from '../stream/hasher';
import S3Client from '../stream/s3';
import XMLStream from '../stream/xml';
import ZipStream, { FileInfo as ZipFileInfo } from '../stream/zip';
import {
  getNextFileToProcess,
  recordAvailableDataFiles,
  setImportFileStatus,
} from './record';
import { FILE_STATUSES, IMPORT_STATUSES } from '../../constants';
import db, { Sequelize } from '../../models';

const {
  File,
  Import,
  ImportFile,
} = db;

/**
 * Process records according to the given process definition and XML client.
 * @param processDefinition - The process definition object.
 * @param xmlClient - The XML client object.
 * @param recordActions - The record actions object containing arrays of promises for
 * inserts, updates, and deletes.
 * @returns A promise that resolves to the updated recordActions object.
 */
const processRecords = async (
  processDefinition,
  xmlClient,
  recordActions: {
    inserts: Promise<any>[],
    updates: Promise<any>[],
    deletes: Promise<any>[],
  } = {
    inserts: [],
    updates: [],
    deletes: [],
  },
  schema: string[] = [],
): Promise<{
  schema: string[],
  inserts: Promise<any>[],
  updates: Promise<any>[],
  deletes: Promise<any>[],
}> => {
  const record = await xmlClient.getNextRecord();
  let newSchema = schema;
  if (record) {
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
    newSchema = [...new Set([
      ...schema,
      ...Object.keys(record),
    ])];

    // Format the record data using the remap method
    const data = remap(record, processDefinition.remapDefs);

    // Filter the data to match the expected model
    const filteredData = await filterDataToModel(data, processDefinition.model);

    // Check if there is an existing record with the same key value
    const currentData = await processDefinition.model.findOne({
      where: {
        data: {
          [Op.contains]: {
            [processDefinition.key]: filteredData[processDefinition.key],
          },
        },
      },
    });

    if (currentData === null || currentData === undefined) {
      // If the record already exists, insert it
      const insert = processDefinition.model.create(
        filteredData,
        {
          independentHooks: true,
          returning: true,
          plain: true,
        },
      );
      recordActions.inserts.push(insert);
    } else {
      // If the record is new, update it
      const delta = collectChangedValues(filteredData, currentData);
      const update = processDefinition.model.update(
        delta,
        {
          where: { id: delta.id },
          independentHooks: true,
          returning: true,
          plain: true,
        },
      );
      recordActions.updates.push(update);
    }
  } else {
    // 1. Find all records not in recordActions.inserts and recordActions.update
    // 2. delete
    // 3. recordActions.delete.push(uuid)
    // 4. save data - recordActions

    // Get all the affected data from inserts and updates
    const affectedData = await Promise.all([
      ...recordActions.inserts,
      ...recordActions.updates,
    ]);

    // Delete all records that are not in the affectedData array
    const destroys = processDefinition.model.destroy({
      where: { id: { [Op.not]: affectedData.map(({ id }) => id) } },
      independentHooks: true,
    });

    recordActions.deletes.push(destroys);

    return Promise.resolve({
      schema: newSchema,
      ...recordActions,
    });
  }

  // Recursively call the processRecords function to process the next record
  return processRecords(
    processDefinition,
    xmlClient,
    recordActions,
    newSchema,
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
  processDefinition,
  fileInfo: ZipFileInfo,
  fileStream: Readable,
): Promise<{
  hash: string,
  schema: string[],
  inserts: Promise<any>[],
  updates: Promise<any>[],
  deletes: Promise<any>[],
}> => {
  // Check if remapDefs property exists in processDefinition, if not throw an error
  if (!processDefinition?.remapDefs) throw new Error(`Remapping definitions not found for '${fileInfo.name}'`);
  // Check if model property exists in processDefinition, if not throw an error
  if (!processDefinition?.model) throw new Error(`Model not found for '${fileInfo.name}'`);
  // Check if key property exists in processDefinition, if not throw an error
  if (!processDefinition?.key) throw new Error(`Key not found for '${fileInfo.name}'`);

  const hashStream = new Hasher('sha256');
  fileStream.pipe(hashStream);

  // Convert the fileStream to a usable stream with UTF-8 encoding
  const usableStream = await EncodingConverter.forceStreamEncoding(hashStream, 'utf8');

  // Create a new instance of XMLStream using the usableStream
  const xmlClient = new XMLStream(usableStream);

  const results = processRecords(processDefinition, xmlClient);
  const hash = await hashStream.getHash();

  return {
    hash,
    ...results,
  };
  // Process the records using the processDefinition and xmlClient and return the result
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
  zipClient: ZipStream,
  filesToProcess: (ZipFileInfo)[],
  processDefinitions: string[],
) => {
  // If there are no more files to process, exit the function
  if (processDefinitions.length === 0) return;
  // Get the next file to process from the end of the processDefinitions array
  const nextToProcess = processDefinitions.pop();

  try {
    const fileInfoToProcess = filesToProcess
      // Find the ZipFileInfo object that matches the next file to process
      .find(({ name }) => name === nextToProcess);
    if (fileInfoToProcess) { // If the file to process is found
      // Get the file stream for the file to process from the zipClient
      const fileStream = await zipClient.getFileStream(fileInfoToProcess.name);
      // Throw an error if the file stream is not available
      if (!fileStream) throw new Error(`Failed to get stream from ${fileInfoToProcess.name}`);
      const processingData = await processFile(
        nextToProcess, // Pass the name of the file to process
        fileInfoToProcess, // Pass the ZipFileInfo object of the file to process
        fileStream, // Pass the file stream of the file to process
      );

      const [
        inserts,
        updates,
        deletes,
      ] = await Promise.all([
        Promise.all(processingData.inserts),
        Promise.all(processingData.updates),
        Promise.all(processingData.deletes),
      ]);
      const [
        insertCount,
        updateCount,
        deleteCount,
      ] = [
        inserts?.length || 0,
        updates?.length || 0,
        deletes?.length || 0,
      ];
      // TODO - save/log file processing data
    } else {
      // TODO - save/log that file to process was not found
    }
  } catch (err) {
    // TODO: error handler
  }
  // Recursively call the processFilesFromZip function to process the remaining files
  await processFilesFromZip(zipClient, filesToProcess, processDefinitions);
};

const processZipFileFromS3 = async (
  importId: number,
  // zipPassword?: string,
  // fileProcessDefinition: {
  //   remapDefs,
  //   model,
  //   importFileId: number,
  //   key: string,
  // }
) => {
  const importFile = await getNextFileToProcess(importId);
  if (!importFile) return;

  const {
    dataValues: { importFileId, processAttempts = 0 },
    file: { key },
    import: { definitions: processDefinitions },
  } = importFile;
  let s3Client;
  let s3FileStream;

  await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING, null, processAttempts + 1);

  try {
    s3Client = new S3Client();
    s3FileStream = await s3Client.downloadFileAsStream(key);
  } catch (err) {
    // TODO - log error
    await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    return;
  }

  let zipClient;
  let fileDetails;

  try {
    zipClient = new ZipStream(s3FileStream);
    fileDetails = await zipClient.getAllFileDetails();
    await recordAvailableDataFiles(importFileId, fileDetails);
  } catch (err) {
    // TODO - log error
    await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    return;
  }

  const filteredFileDetails = fileDetails
    // remove nulls and cast as type
    .filter((fileDetail) => fileDetail) as ZipFileInfo[];

  let results;

  try {
    results = processFilesFromZip(
      zipClient,
      filteredFileDetails,
      processDefinitions,
    );
  } catch (err) {
    // TODO - log error
    await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    return;
  }

  await setImportFileStatus(importFileId, IMPORT_STATUSES.PROCESSED);
};

export {
  processRecords,
  processFile,
  processFilesFromZip,
  processZipFileFromS3,
};
