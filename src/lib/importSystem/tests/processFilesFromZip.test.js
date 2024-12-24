/* eslint-disable max-len */
import processFilesFromZip from '../processFilesFromZip';
import { setImportDataFileStatusByPath, updateAvailableDataFileMetadata } from '../record';
import { IMPORT_DATA_STATUSES, IMPORT_STATUSES } from '../../../constants';
import { auditLogger } from '../../../logger';
import processFile from '../processFile';
import ZipStream from '../../stream/zip';

jest.mock('../record');
jest.mock('../../../logger');
jest.mock('../processFile');
jest.mock('../../stream/zip');

describe('processFilesFromZip', () => {
  const importFileId = 1;
  let zipClient;

  const filesToProcess = [
    { name: 'file1.xml', path: 'path/to/file1.xml' },
    { name: 'file2.xml', path: 'path/to/file2.xml' },
  ];
  const processDefinitions = [
    {
      fileName: 'file1.xml',
      remapDef: {},
      tableName: 'table1',
      keys: ['key1'],
      encoding: 'utf8',
    },
    {
      fileName: 'file2.xml',
      remapDef: {},
      tableName: 'table2',
      keys: ['key2'],
      encoding: 'utf8',
    },
  ];

  beforeEach(() => {
    zipClient = new ZipStream();
    zipClient.getFileStream.mockImplementation(() => ({}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exits early if processDefinitions is empty', async () => {
    await processFilesFromZip(importFileId, zipClient, filesToProcess, []);

    expect(setImportDataFileStatusByPath).not.toHaveBeenCalled();
    expect(processFile).not.toHaveBeenCalled();
    expect(updateAvailableDataFileMetadata).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('should process all files successfully', async () => {
    processFile.mockImplementation(() => ({
      errors: [],
      schema: {},
      hash: 'hash',
      inserts: [],
      updates: [],
      deletes: [],
    }));

    await processFilesFromZip(importFileId, zipClient, filesToProcess, processDefinitions.map((def) => ({ ...def })));

    expect(setImportDataFileStatusByPath).toHaveBeenCalledTimes(2);
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file1.xml', path: 'path/to/file1.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file2.xml', path: 'path/to/file2.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
    expect(processFile).toHaveBeenCalledTimes(2);
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8', fileName: 'file2.xml', keys: ['key2'], remapDef: {}, tableName: 'table2',
      },
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      {},
    );
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8', fileName: 'file1.xml', keys: ['key1'], remapDef: {}, tableName: 'table1',
      },
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      {},
    );
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2);
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: 'hash',
        recordCounts: {
          deletes: 0, errors: {}, inserts: 0, updates: 0,
        },
        schema: {},
      },
    );
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: 'hash',
        recordCounts: {
          deletes: 0, errors: {}, inserts: 0, updates: 0,
        },
        schema: {},
      },
    );
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file1.xml', path: 'path/to/file1.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file2.xml', path: 'path/to/file2.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
  });

  it('should handle errors when processing a file', async () => {
    processFile.mockRejectedValueOnce(new Error('Processing error')).mockResolvedValueOnce({
      errors: [],
      schema: {},
      hash: 'hash',
      inserts: [],
      updates: [],
      deletes: [],
    });

    await processFilesFromZip(importFileId, zipClient, filesToProcess, processDefinitions.map((def) => ({ ...def })));

    expect(setImportDataFileStatusByPath).toHaveBeenCalledTimes(2);
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file1.xml', path: 'path/to/file1.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file2.xml', path: 'path/to/file2.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
    expect(processFile).toHaveBeenCalledTimes(2);
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8', fileName: 'file2.xml', keys: ['key2'], remapDef: {}, tableName: 'table2',
      },
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      {},
    );
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8', fileName: 'file1.xml', keys: ['key1'], remapDef: {}, tableName: 'table1',
      },
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      {},
    );
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2);
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml' },
      IMPORT_STATUSES.PROCESSING_FAILED,
      {
        recordCounts: {
          errors: {
            'Processing error': 1,
          },
        },
      },
    );
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: 'hash',
        recordCounts: {
          deletes: 0, errors: {}, inserts: 0, updates: 0,
        },
        schema: {},
      },
    );
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file1.xml', path: 'path/to/file1.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(importFileId, { name: 'file2.xml', path: 'path/to/file2.xml' }, IMPORT_DATA_STATUSES.PROCESSING);
  });

  it('should handle cases where there are no files to process', async () => {
    await processFilesFromZip(importFileId, zipClient, [], processDefinitions.map((def) => ({ ...def })));

    expect(setImportDataFileStatusByPath).not.toHaveBeenCalled();
    expect(processFile).not.toHaveBeenCalled();
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2);
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(importFileId, undefined, IMPORT_STATUSES.PROCESSING_FAILED, {});
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
