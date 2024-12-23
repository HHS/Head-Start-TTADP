/* eslint-disable max-len */
import { processZipFileFromS3 } from '../process';
import {
  getNextFileToProcess,
  setImportFileStatus,
} from '../record';
import S3Client from '../../stream/s3';
import ZipStream from '../../stream/zip'; // Adjust the import path
import { auditLogger } from '../../../logger'; // Adjust the import path
import { IMPORT_STATUSES } from '../../../constants'; // Adjust the import path

jest.mock('../record');
jest.mock('../../stream/s3');
jest.mock('../../stream/zip');
jest.mock('../../../logger');

describe('processZipFileFromS3', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should resolve if there is no file to process', async () => {
    const importId = 1;
    getNextFileToProcess.mockResolvedValue(null);

    await expect(processZipFileFromS3(importId)).resolves.toBeUndefined();
  });

  it('should handle error when downloading file from S3 fails', async () => {
    const importId = 1;
    const importFile = {
      importFileId: 1,
      processAttempts: 0,
      fileKey: 'fileKey',
      importDefinitions: [{ fileName: 'fileName', path: 'path' }],
    };
    getNextFileToProcess.mockResolvedValue(importFile);
    S3Client.prototype.downloadFileAsStream.mockRejectedValue(new Error('S3 error'));

    const result = await processZipFileFromS3(importId);

    expect(setImportFileStatus).toHaveBeenCalledWith(importFile.importFileId, IMPORT_STATUSES.PROCESSING, null, importFile.processAttempts + 1);
    expect(setImportFileStatus).toHaveBeenCalledWith(importFile.importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('S3 error'), expect.any(Error));
    expect(result).toEqual({
      error: 'S3 error',
      duration: expect.any(Number),
    });
  });

  it('should handle error when getting file details from zip archive fails', async () => {
    const importId = 1;
    const importFile = {
      importFileId: 1,
      processAttempts: 0,
      fileKey: 'fileKey',
      importDefinitions: [{ fileName: 'fileName', path: 'path' }],
    };
    getNextFileToProcess.mockResolvedValue(importFile);
    S3Client.prototype.downloadFileAsStream.mockResolvedValue('s3FileStream');
    ZipStream.prototype.getAllFileDetails.mockRejectedValue(new Error('Zip error'));

    const result = await processZipFileFromS3(importId);

    expect(setImportFileStatus).toHaveBeenCalledWith(importFile.importFileId, IMPORT_STATUSES.PROCESSING, null, importFile.processAttempts + 1);
    expect(setImportFileStatus).toHaveBeenCalledWith(importFile.importFileId, IMPORT_STATUSES.PROCESSING_FAILED);
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Zip error'), expect.any(Error));
    expect(result).toEqual({
      error: 'Zip error',
      duration: expect.any(Number),
    });
  });
});
