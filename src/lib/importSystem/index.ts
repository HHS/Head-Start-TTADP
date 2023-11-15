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
import db from '../../models';
import { FILE_STATUSES } from '../../constants';
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

const logFileToBeCollected = async (
  importId: number,
  availableFile: {
    path: string,
    fileInfo: FTPFileInfo,
    stream?: Promise<Readable>,
  },
) => {
  const uuid: string = uuidv4();
  const extension = availableFile.fileInfo.name.split('.').pop();
  const key = `/import/${importId}/${uuid}.${extension}`;

  const fileRecord = await File.create({
    key,
    originalFileName: availableFile.fileInfo.name,
    fileSize: availableFile.fileInfo.size,
    status: FILE_STATUSES.UPLOADING,
  });
  const importFile = await ImportFile.create({
    importId,
    fileId: fileRecord.id,
    ftpFileInfo: availableFile.fileInfo,
  });

  return {
    importFileId: importFile.id,
    key,
  };
};

const collectFile = async (
  importId: number,
  availableFile: {
    path: string,
    fileInfo: FTPFileInfo,
    stream?: Promise<Readable>,
  },
) => {
  const importFileData = await logFileToBeCollected(importId, availableFile);

  const s3Client = new S3Client();
  try {
    await s3Client.uploadFileAsStream(
      importFileData.key,
      await availableFile.stream,
    );
    await updateStatusByKey(importFileData.key, FILE_STATUSES.UPLOADED);
  } catch (err) {
    await updateStatusByKey(importFileData.key, FILE_STATUSES.UPLOAD_FAILED);
    throw err;
  }

  // Scan file
  addToScanQueue({ key: importFileData.key });
  await updateStatusByKey(importFileData.key, FILE_STATUSES.QUEUED);

  return importFileData;
};

const collectFilesFromSource = async (
  importId,
  ftpSettings,
  path = '/',
  fileMask?: string,
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
    },
    order: [['ftpFileInfo->>\'date\'', 'DESC']], // Ordering by ftpFileInfo.date in descending order
    raw: true,
  });

  const availableFiles = await ftpClient.listFiles(
    path,
    fileMask,
    priorFile,
    true,
  );

  const collectedFiles = await Promise.all(availableFiles.map(async (
    availableFile,
  ) => collectFile(
    importId,
    availableFile,
  )));

  return collectedFiles;
};

const download = async (importId: number) => {
  const importFileData: {
    importId: number,
    ftpSettings: FTPSettings,
    path: string,
    fileMask: string | null,
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

  const collectedFiles = await collectFilesFromSource(
    importFileData.importId,
    importFileData.ftpSettings,
    importFileData.path,
    importFileData.fileMask,
  );

  return collectedFiles;
};

//  // TODO - make this a function that just takes importId
//   const priorImportedFile = await ImportFiles.findOne({
//     attributes: [
//       'ftpFileInfo',
//     ],
//     where: {
//       importId,
//     },
//     order: [['createdAt', 'DESC']],
//   });
