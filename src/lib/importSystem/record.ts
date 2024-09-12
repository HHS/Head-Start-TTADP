import {
  Sequelize,
  fn,
  literal,
  Op,
} from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { FileInfo as FTPFileInfo, FileListing } from '../stream/sftp';
import { SchemaNode } from '../stream/xml';
import { FileInfo as ZipFileInfo } from '../stream/zip';
import db from '../../models';
import {
  FILE_STATUSES,
  IMPORT_STATUSES,
  IMPORT_DATA_STATUSES,
} from '../../constants';

const {
  File,
  Import,
  ImportFile,
  ImportDataFile,
  ZALImportFile,
} = db;

/**
 * Retrieves the name of the prior file associated with the given importId.
 *
 * @param importId - The importId of the file to find the prior file for.
 * @returns The name of the prior file.
 * @throws - If there is an error while retrieving the prior file.
 */
const getPriorFile = async (
  importId: number,
  status: string | string[] = IMPORT_STATUSES.COLLECTED,
): Promise<string | null> => {
  // Find the prior file associated with the given importId
  const importFile: { name: string } | null = await ImportFile.findOne({
    attributes: [
      // Selecting the 'name' attribute from ftpFileInfo
      // eslint-disable-next-line @typescript-eslint/quotes
      [Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'name'],
    ],
    where: {
      importId,
      [Op.or]: [
        { status },
        {
          status: IMPORT_STATUSES.COLLECTION_FAILED,
          downloadAttempts: { [Op.gt]: 5 },
        },
      ],
    },
    // Ordering the results by ftpFileInfo.date in descending order
    // eslint-disable-next-line @typescript-eslint/quotes
    order: [[Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'DESC']],
    raw: true,
    lock: true, // Lock the row for update to prevent race conditions
  });

  // Check if a file was found
  if (importFile) {
    // Return the name of the prior file
    return importFile.name;
  }
  // Handle the case where no file was found
  return null; // or throw new Error('No prior file found.');
};

/**
 * Checks if there are more files to download for a given import.
 *
 * @param importId - The ID of the import.
 * @returns A boolean indicating if there are more files to download.
 */
const importHasMoreToDownload = async (
  importId: number,
) => {
  const pendingFiles = await ImportFile.findAll({
    attributes: ['id'],
    where: {
      importId,
      downloadAttempts: { [Op.lt]: 5 },
      status: [IMPORT_STATUSES.IDENTIFIED, IMPORT_STATUSES.COLLECTION_FAILED],
    },
    lock: true, // Lock the row for update to prevent race conditions
  });

  return (pendingFiles?.length || 0) >= 1;
};

/**
 * Checks if there are more files to download for a given import.
 *
 * @param importId - The ID of the import.
 * @returns A boolean indicating if there are more files to download.
 */
const importHasMoreToProcess = async (
  importId: number,
) => {
  const pendingFiles = await ImportFile.findAll({
    attributes: ['id'],
    where: {
      importId,
      processAttempts: { [Op.lt]: 5 },
      status: [IMPORT_STATUSES.COLLECTED, IMPORT_STATUSES.PROCESSING_FAILED],
    },
    lock: true, // Lock the row for update to prevent race conditions
  });

  return (pendingFiles?.length || 0) >= 1;
};

/**
 * Retrieves the next import file to process based on the provided import ID and maximum attempts.
 *
 * @param importId - The ID of the import.
 * @param maxAttempts - The maximum number of process attempts allowed. Defaults to 5 if
 * not provided.
 * @returns A promise that resolves to the next import file to process, or undefined if no
 * import file is found.
 */
const getNextFileToProcess = async (
  importId: number,
  maxAttempts = 5,
) => {
  const tenMinutesAgo = new Date(new Date().getTime() - 10 * 60000);

  // Define the PostgresInterval interface
  interface PostgresInterval {
    seconds: number;
    milliseconds: number;
  }

  // Use the PostgresInterval interface in the destructuring assignment
  /* eslint-disable @typescript-eslint/quotes */
  /* eslint-disable prefer-template */
  const results = await ZALImportFile.findAll({
    attributes: [
      // Using Sequelize.fn to calculate the average difference in timestamps
      [fn('AVG', fn(
        'AGE',
        fn('CAST', literal(`new_row_data->>'updatedAt' AS TIMESTAMP`)),
        fn('CAST', literal(`old_row_data->>'updatedAt' AS TIMESTAMP`)),
      )),
      'avg'],

      // Using Sequelize.fn to calculate the standard deviation of the difference in timestamps
      [literal(`STDDEV(extract ('epoch' from (new_row_data->>'updatedAt')::timestamp - (old_row_data->>'updatedAt')::timestamp)) * interval '1 sec'`),
        'stddev'],
    ],
    where: {
      [Op.and]: [
        // Using Sequelize.literal to filter rows based on JSONB content
        literal(`old_row_data->>'status' = 'PROCESSING'`),
        literal(`new_row_data->>'status' = 'PROCESSED'`),
      ],
    },
    raw: true, // This will give you raw JSON objects instead of model instances
  }) as [{ avg: PostgresInterval, stddev: PostgresInterval }];
  /* eslint-enable @typescript-eslint/quotes */
  /* eslint-disable prefer-template */

  const [{
    avg,
    stddev,
  }] = results
    && results.length
    && results[0]?.avg
    && results[0]?.stddev
    ? results
    : [{
      avg: { seconds: 120, milliseconds: 0 },
      stddev: { seconds: 0, milliseconds: 0 },
    }];

  // Calculate the total milliseconds for 3 * stddev
  const totalStdDevMilliseconds = 3 * (stddev.seconds || 0) * 1000 + 3 * (stddev.milliseconds || 0);

  // Mark hung jobs as failed
  await ImportFile.update(
    {
      status: IMPORT_STATUSES.PROCESSING_FAILED,
    },
    {
      where: {
        status: IMPORT_STATUSES.PROCESSING,
        [Op.and]: [
          literal(`"updatedAt" + INTERVAL '${(avg.seconds || 0) + Math.floor((avg.milliseconds + totalStdDevMilliseconds) / 1000)} seconds ${(avg.milliseconds + totalStdDevMilliseconds) % 1000} milliseconds' > NOW()`),
        ],
      },
      lock: true, // Lock the row for update to prevent race conditions
    },
  );

  // Find the next import file to process without join and locking mechanism
  const importFile = await ImportFile.findOne({
    attributes: [
      'id',
      'fileId',
      'status',
      'processAttempts',
      'importId',
    ],
    where: {
      importId,
      fileId: { [Op.ne]: null }, // Ensure fileId is not null
      [Op.or]: [
        // New Work
        { status: IMPORT_STATUSES.COLLECTED }, // Import file is in the "collected" status
        // Rework
        {
          // Import file is in the "processing_failed" status
          status: IMPORT_STATUSES.PROCESSING_FAILED,
          // Number of process attempts is less than the maximum allowed attempts
          processAttempts: { [Op.lt]: maxAttempts },
        },
      ],
    },
    order: [
      ['createdAt', 'ASC'],
    ],
    limit: 1, // Limit the result to 1 record
    lock: true, // Lock the row for update to prevent race conditions
    raw: true,
  });

  if (!importFile) {
    return null;
  }

  // Fetch the associated File data
  const file = await File.findOne({
    attributes: ['key'],
    where: {
      id: importFile.fileId,
    },
    raw: true,
  });

  // Fetch the associated Import data
  const importData = await Import.findOne({
    attributes: ['definitions'],
    where: {
      id: importFile.importId,
    },
    raw: true,
  });
  return {
    importFileId: importFile.id,
    fileId: importFile.fileId,
    status: importFile.status,
    processAttempts: importFile.processAttempts,
    fileKey: file?.key,
    importDefinitions: importData?.definitions,
  };
};

/**
 * Records available files for a specific import.
 * @param importId - The ID of the import.
 * @param availableFiles - An array of available files with their details.
 * @returns A promise that resolves when all database operations are completed.
 */
const recordAvailableFiles = async (
  importId: number,
  availableFiles: FileListing[],
) => {
  // Retrieve current import files from the database
  const currentImportFiles: {
    id: number,
    importId: number,
    fileInfo: FTPFileInfo,
  }[] = await ImportFile.findAll({
    attributes: [
      'id',
      'importId',
      ['ftpFileInfo', 'fileInfo'],
    ],
    where: {
      importId,
    },
    raw: true,
    lock: true, // Lock the row for update to prevent race conditions
  });

  const fileMatches = (currentImportFile, availableFile) => (
    importId === currentImportFile.importId
    && availableFile?.fileInfo?.path === currentImportFile?.fileInfo?.path
    && availableFile?.fileInfo?.name === currentImportFile?.fileInfo?.name
  );

  // Separate the available files into new, matched, and removed files
  // New files are those that are not already recorded in the database
  const newFiles = availableFiles
    .filter((availableFile) => !currentImportFiles
      .some((currentImportFile) => fileMatches(currentImportFile, availableFile)))
    .map(({ stream: _stream, ...availableFile }) => availableFile);
  // Matched files are those that are already recorded in the database
  const matchedFiles = availableFiles
    .filter((availableFile) => currentImportFiles
      .some((currentImportFile) => fileMatches(currentImportFile, availableFile)))
    .map(({ stream: _stream, ...availableFile }) => availableFile);
  // Removed files are those that were recorded in the database but are no longer available
  const removedFiles = currentImportFiles
    .filter((currentImportFile) => !availableFiles
      .some((availableFile) => fileMatches(currentImportFile, availableFile)));

  return Promise.all([
    // Create new files in the database if there are any
    ...(newFiles.length > 0
      ? newFiles.map((newFile) => ImportFile.create(
        {
          importId,
          ftpFileInfo: newFile.fileInfo,
          status: IMPORT_STATUSES.IDENTIFIED,
        },
        {
          lock: true, // Lock the row for update to prevent race conditions
        },
      ))
      : []),
    // Update matched files in the database if there are any
    ...(matchedFiles.length > 0
      ? matchedFiles.map(async (matchedFile) => ImportFile.update(
        {
          ftpFileInfo: matchedFile.fileInfo,
        },
        {
          where: {
            importId,
            ftpFileInfo: {
              [Op.contains]: {
                path: matchedFile.fileInfo.path,
                name: matchedFile.fileInfo.name,
              },
            },
          },
          individualHooks: true,
          lock: true, // Lock the row for update to prevent race conditions
        },
      ))
      : []),
    // Delete removed files from the database if there are any
    (removedFiles.length > 0
      ? ImportFile.destroy({
        where: {
          importId,
          id: removedFiles.map(({ id }) => id),
          status: [IMPORT_STATUSES.IDENTIFIED],
        },
        individualHooks: true,
        lock: true, // Lock the row for update to prevent race conditions
      })
      : Promise.resolve()),
  ]);
};

/**
 * Asynchronously records the state of data files available in a ZIP archive by comparing them
 * with the entries already stored in the database. It categorizes the files into new, matched,
 * and removed files, and performs the appropriate database operations for each category:
 * - New files are added to the database.
 * - Matched files have their records updated in the database.
 * - Removed files are deleted from the database.
 *
 * @param importFileId - The ID of the import file to which the available files are related.
 * @param availableFiles - An array of ZipFileInfo objects representing the files available
 *                         in the ZIP archive.
 * @returns A Promise that resolves when all database operations are complete. The promise
 *          resolves with an array of results for the bulk create, update, and destroy operations.
 * @throws Errors from the database operations will propagate through the returned Promise.
 */
const recordAvailableDataFiles = async (
  importFileId: number,
  availableFiles: ZipFileInfo[],
) => {
  const currentImportDataFiles: {
    id: number,
    importFileId: number,
    fileInfo: ZipFileInfo,
  }[] = await ImportDataFile.findAll({
    attributes: [
      'id',
      'importFileId',
      'fileInfo',
    ],
    where: {
      importFileId,
    },
    raw: true,
  });

  const fileMatches = (currentImportDataFile, availableFile) => (
    importFileId === currentImportDataFile?.importFileId
    && availableFile.path === currentImportDataFile.fileInfo.path
    && availableFile.name === currentImportDataFile.fileInfo.name
  );
  // Separate the available files into new, matched, and removed files
  // New files are those that are not already recorded in the database
  const newFiles = availableFiles
    .filter((availableFile) => !currentImportDataFiles
      .some((currentImportDataFile) => fileMatches(currentImportDataFile, availableFile)));
  // Matched files are those that are already recorded in the database
  const matchedFiles = availableFiles
    .filter((availableFile) => currentImportDataFiles
      .some((currentImportDataFile) => fileMatches(currentImportDataFile, availableFile)));
  // Removed files are those that were recorded in the database but are no longer available
  const removedFiles = currentImportDataFiles
    .filter((currentImportDataFile) => !availableFiles
      .some((availableFile) => fileMatches(currentImportDataFile, availableFile)));

  return Promise.all([
    // Create new files in the database if there are any
    ...(newFiles.length > 0
      ? newFiles.map((newFile) => ImportDataFile.create({
        importFileId,
        fileInfo: newFile,
        status: IMPORT_DATA_STATUSES.IDENTIFIED,
      }))
      : []),
    // Update matched files in the database if there are any
    ...(matchedFiles.length > 0
      ? matchedFiles.map(async (matchedFile) => ImportDataFile.update(
        {
          importFileId,
          fileInfo: matchedFile,
        },
        {
          where: {
            importFileId,
            fileInfo: {
              [Op.contains]: {
                path: matchedFile.path,
                name: matchedFile.name,
              },
            },
          },
          individualHooks: true,
        },
      ))
      : []),
    // Delete removed files from the database if there are any
    (removedFiles.length > 0
      ? ImportDataFile.destroy({
        where: {
          importFileId,
          id: removedFiles.map(({ id }) => id),
        },
        individualHooks: true,
      })
      : Promise.resolve()),
  ]);
};

/**
 * Asynchronously updates the metadata for an available data file.
 *
 * @param importFileId - The ID of the file to update.
 * @param fileInfo - Information about the file, either a `ZipFileInfo` object or an object
 * with a `name` property.
 * @param status - The new status to set for the file.
 * @param metadata - A record containing the metadata to update. Can include various types
 * such as string, number,
 *                   string array, `SchemaNode`, or nested records.
 * @returns A promise that resolves with the result of the update operation.
 * @throws Will throw an error if the update operation fails.
 */
const updateAvailableDataFileMetadata = async (
  importFileId: number,
  fileInfo: ZipFileInfo | { name: string },
  status: string,
  metadata: Record<
  string,
  string | number | string[] | SchemaNode | Record<
  string,
  string | number | Record<
  string,
  string | number
  >
  >
  >,
) => {
  const result = ImportDataFile.update(
    {
      ...metadata,
      status,
    },
    {
      where: {
        importFileId,
        fileInfo: {
          name: fileInfo.name,
        },
      },
      individualHooks: true,
    },
  );

  return result;
};

/**
 * Retrieves or creates an import file record based on the provided import ID and available
 * file information.
 * @param importId - The ID of the import.
 * @param availableFile - An object containing the path, fileInfo, and optional stream of
 * the available file.
 * @returns An object with the import file ID and key.
 */
const logFileToBeCollected = async (
  importId: number,
  availableFile: FileListing,
): Promise<{
  importFileId: number,
  key: string,
  attempts: number,
}> => {
  let key;

  // Step 1: Find and lock the import file record based on the import ID and available
  // file information
  const importFile = await ImportFile.findOne({
    attributes: ['id', 'fileId', 'downloadAttempts'],
    where: {
      importId,
      ftpFileInfo: {
        [Op.contains]: {
          path: availableFile.fileInfo.path,
          name: availableFile.fileInfo.name,
        },
      },
    },
    lock: true, // Lock the row for update to prevent race conditions
    raw: true,
  });

  if (!importFile) {
    throw new Error('Import file not found');
  }

  const downloadAttempts = importFile.downloadAttempts + 1;

  if (!importFile.fileId) {
    // Generate a unique key for the file using the import ID, a UUID, and the file extension
    const uuid: string = uuidv4();
    const extension = availableFile.fileInfo.name.split('.').pop();
    key = `/import/${importId}/${uuid}.${extension}`;

    // Create a new file record with the generated key and other details
    const fileRecord = await File.create({
      key,
      originalFileName: availableFile.fileInfo.name,
      fileSize: availableFile.fileInfo.size,
      status: FILE_STATUSES.UPLOADING,
    });

    // Update the import file record with the newly created file ID
    await ImportFile.update(
      {
        fileId: fileRecord.id,
        downloadAttempts,
        status: IMPORT_STATUSES.COLLECTING,
      },
      {
        where: {
          id: importFile.id,
        },
        lock: true, // Lock the row for update to prevent race conditions
      },
    );
  } else {
    // Step 2: Fetch the associated file record
    const file = await File.findOne({
      attributes: ['key'],
      where: {
        id: importFile.fileId,
      },
    });

    // Retrieve the key from the existing import file record
    key = file ? file.key : null;
    await ImportFile.update(
      {
        downloadAttempts,
        status: IMPORT_STATUSES.COLLECTING,
      },
      {
        where: {
          id: importFile.id,
        },
        lock: true, // Lock the row for update to prevent race conditions
      },
    );
  }

  return {
    importFileId: importFile.id,
    key,
    attempts: downloadAttempts,
  };
};

/**
 * Updates the hash of an import file with the given ID.
 * @param importFileId - The ID of the import file to update.
 * @param hash - The new hash value to set.
 * @returns A promise that resolves when the update is complete.
 */
const setImportFileHash = async (
  importFileId: number,
  hash: string | null,
  status?: string,
) => ImportFile.update(
  {
    hash, // Set the 'hash' field of the import file to the new value
    ...(status && { status }),
  },
  {
    where: { id: importFileId }, // Specify the import file to update based on its ID
    individualHooks: true, // Enable individual hooks for each updated record
    lock: true, // Lock the row for update to prevent race conditions
  },
);

/**
 * Updates the status of an import file.
 * @param importFileId - The ID of the import file to update.
 * @param status - The new status value to set.
 * @returns A promise that resolves when the update is complete.
 */
const setImportFileStatus = async (
  importFileId: number,
  status: string,
  downloadAttempts: null | number = null,
  processAttempts: null | number = null,
) => ImportFile.update(
  {
    status, // Set the status field to the provided value
    ...(downloadAttempts && { downloadAttempts }),
    ...(processAttempts && { processAttempts }),
  },
  {
    where: { id: importFileId }, // Specify the import file to update based on its ID
    individualHooks: true, // Enable individual hooks for each updated record
    lock: true, // Lock the row for update to prevent race conditions
  },
);

/**
 * Updates the status of an import data file.
 * @param importFileId - The ID of the import data file to update.
 * @param status - The new status value to set.
 * @returns A promise that resolves when the update is complete.
 */
const setImportDataFileStatus = async (
  importDataFileId: number,
  status: string,
) => ImportDataFile.update(
  {
    status, // Set the status field to the provided value
  },
  {
    where: { id: importDataFileId }, // Specify the import file to update based on its ID
    individualHooks: true, // Enable individual hooks for each updated record
  },
);

/**
 * Asynchronously sets the status of an import data file based on its path and name.
 * It first tries to find the file using the provided importFileId and fileInfo within
 * the database. If the file is found, it updates the status; otherwise, it resolves the
 * promise without any action.
 *
 * @param importFileId - The ID of the import file to which the data file belongs.
 * @param fileInfo - An object containing the path and name of the file inside the zip.
 * @param status - The new status to set for the import data file.
 * @returns A promise that resolves to the result of setting the status if the file is found,
 *          or resolves to undefined if the file is not found.
 */
const setImportDataFileStatusByPath = async (
  importFileId: number,
  fileInfo: ZipFileInfo,
  status: string,
) => {
  const importDataFile = await ImportDataFile.findOne({
    where: {
      importFileId,
      fileInfo: {
        [Op.contains]: {
          path: fileInfo.path,
          name: fileInfo.name,
        },
      },
    },
  });
  return importDataFile
    ? setImportDataFileStatus(importDataFile.id, status)
    : Promise.resolve();
};

/**
 * Asynchronously retrieves all enabled imports from the database with specific attributes.
 *
 * The function queries the database for all records in the Import model where the 'enabled'
 * field is true. It only fetches the 'id', 'name', and 'schedule' attributes of the Import records.
 * The results are returned in a raw format (plain JavaScript objects).
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of raw import schedule objects.
 */
const importSchedules = async (): Promise<{
  id: number,
  name: string,
  schedule: string
}[]> => Import.findAll({
  attributes: [
    'id',
    'name',
    'schedule',
  ],
  where: {
    enabled: true,
  },
  raw: true,
});

export {
  getPriorFile,
  importHasMoreToDownload,
  importHasMoreToProcess,
  getNextFileToProcess,
  recordAvailableFiles,
  recordAvailableDataFiles,
  logFileToBeCollected,
  setImportFileHash,
  setImportFileStatus,
  setImportDataFileStatus,
  setImportDataFileStatusByPath,
  updateAvailableDataFileMetadata,
  importSchedules,
};
