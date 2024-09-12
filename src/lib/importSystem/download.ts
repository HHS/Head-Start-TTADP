import SftpClient, { SFTPSettings, FileListing } from '../stream/sftp';
import Hasher from '../stream/hasher';
import S3Client from '../stream/s3';
import db from '../../models';
import {
  getPriorFile,
  recordAvailableFiles,
  logFileToBeCollected,
  setImportFileHash,
  setImportFileStatus,
} from './record';
import { updateStatusByKey } from '../../services/files';
import { FILE_STATUSES, IMPORT_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';

const {
  Import,
} = db;

/**
 * Collects the next file for import.
 *
 * @param importId - The ID of the import.
 * @param availableFiles - An array of available files to import.
 * @param times - An object containing time-related information.
 * @param importedFiles - An array of imported files.
 * @returns A promise that resolves to an object with the collected files, a flag indicating
 * if there are imported files, and a flag indicating if there are remaining files.
 * @throws Throws an error if there is an error during upload.
 */
const collectNextFile = async (
  importId: number,
  availableFiles: FileListing[],
  times: {
    start: Date,
    limit: Date,
    used?: number[],
  },
  importedFiles: {
    importFileId: number,
    key: string,
    attempts: number,
  }[] = [],
): Promise<{
  collectedFiles: {
    importFileId: number,
    key: string,
    attempts: number,
  }[],
  hasImportedFiles: boolean,
  hasRemainingFiles: boolean,
}> => {
  const availableFile = availableFiles.shift();
  const currentStart = new Date();
  const { start, limit, used = [] } = times;

  // Primary exit - collected all the files
  if (availableFile === undefined || availableFile === null) {
    return {
      collectedFiles: importedFiles,
      hasImportedFiles: importedFiles && importedFiles.length > 0,
      hasRemainingFiles: false,
    };
  }

  // Secondary exit - Ran out of time
  if (currentStart > limit) {
    return {
      collectedFiles: importedFiles,
      hasImportedFiles: importedFiles && importedFiles.length > 0,
      hasRemainingFiles: !!availableFile,
    };
  }

  // Tertiary exit - trending duration will exceed alloted time
  if ((used.length || 0) > 0) {
    const avg = (used?.reduce((acc, val) => acc + val, 0) || 1) / (used?.length || 1);
    if (new Date(currentStart.getTime() + avg) > limit) {
      return {
        collectedFiles: importedFiles,
        hasImportedFiles: importedFiles && importedFiles.length > 0,
        hasRemainingFiles: !!availableFile,
      };
    }
  }

  const importFileData = await logFileToBeCollected(importId, availableFile);

  // Quaternary exit - max attempts reached for current file
  if (importFileData.attempts > 5) {
    await Promise.all([
      updateStatusByKey(importFileData.key, FILE_STATUSES.UPLOAD_FAILED),
      setImportFileStatus(
        importFileData.importFileId,
        IMPORT_STATUSES.COLLECTION_FAILED,
      ),
    ]);
    used.push(new Date().getTime() - currentStart.getTime());
    return collectNextFile(importId, availableFiles, { start, limit, used }, importedFiles);
  }

  try {
    const stream = await availableFile.stream;
    if (!stream) throw new Error('Stream failed or missing');
    const hashStream = new Hasher('sha256');
    stream.pipe(hashStream);
    const s3Client = new S3Client();
    await s3Client.uploadFileAsStream(
      importFileData.key,
      hashStream,
    );

    await Promise.all([
      updateStatusByKey(importFileData.key, FILE_STATUSES.UPLOADED),
      setImportFileHash(
        importFileData.importFileId,
        await hashStream.getHash(),
        IMPORT_STATUSES.COLLECTED,
      ),
    ]);

    importedFiles.push(importFileData);
  } catch (err) {
    // Quinary exit - error during upload
    await Promise.all([
      updateStatusByKey(importFileData.key, FILE_STATUSES.UPLOAD_FAILED),
      setImportFileStatus(
        importFileData.importFileId,
        IMPORT_STATUSES.COLLECTION_FAILED,
      ),
    ]);

    auditLogger.error(`Error: ImportId: ${importId}, File: ${availableFile.fullPath}, Error: ${err.message}`, err);
    used.push(new Date().getTime() - currentStart.getTime());
    return collectNextFile(
      importId,
      [availableFile, ...availableFiles],
      { start, limit, used },
      importedFiles,
    );
  }

  await Promise.all([
    // Scan file
    // Note: file will be queued for processing without waiting on status of scanning
    // TODO: Files too big for current scanner, all will fail
    // addToScanQueue({ key: importFileData.key }),
    // updateStatusByKey(
    //   importFileData.key,
    //   FILE_STATUSES.QUEUED,
    // ),
    setImportFileStatus(
      importFileData.importFileId,
      IMPORT_STATUSES.COLLECTED,
    ),
  ]);

  // Senary exit - file uploaded and queued for processing and scanning
  used.push(new Date().getTime() - currentStart.getTime());
  return collectNextFile(
    importId,
    availableFiles,
    { start, limit, used },
    importedFiles,
  );
};

/**
 * Collects and returns the FTP server settings from environment variables.
 * The settings include the host, port, username, and password.
 *
 * @returns An object containing the host, port, username, and password for the FTP server.
 * @throws Will throw an error if any of the environment variables for the host, port, username,
 * or password are not set.
 */
const collectServerSettings = (
  importId: number,
  ftpSettings: { host: string, port: string, username: string, password },
) => {
  const {
    host: hostEnv, // The environment variable name for the FTP server host
    port: portEnv, // The environment variable name for the FTP server port
    username: userEnv, // The environment variable name for the FTP server username
    password: passwordEnv, // The environment variable name for the FTP server password
  } = ftpSettings;
  // Retrieve the FTP server password from the environment variable
  const {
    [hostEnv]: host,
    [portEnv]: port,
    [userEnv]: username,
    [passwordEnv]: password,
  } = process.env;

  if (!host || !port || !username || !password) {
    const missing = [];
    if (!host) {
      missing.push(`'${hostEnv}' did not resolve to a value`);
    }
    if (!port) {
      missing.push(`'${portEnv}' did not resolve to a value`);
    }
    if (!username) {
      missing.push(`'${userEnv}' did not resolve to a value`);
    }
    if (!password) {
      missing.push(`'${passwordEnv}' did not resolve to a value`);
    }
    throw new Error(`importId: ${importId} settings not found in Env: ${missing.join(', ')}`);
  }
  return {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };
};

/**
 * Sorts an array of `FileListing` objects in place by their `fullPath` property using
 * locale-sensitive string comparison.
 *
 * @param files - An array of `FileListing` objects to be sorted.
 */
function sortFilesByFullPath(files: FileListing[]): void {
  files.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
}

/**
 * Collects files from an FTP server based on the provided parameters.
 *
 * @param importId - The unique identifier for the import.
 * @param timeBox - The maximum time allowed for file collection.
 * @param ftpSettings - The FTP server settings.
 * @param path - The path on the FTP server to search for files (default is root directory).
 * @param fileMask - The file mask to filter files (optional).
 * @returns A Promise that resolves to an array of collected files.
 * @throws An error if the password is not found for the importId and passwordENV.
 * @throws An error if failed to create the FTP client.
 */
const collectFilesFromSource = async (
  importId, // The unique identifier for the import
  timeBox, // The maximum time allowed for file collection
  ftpSettings, // The FTP server settings
  path = '/', // The path on the FTP server to search for files (default is root directory)
  fileMask?: string | undefined, // The file mask to filter files (optional)
) => {
  const serverSettings = collectServerSettings(importId, ftpSettings);

  let ftpClient;
  try {
    // Create a new FTP client instance with the FTP server settings
    ftpClient = new SftpClient(serverSettings);
  } catch (error) {
    throw new Error(`Failed to create FTP client: ${error.message}`);
  }

  const priorFile = await getPriorFile(
    importId,
    [
      IMPORT_STATUSES.COLLECTED,
      IMPORT_STATUSES.PROCESSED,
    ],
  ); // Get the prior file for the import

  try {
    await ftpClient.connect();
  } catch (err) {
    throw new Error(`Failed to connect to FTP: ${err.message}`);
  }

  let availableFiles: FileListing[];
  try {
    availableFiles = await ftpClient.listFiles({
      path, // The path on the FTP server to search for files
      fileMask, // The file mask to filter files
      priorFile, // The prior file for comparison
      includeStream: true, // include streams
    }); // Get the list of available files on the FTP server
  } catch (err) {
    throw new Error(`Failed to list files from FTP: ${err.message}`);
  }

  // only files with a stream populated will work
  const fetchableAvailableFiles = availableFiles.filter(({ stream }) => stream);
  sortFilesByFullPath(fetchableAvailableFiles);

  // Record the available files for the import
  await recordAvailableFiles(importId, fetchableAvailableFiles);

  const startTime = new Date(); // The start time for file collection
  const timeLimit = new Date(startTime.getTime() + timeBox); // The time limit for file collection

  const { collectedFiles, hasRemainingFiles } = await collectNextFile(
    importId, // The unique identifier for the import
    fetchableAvailableFiles, // The list of available files on the FTP server
    {
      start: startTime, // The start time for file collection
      limit: timeLimit, // The time limit for file collection
    },
  ); // Collect the next file within the time limit

  try {
    await ftpClient.disconnect();
  } catch (err) {
    throw new Error(`Failed to disconnect from FTP: ${err.message}`);
  }

  return collectedFiles; // Return the collected files
};

/**
 * Downloads files from a source based on the import ID.
 * @param importId - The ID of the import.
 * @param timeBox - Optional time limit for the download process in milliseconds.
 * Defaults to 5 minutes.
 * @returns A promise that resolves with the collected files from the source.
 */
const downloadFilesFromSource = async (
  importId: number,
  timeBox = 5 * 60 * 1000,
) => {
  // Retrieve import file data from the database
  const importFileData: {
    importId: number,
    ftpSettings: SFTPSettings,
    path: string,
    fileMask?: string | undefined,
  } = await Import.findOne({
    attributes: [
      ['id', 'importId'],
      'ftpSettings',
      'path',
      'fileMask',
    ],
    where: {
      id: importId,
    },
    raw: true,
  });

  // Collect files from the source using the retrieved import file data
  return collectFilesFromSource(
    importFileData.importId,
    timeBox,
    importFileData.ftpSettings,
    importFileData.path,
    importFileData.fileMask,
  );
};

export {
  collectNextFile,
  collectFilesFromSource,
  collectServerSettings,
  downloadFilesFromSource,
  sortFilesByFullPath,
};
