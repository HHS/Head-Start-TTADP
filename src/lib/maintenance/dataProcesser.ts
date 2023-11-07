/* eslint-disable @typescript-eslint/no-explicit-any */
import { Op } from 'sequelize';
import { Readable } from 'stream';
import FtpClient, { FileInfo as ftpFileInfo, FTPSettings } from '../stream/ftp';
import S3Client from '../stream/s3';
import ZipStream, { FileInfo as zipFileInfo } from '../stream/zip';
import EncodingConverter from '../stream/encoding';
import XMLStream from '../stream/xml';
import { remap, collectChangedValues } from '../dataObjectUtils';
import { filterDataToModel } from '../modelUtils';

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
): Promise<{
  inserts: Promise<any>[],
  updates: Promise<any>[],
  deletes: Promise<any>[],
}> => {
  const record = await xmlClient.getNextRecord();
  if (record) {
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
    const data = remap(record, processDefinition.remapDefs);

    // Filter the data to match the expected model
    const filteredData = await filterDataToModel(data, processDefinition.model);

    // Check if there is an existing record with the same key value
    const currentData = await processDefinition.model.FindOne({
      where: {
        data: {
          [Op.contains]: {
            [processDefinition.key]: filteredData[processDefinition.key],
          },
        },
      },
    });

    if (currentData) {
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

    return Promise.resolve(recordActions);
  }

  // Recursively call the processRecords function to process the next record
  return processRecords(
    processDefinition,
    xmlClient,
    recordActions,
  );
};

const processFile = async (
  processDefinition,
  fileInfo: zipFileInfo,
  fileStream: Readable,
): Promise<{
  inserts: Promise<any>[],
  updates: Promise<any>[],
  deletes: Promise<any>[],
}> => {
  if (!processDefinition?.remapDefs) throw new Error(`Remapping definitions not found for '${fileInfo.name}'`);
  if (!processDefinition?.model) throw new Error(`Model not found for '${fileInfo.name}'`);
  if (!processDefinition?.key) throw new Error(`Key not found for '${fileInfo.name}'`);

  const usableStream = await EncodingConverter.forceStreamEncoding(fileStream, 'utf8');
  const xmlClient = new XMLStream(usableStream);

  return processRecords(processDefinition, xmlClient);
};

const processFiles = async (
  zipClient: ZipStream,
  filesToProcess: (zipFileInfo)[],
  processDefinitions: string[],
) => {
  if (processDefinitions.length === 0) return;
  const nextToProcess = processDefinitions.pop();

  try {
    const fileInfoToProcess = filesToProcess
      .find(({ name }) => name === nextToProcess);
    if (fileInfoToProcess) {
      const fileStream = await zipClient.getFileStream(fileInfoToProcess.name);
      const processingData = await processFile(
        nextToProcess,
        fileInfoToProcess,
        fileStream,
      );
      // TODO - save/log file processing data
    } else {
      // TODO - save/log that file to process was not found
    }
  } catch (err) {
    // TODO: error handler
  }
  await processFiles(zipClient, filesToProcess, processDefinitions);
};

const processFTP = async (processDefinitions) => {
  const { ftpSettings }: { ftpSettings: FTPSettings } = processDefinitions;
  const ftpClient = new FtpClient(ftpSettings);
  const latestFtpFile = await ftpClient.getLatest('/');

  // TODO - save/log data

  const s3Client = new S3Client();
  const s3LoadedFile = await s3Client.uploadFileAsStream(key, latestFtpFile.stream);

  // TODO - save/log data

  const s3FileStream = await s3Client.downloadFileAsStream(key);

  const zipClient = new ZipStream(s3FileStream);
  const fileDetails = await zipClient.getAllFileDetails();

  // TODO - save/log data

  await processFiles(zipClient, fileDetails, processDefinitions);
};
