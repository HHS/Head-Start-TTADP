import * as fs from 'fs';
import { Readable } from 'stream';
import FtpClient, { FileInfo as ftpFileInfo, FTPSettings } from '../stream/ftp';
import S3Client from '../stream/s3';
import ZipStream, { FileInfo as zipFileInfo } from '../stream/zip';
import EncodingConverter from '../stream/encoding';
import XMLStream from '../stream/xml';

const processRecords = async (
  processDefinition,
  xmlClient,
  recordActions = {
    inserts: [],
    updated: [],
    deletes: [],
  },
) => {
  const record = await xmlClient.getNextRecord();
  if (record) {
    /** TODO
     * 1: use the mapsTo method to format data to structure needed
     * 2. use the filterDataToModel to match what is expected
     * 3. check for existing record
     * 4a. if new
     *  1. insert
     *  2. recordActions.inserts.push(uuid)
     * 4b. if found
     *  1. use the collectChangedValues to find the values to update
     *  2. update
     *  2. recordActions.update.push(uuid)
     */
  } else {
    /** TODO
     * 1. Find all records not in recordActions.inserts and recordActions.update
     * 2. delete
     * 3. recordActions.delete.push(uuid)
     * 4. save data - recordActions
     */
    return Promise.resolve();
  }
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
) => {
  const usableStream = await EncodingConverter.forceStreamEncoding(fileStream, 'utf8');
  const xmlClient = new XMLStream(usableStream);
  return processRecords(processDefinition, xmlClient);
};

const processFiles = async (
  zipClient: ZipStream,
  filesToProcess: (zipFileInfo | null)[],
  processDefinitions: string[],
) => {
  if (processDefinitions.length === 0) return;
  const nextToProcess = processDefinitions.pop();

  try {
    const fileInfoToProcess = filesToProcess
      .find(({ name }) => name === nextToProcess);
    if (fileInfoToProcess) {
      const fileStream = await zipClient.getFileStream(fileInfoToProcess.name);
      await processFile(nextToProcess, fileInfoToProcess, fileStream);
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

  // TODO - save data

  const s3Client = new S3Client();
  const s3LoadedFile = await s3Client.uploadFileAsStream(key, latestFtpFile.stream);

  // TODO - save data

  const s3FileStream = await s3Client.downloadFileAsStream(key);

  const zipClient = new ZipStream(s3FileStream);
  const fileDetails = await zipClient.getAllFileDetails();

  // TODO - save data

  await processFiles(zipClient, fileDetails, processDefinitions);
};
