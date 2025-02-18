import S3Client from '../stream/s3';
import ZipStream, { FileInfo as ZipFileInfo } from '../stream/zip';
import {
  getNextFileToProcess,
  recordAvailableDataFiles,
  setImportFileStatus,
  setImportDataFileStatusByPath,
} from './record';
import { IMPORT_DATA_STATUSES, IMPORT_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';
import processFilesFromZip from './processFilesFromZip';

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
    importFileId,
    processAttempts = 0,
    fileKey: key,
    importDefinitions: processDefinitions,
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

export default processZipFileFromS3;
