import { Readable } from 'stream';
import {
  collectNextFile,
  collectFilesFromSource,
  downloadFilesFromSource,
} from '../download';
import { FileInfo as SFTPFileInfo } from '../../stream/sftp';
import db from '../../../models';

// Mocks for external dependencies
jest.mock('stream');
jest.mock('../../stream/sftp');
jest.mock('../../stream/hasher');
jest.mock('../../stream/s3');
jest.mock('../../../services/files');
jest.mock('../../../constants');
jest.mock('../../../services/scanQueue');
jest.mock('../record', () => ({
  getPriorFile: jest.fn(),
  recordAvailableFiles: jest.fn(),
  logFileToBeCollected: jest.fn(),
  setImportFileHash: jest.fn(),
  setImportFileStatus: jest.fn(),
}));
jest.mock('../../../services/files', () => ({
  updateStatusByKey: jest.fn(),
}));
jest.mock('../../../services/scanQueue', () => jest.fn());

describe('collectNextFile', () => {
  it('should return the collected files when there are no more files to collect', async () => {
    const result = await collectNextFile(1, [], { start: new Date(), limit: new Date() });
    expect(result).toEqual({
      collectedFiles: [],
      hasImportedFiles: false,
      hasRemainingFiles: false,
    });
  });

  // Add more tests for different scenarios, such as:
  // - When the time limit is exceeded
  // - When the average time used indicates the next file cannot be processed in time
  // - When the maximum attempts for a file have been reached
  // - When a file is successfully collected
  // - When an error occurs during file collection
});

describe('collectFilesFromSource', () => {
  it('should collect files from the FTP server', async () => {
    const mockFtpClient = {
      connect: jest.fn(),
      listFiles: jest.fn().mockResolvedValue([]),
      disconnect: jest.fn(),
    };
    const { default: FtpClient } = jest.requireActual('../stream/ftp');
    FtpClient.mockImplementation(() => mockFtpClient);

    const importId = 1;
    const timeBox = 1000;
    const ftpSettings = {
      host: 'localhost',
      port: '21',
      username: 'user',
      password: 'pass',
    };
    const path = '/';
    const fileMask = undefined;

    const collectedFiles = await collectFilesFromSource(
      importId,
      timeBox,
      ftpSettings,
      path,
      fileMask,
    );
    expect(collectedFiles).toEqual([]);
    expect(mockFtpClient.connect).toHaveBeenCalled();
    expect(mockFtpClient.listFiles).toHaveBeenCalledWith(path, fileMask, undefined, true);
    expect(mockFtpClient.disconnect).toHaveBeenCalled();
  });

  // Add more tests for different scenarios, such as:
  // - When an error occurs during FTP client creation
  // - When an error occurs during FTP connection
  // - When an error occurs during file listing
  // - When an error occurs during FTP disconnection
});

describe('downloadFilesFromSource', () => {
  it('should download files from the source based on the import ID', async () => {
    const importId = 1;
    const timeBox = 300000; // 5 minutes

    const { Import } = db;
    Import.findOne.mockResolvedValue({
      importId,
      ftpSettings: {
        host: 'localhost',
        port: '21',
        username: 'user',
        password: 'pass',
      },
      path: '/',
      fileMask: undefined,
    });

    const collectedFiles = await downloadFilesFromSource(importId, timeBox);
    expect(collectedFiles).toBeDefined();
    expect(Import.findOne).toHaveBeenCalledWith({
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
  });

  // Add more tests for different scenarios, such as:
  // - When the Import model returns null
  // - When an error occurs during file collection
});
