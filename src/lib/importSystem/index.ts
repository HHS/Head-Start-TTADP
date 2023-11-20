/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import FtpClient, { FileInfo as FTPFileInfo, FTPSettings } from '../stream/ftp';
import S3Client from '../stream/s3';
import Hasher from '../stream/hasher';
import ZipStream, { FileInfo as ZipFileInfo } from '../stream/zip';
import EncodingConverter from '../stream/encoding';
import XMLStream from '../stream/xml';
import { remap, collectChangedValues } from '../dataObjectUtils';
import { filterDataToModel } from '../modelUtils';
import db, { Sequelize } from '../../models';
import { FILE_STATUSES, IMPORT_STATUSES } from '../../constants';
import addToScanQueue from '../../services/scanQueue';
import { updateStatusByKey } from '../../services/files';

const {
  File,
  Import,
  ImportFile,
} = db;

// TODO: split this into multiple files
/**
 * 1: Imports accessor functions
 *  a: find
 *    i: find - schedule
 *    i: find - processDefinitions
 *  b: insert
 *  c: update
 * 2: ImportFiles accessor and management functions
 *  a: find
 *    i: find - ftpFileInfos
 *    i: find - zipFileInfos
 *  b: insert
 *  c: update
 *    i: update - ftpFileInfo
 *    ii: update - zipFileInfos
 */

const getImportSchedules = async () => Import.findAll({
  attributes: [
    'id',
    'url',
    'scehdule',
  ],
  where: {
    enabled: true,
  },
});

const getImportProcessDefinitions = async (
  id: number,
) => Import.findAll({
  attributes: [
    'id',
    'remapDefs',
  ],
  where: {
    id,
    enabled: true,
  },
});

const insertImport = async () => Import.create(); // TODO

const updateImport = async () => Import.update(); // TODO

const getImportFilesZipInfo = async (
  importId: number,
) => ImportFile.findOne({
  attributes: [
    'id',
    'importId',
    'fileId',
    'ftpFileInfo',
  ],
  where: {
    importId,
  },
  order: [['createdAt', 'desc']],
});

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
  fileInfo: ZipFileInfo,
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
  filesToProcess: (ZipFileInfo)[],
  processDefinitions: string[],
) => {
  if (processDefinitions.length === 0) return;
  const nextToProcess = processDefinitions.pop();

  try {
    const fileInfoToProcess = filesToProcess
      .find(({ name }) => name === nextToProcess);
    if (fileInfoToProcess) {
      const fileStream = await zipClient.getFileStream(fileInfoToProcess.name);
      if (!fileStream) throw new Error(`Failed to get stream from ${fileInfoToProcess.name}`);
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

const processFTP = async (
  processDefinitions: {
    ftpSettings: FTPSettings,
    zipPassword?: string,
    fileProcessDefinitions: {
      remapDefs,
      model,
      key,
    }[],
  },
) => {
  const { ftpSettings }: { ftpSettings: FTPSettings } = processDefinitions;
  const ftpClient = new FtpClient(ftpSettings);
  const latestFtpFile = await ftpClient.getLatest('/');

  // TODO - save/log data
  const file = await File.create(
    {
      originalFileName: latestFtpFile?.fileInfo.name,
      key,
      status: 'UPLOADING',
      fileSize: latestFtpFile?.fileInfo.size,
    },
    { independentHooks: true },
  );

  const s3Client = new S3Client();
  const s3LoadedFile = await s3Client.uploadFileAsStream(key, latestFtpFile.stream);

  file.status = 'UPLOADED';
  await file.save();
  // TODO - save/log data

  const s3FileStreamForHash = await s3Client.downloadFileAsStream(key);
  const hasherClient = new Hasher(s3FileStreamForHash);
  const hash = await hasherClient.generateSha265();

  // TODO - save/log data - hash

  const { zipPassword }: { zipPassword: string | undefined } = processDefinitions;
  const zipClient = new ZipStream(s3FileStream, zipPassword);
  const fileDetails = await zipClient.getAllFileDetails();
  const filteredFileDetails = fileDetails
    // remove nulls
    .filter((fileDetail) => fileDetail) as ZipFileInfo[];

  // TODO - save/log data

  await processFiles(
    zipClient,
    filteredFileDetails,
    processDefinitions,
  );
};

const formatDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

//---------------------------------------------------------------------------------------

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

  // Separate the available files into new, matched, and removed files
  const [
    newfiles,
    matchedFiles,
    removedFiles,
  ] = [
    // New files are those that are not already recorded in the database
    availableFiles
      .filter((availableFile) => !currentImportFiles
        .some((currentImportFile) => (
          importId === currentImportFile.importId
          && availableFile.fileInfo.path === currentImportFile.fileInfo.path
          && availableFile.fileInfo.name === currentImportFile.fileInfo.name
        ))),
    // Matched files are those that are already recorded in the database
    availableFiles
      .filter((availableFile) => currentImportFiles
        .some((currentImportFile) => (
          importId === currentImportFile.importId
          && availableFile.fileInfo.path === currentImportFile.fileInfo.path
          && availableFile.fileInfo.name === currentImportFile.fileInfo.name
        ))),
    // Removed files are those that were recorded in the database but are no longer available
    currentImportFiles
      .filter((currentImportFile) => !availableFiles
        .some((availableFile) => (
          importId === currentImportFile.importId
          && availableFile.fileInfo.path === currentImportFile.fileInfo.path
          && availableFile.fileInfo.name === currentImportFile.fileInfo.name
        ))),
  ];

  return Promise.all([
    // Create new files in the database if there are any
    (newfiles.length > 0
      ? ImportFile.bulkCreate(
        newfiles.map((newFile) => ({
          importId,
          ftpFileInfo: newFile.fileInfo,
          status: IMPORT_STATUSES.IDENTIFIED,
        })),
        { independentHooks: true }
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
              Sequelize.literal(`"ftpFileInfo" -> 'path' = '${matchedFile.fileInfo.path}'`),
              Sequelize.literal(`"ftpFileInfo" -> 'name' = '${matchedFile.fileInfo.name}'`),
            ],
          }
        }
      ))
      : []),
    // Delete removed files from the database if there are any
    (removedFiles.length > 0
      ? ImportFile.destroy({
        where: {
          importId,
          id: removedFiles.map(({id}) => id),
        },
        independentHooks: true,
      })
      : Promise.resolve()),
  ]);
};

/**
 * Retrieves or creates an import file record based on the provided import ID and available file information.
 * @param importId - The ID of the import.
 * @param availableFile - An object containing the path, fileInfo, and optional stream of the available file.
 * @returns An object with the import file ID and key.
 */
const logFileToBeCollected = async (
  importId: number,
  availableFile: {
    fullPath: string,
    fileInfo: FTPFileInfo,
    stream?: Promise<Readable>,
  },
) => {
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
      }]
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
  }
  
  return {
    importFileId: importFile.id,
    key,
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
  hash: string,
  status?: string,
) => ImportFile.update(
  { 
    hash, // Set the 'hash' field of the import file to the new value
    ...(status && { status }),
  }, 
  {
    where: { id: importFileId }, // Specify the import file to update based on its ID
    individualHooks: true, // Enable individual hooks for each updated record
  }
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
) => ImportFile.update(
  { 
    status, // Set the status field to the provided value
  }, 
  {
    where: { id: importFileId }, // Specify the import file to update based on its ID
    individualHooks: true, // Enable individual hooks for each updated record
  }
);

const collectNextFile = async (
  importId: number,
  availableFiles: {
    fullPath: string,
    fileInfo: FTPFileInfo,
    stream?: Promise<Readable>,
  }[],
  times: {
    start: Date,
    limit: Date,
    used?: number[],
  },
  importedFiles: {
    importFileId: number,
    key: string,
  }[] = [],
): Promise<{
  hasImportedFiles: boolean,
  hasRemainingFiles: boolean,
}> => {
  const availableFile = availableFiles.shift();
  const currentStart = new Date();

  if (availableFile === undefined) {
    return { hasImportedFiles: !!importedFiles, hasRemainingFiles: false };
  } else if (currentStart > times.limit) {
    return {  hasImportedFiles: !!importedFiles, hasRemainingFiles: !!availableFile };
  } else if ((times?.used?.length || 0) > 0) {
    const avg = (times?.used?.reduce((acc, val) => acc + val, 0) || 1) / (times?.used?.length || 1);
    if (new Date(currentStart.getTime() + avg) > times.limit) {
      return {  hasImportedFiles: !!importedFiles, hasRemainingFiles: !!availableFile };
    }
  }

  if (!times?.used) {
    times.used = [];
  }

  const importFileData = await logFileToBeCollected(importId, availableFile);

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
    await Promise.all([
      updateStatusByKey(importFileData.key, FILE_STATUSES.UPLOAD_FAILED),
    ]);
    // TODO: log error
    return collectNextFile(importId, availableFiles, times, importedFiles);
  }

  // Scan file
  // Note: file will be queued for processing without waiting on status of scanning
  addToScanQueue({ key: importFileData.key });
  await updateStatusByKey(importFileData.key, FILE_STATUSES.QUEUED);

  times.used.push(new Date().getTime() - currentStart.getTime());
  return collectNextFile(importId, availableFiles, times, importedFiles);
};

const collectFilesFromSource = async (
  importId,
  timeBox,
  ftpSettings,
  path = '/',
  fileMask?: string | undefined,
) => {
  const {
    host,
    port,
    username,
    password: passwordENV,
  } = ftpSettings;
  const password = process.env?.[passwordENV];

  if (!password) {
    throw new Error(`Password was not found for importId: ${importId} at ENV: ${passwordENV}`);
  }

  const ftpClient = new FtpClient({
    host,
    port,
    username,
    password,
  });

  const { name: priorFile } = await ImportFile.findOne({
    attributes: [
      ['ftpFileInfo->>\'name\'', 'name'],
    ], // Selecting the 'name' attribute from ftpFileInfo
    where: {
      importId,
      status: IMPORT_STATUSES.PROCESSED,
    },
    order: [[`ftpFileInfo->>'date'`, 'DESC']], // Ordering by ftpFileInfo.date in descending order
    raw: true,
  });

  const availableFiles = await ftpClient.listFiles(
    path,
    fileMask,
    priorFile,
    true,
  );

  await recordAvailableFiles(importId, availableFiles);

  const startTime = new Date();
  const timeLimit = new Date(startTime.getTime() + timeBox);

  const { collectedFiles, hasRemainingFiles } = await collectNextFile(
    importId,
    availableFiles,
    {
      start: startTime,
      limit: timeLimit,
    }
  );

  return collectedFiles;
};

/**
 * Downloads files from a source based on the import ID.
 * @param importId - The ID of the import.
 * @param timeBox - Optional time limit for the download process in milliseconds. Defaults to 5 minutes.
 * @returns A promise that resolves with the collected files from the source.
 */
const download = async (
  importId: number,
  timeBox = 5 * 60 * 1000,
) => {
  // Retrieve import file data from the database
  const importFileData: {
    importId: number,
    ftpSettings: FTPSettings,
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
  logFileToBeCollected,
  collectNextFile,
  collectFilesFromSource,
  download,
  process,
};
