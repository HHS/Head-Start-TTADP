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
import { downloadFilesFromSource } from './download';
import { processZipFileFromS3 } from './process';

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

const formatDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

//---------------------------------------------------------------------------------------

const download = async (
  importId: number,
) => downloadFilesFromSource(importId);

const process = async (
  importId: number,
) => processZipFileFromS3(importId);

export {
  logFileToBeCollected,
  collectNextFile,
  collectFilesFromSource,
  download,
  process,
};
