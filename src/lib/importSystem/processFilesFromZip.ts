import ZipStream, { FileInfo as ZipFileInfo } from '../stream/zip';
import {
  setImportDataFileStatusByPath,
  updateAvailableDataFileMetadata,
} from './record';
import { IMPORT_DATA_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';
import processFile from './processFile';
import { ProcessDefinition } from './types';

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
      await setImportDataFileStatusByPath(
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

export default processFilesFromZip;
