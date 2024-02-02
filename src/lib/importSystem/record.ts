import { Op } from 'sequelize';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { FileInfo as FTPFileInfo } from '../stream/ftp';
import { SchemaNode } from '../stream/xml';
import { FileInfo as ZipFileInfo } from '../stream/zip';
import db, { Sequelize } from '../../models';
import { FILE_STATUSES, IMPORT_STATUSES } from '../../constants';

const {
  File,
  Import,
  ImportFile,
  ImportDataFile,
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
  status: string = IMPORT_STATUSES.COLLECTED,
) => {
  // Find the prior file associated with the given importId
  const importFile = await ImportFile.findOne({
    attributes: [
      // Selecting the 'name' attribute from ftpFileInfo
      // eslint-disable-next-line @typescript-eslint/quotes
      [Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'name'],
    ],
    where: {
      importId,
      status,
    },
    // Ordering the results by ftpFileInfo.date in descending order
    // eslint-disable-next-line @typescript-eslint/quotes
    order: [[Sequelize.literal(`"ftpFileInfo" ->> 'date'`), 'DESC']],
    raw: true,
  });

  // Check if a file was found
  if (importFile) {
    // Return the name of the prior file
    return importFile.name;
  }
  // Handle the case where no file was found
  // You could return null, undefined, or throw an error, depending on your application's needs
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
  });

  return pendingFiles?.length || 0 >= 1;
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
  });

  return pendingFiles?.length || 0 >= 1;
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
  // Find the next import file to process
  const importFile = await ImportFile.findOne({
    attributes: [
      ['id', 'importFileId'],
      'fileId',
      'status',
      'processAttempts',
    ],
    include: [
      {
        model: File,
        as: 'file',
        attributes: [
          'key',
        ],
      },
      {
        model: Import,
        as: 'import',
        attributes: [
          'definitions',
        ],
      },
    ],
    where: {
      importId,
      [Op.or]: [
        { status: IMPORT_STATUSES.COLLECTED }, // Import file is in the "collected" status
        {
          // Import file is in the "processing_failed" status
          status: IMPORT_STATUSES.PROCESSING_FAILED,
          // Number of process attempts is less than the maximum allowed attempts
          processAttempts: { [Op.lt]: maxAttempts },
        },
      ],
    },
    order: [
      ['ftpFileInfo->>"name"', 'ASC'], // Order by file name in ascending order
      ['ftpFileInfo->>"date"', 'ASC'], // Order by file date in ascending order
    ],
    limit: 1, // Limit the result to 1 record
  });

  return importFile;
};

/**
 * Records available files for a specific import.
 * @param importId - The ID of the import.
 * @param availableFiles - An array of available files with their details.
 * @returns A promise that resolves when all database operations are completed.
 */
const recordAvailableFiles = async (
  importId: number,
  availableFiles: {
    fullPath: string,
    fileInfo: FTPFileInfo,
    stream?: Promise<Readable>,
  }[],
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
      status: { [Op.not]: IMPORT_STATUSES.PROCESSED },
    },
    raw: true,
  });

  const fileMatches = (file, fileSet) => (currentImportFile, availableFile) => (
    importId === currentImportFile.importId
    && availableFile.fileInfo.name === currentImportFile.fileInfo.name
  );

  // Separate the available files into new, matched, and removed files
  // New files are those that are not already recorded in the database
  const newFiles = availableFiles
    .filter((availableFile) => !currentImportFiles
      .some((currentImportFile) => fileMatches(currentImportFile, availableFile)));
  // Matched files are those that are already recorded in the database
  const matchedFiles = availableFiles
    .filter((availableFile) => currentImportFiles
      .some((currentImportFile) => fileMatches(currentImportFile, availableFile)));
  // Removed files are those that were recorded in the database but are no longer available
  const removedFiles = currentImportFiles
    .filter((currentImportFile) => !availableFiles
      .some((availableFile) => fileMatches(currentImportFile, availableFile)));

  return Promise.all([
    // Create new files in the database if there are any
    (newFiles.length > 0
      ? ImportFile.bulkCreate(
        newFiles.map((newFile) => ({
          importId,
          ftpFileInfo: newFile.fileInfo,
          status: IMPORT_STATUSES.IDENTIFIED,
        })),
        { individualHooks: true },
      )
      : Promise.resolve()),
    // Update matched files in the database if there are any
    ...(matchedFiles.length > 0
      ? matchedFiles.map(async (matchedFile) => ImportFile.update(
        {
          importId,
          ftpFileInfo: matchedFile.fileInfo,
        },
        {
          where: {
            importId,
            [Op.and]: [
              Sequelize.literal(`"ftpFileInfo" -> 'name' = '${matchedFile.fileInfo.name}'`),
            ],
          },
        },
      ))
      : []),
    // Delete removed files from the database if there are any
    (removedFiles.length > 0
      ? ImportFile.destroy({
        where: {
          importId,
          id: removedFiles.map(({ id }) => id),
        },
        individualHooks: true,
      })
      : Promise.resolve()),
  ]);
};

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
      ['zipFileInfo', 'fileInfo'],
    ],
    where: {
      importFileId,
    },
    raw: true,
  });

  const fileMatches = (file, fileSet) => (currentImportDataFile, availableFile) => (
    importFileId === currentImportDataFile.importFileId
    && availableFile.path === currentImportDataFile.fileInfo.path
    && availableFile.fileInfo.name === currentImportDataFile.fileInfo.name
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
    (newFiles.length > 0
      ? ImportFile.bulkCreate(
        newFiles.map((newFile) => ({
          importFileId,
          fileInfo: newFile,
          status: IMPORT_STATUSES.IDENTIFIED,
        })),
        { individualHooks: true },
      )
      : Promise.resolve()),
    // Update matched files in the database if there are any
    ...(matchedFiles.length > 0
      ? matchedFiles.map(async (matchedFile) => ImportFile.update(
        {
          importFileId,
          fileInfo: matchedFile,
        },
        {
          where: {
            importFileId,
            [Op.and]: [
              Sequelize.literal(`"fileInfo" -> 'path' = '${matchedFile.path}'`),
              Sequelize.literal(`"fileInfo" -> 'name' = '${matchedFile.name}'`),
            ],
          },
        },
      ))
      : []),
    // Delete removed files from the database if there are any
    (removedFiles.length > 0
      ? ImportFile.destroy({
        where: {
          importFileId,
          id: removedFiles.map(({ id }) => id),
        },
        individualHooks: true,
      })
      : Promise.resolve()),
  ]);
};

const updateAvailableDataFileMetadata = async (
  importFileId: number,
  fileInfo: ZipFileInfo | { name: string },
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
  const isProcessed = !!metadata?.hash;

  const result = ImportDataFile.update(
    {
      ...metadata,
      processed: isProcessed,
    },
    {
      where: {
        importFileId,
        fileInfo: {
          name: fileInfo.name,
        },
        individualHooks: true,
      },
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
  availableFile: {
    fullPath: string,
    fileInfo: FTPFileInfo,
    stream?: Promise<Readable>,
  },
): Promise<{
  importFileId: number,
  key: string,
  attempts: number,
}> => {
  let key;

  // Find the import file record based on the import ID and available file information
  const importFile = ImportFile.findOne({
    attributes: [
      'fileId',
    ],
    where: {
      importId,
      [Op.and]: [
        Sequelize.literal(`"ftpFileInfo" -> 'path' = '${availableFile.fileInfo.path}'`),
        Sequelize.literal(`"ftpFileInfo" -> 'name' = '${availableFile.fileInfo.name}'`),
      ],
      include: [{
        model: File,
        as: 'file',
        attributes: ['key'],
      }],
    },
  });

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
        downloadAttempts: importFile.dataValues.downloadAttempts + 1,
      },
      {
        where: {
          importId,
          [Op.and]: [
            Sequelize.literal(`"ftpFileInfo" -> 'path' = '${availableFile.fileInfo.path}'`),
            Sequelize.literal(`"ftpFileInfo" -> 'name' = '${availableFile.fileInfo.name}'`),
          ],
        },
      },
    );
  } else {
    // Retrieve the key from the existing import file record
    key = importFile.file.dataValues.key;
    await ImportFile.update(
      {
        downloadAttempts: importFile.dataValues.downloadAttempts + 1,
      },
      {
        where: {
          importId,
          [Op.and]: [
            Sequelize.literal(`"ftpFileInfo" -> 'path' = '${availableFile.fileInfo.path}'`),
            Sequelize.literal(`"ftpFileInfo" -> 'name' = '${availableFile.fileInfo.name}'`),
          ],
        },
      },
    );
  }

  return {
    importFileId: importFile.id,
    key,
    attempts: importFile.dataValues.downloadAttempts,
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
    ...(!downloadAttempts && { downloadAttempts }),
    ...(!processAttempts && { processAttempts }),
  },
  {
    where: { id: importFileId }, // Specify the import file to update based on its ID
    individualHooks: true, // Enable individual hooks for each updated record
  },
);

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
  updateAvailableDataFileMetadata,
  importSchedules,
};
