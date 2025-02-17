import {
  Sequelize,
  Op,
} from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
  ImportFile,
  ImportDataFile,
  File,
  Import,
  ZALImportFile,
} from '../../../models'; // Adjust the import path as necessary
import {
  getPriorFile,
  importHasMoreToDownload,
  importHasMoreToProcess,
  getNextFileToProcess,
  recordAvailableFiles,
  recordAvailableDataFiles,
  updateAvailableDataFileMetadata,
  logFileToBeCollected,
  setImportFileHash,
  setImportFileStatus,
  setImportDataFileStatusByPath,
  importSchedules,
} from '../record'; // Adjust the import path as necessary
import { IMPORT_STATUSES, IMPORT_DATA_STATUSES, FILE_STATUSES } from '../../../constants'; // Adjust the import path as necessary

// Mocking Sequelize and ImportFile model
jest.mock('../../../models', () => ({
  Import: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  ImportFile: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  ImportDataFile: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  File: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  ZALImportFile: {
    findAll: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-mock'),
}));

describe('record', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    jest.clearAllMocks();
  });

  describe('getPriorFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the name of the prior file when found', async () => {
      const mockName = 'prior-file.txt';
      ImportFile.findOne.mockResolvedValue({ name: mockName });

      const importId = 1;
      const status = IMPORT_STATUSES.COLLECTED;
      const result = await getPriorFile(importId, status);

      expect(ImportFile.findOne).toHaveBeenCalledWith({
        attributes: [
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
        // eslint-disable-next-line @typescript-eslint/quotes
        order: [[Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'DESC']],
        raw: true,
        lock: true,
      });
      expect(result).toBe(mockName);
    });

    it('should return null when no prior file is found', async () => {
      ImportFile.findOne.mockResolvedValue(null);

      const importId = 1;
      const status = IMPORT_STATUSES.COLLECTED;
      const result = await getPriorFile(importId, status);

      expect(ImportFile.findOne).toHaveBeenCalledWith({
        attributes: [
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
        // eslint-disable-next-line @typescript-eslint/quotes
        order: [[Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'DESC']],
        raw: true,
        lock: true,
      });
      expect(result).toBeNull();
    });

    it('should throw an error if there is an error while retrieving the prior file', async () => {
      const error = new Error('Database error');
      ImportFile.findOne.mockRejectedValue(error);

      const importId = 1;
      const status = IMPORT_STATUSES.COLLECTED;

      await expect(getPriorFile(importId, status)).rejects.toThrow('Database error');
    });

    it('should use the default status value when no status is provided', async () => {
      const mockName = 'default-status-file.txt';
      ImportFile.findOne.mockResolvedValue({ name: mockName });

      const importId = 1;
      const result = await getPriorFile(importId);

      expect(ImportFile.findOne).toHaveBeenCalledWith({
        attributes: [
          // eslint-disable-next-line @typescript-eslint/quotes
          [Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'name'],
        ],
        where: {
          importId,
          [Op.or]: [
            { status: IMPORT_STATUSES.COLLECTED },
            {
              status: IMPORT_STATUSES.COLLECTION_FAILED,
              downloadAttempts: { [Op.gt]: 5 },
            },
          ],
        },
        // eslint-disable-next-line @typescript-eslint/quotes
        order: [[Sequelize.literal(`"ftpFileInfo" ->> 'name'`), 'DESC']],
        raw: true,
        lock: true,
      });
      expect(result).toBe(mockName);
    });
  });

  describe('importHasMoreToDownload', () => {
    // Setup before each test
    beforeEach(() => {
      ImportFile.findAll.mockClear();
    });

    it('should return true if there are pending files to download', async () => {
      // Mock the response from the ImportFile.findAll method
      ImportFile.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const importId = 123;
      const result = await importHasMoreToDownload(importId);

      // Check if the method returns true
      expect(result).toBe(true);

      // Check if ImportFile.findAll was called with the correct parameters
      expect(ImportFile.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        where: {
          importId,
          downloadAttempts: { [Op.lt]: 5 },
          status: [IMPORT_STATUSES.IDENTIFIED, IMPORT_STATUSES.COLLECTION_FAILED],
        },
        lock: true,
      });
    });

    it('should return false if there are no pending files to download', async () => {
      // Mock the response from the ImportFile.findAll method to return an empty array
      ImportFile.findAll.mockResolvedValue([]);

      const importId = 456;
      const result = await importHasMoreToDownload(importId);

      // Check if the method returns false
      expect(result).toBe(false);

      // Check if ImportFile.findAll was called with the correct parameters
      expect(ImportFile.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        where: {
          importId,
          downloadAttempts: { [Op.lt]: 5 },
          status: [IMPORT_STATUSES.IDENTIFIED, IMPORT_STATUSES.COLLECTION_FAILED],
        },
        lock: true,
      });
    });

    it('should handle errors thrown by the ImportFile.findAll method', async () => {
      // Mock the response from the ImportFile.findAll method to throw an error
      ImportFile.findAll.mockRejectedValue(new Error('Database error'));

      const importId = 789;
      await expect(importHasMoreToDownload(importId)).rejects.toThrow('Database error');

      // Check if ImportFile.findAll was called with the correct parameters
      expect(ImportFile.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        where: {
          importId,
          downloadAttempts: { [Op.lt]: 5 },
          status: [IMPORT_STATUSES.IDENTIFIED, IMPORT_STATUSES.COLLECTION_FAILED],
        },
        lock: true,
      });
    });
  });

  describe('importHasMoreToProcess', () => {
    it('should return true if there are pending files to process', async () => {
      // Arrange
      const importId = 1;
      const mockPendingFiles = [{ id: 1 }, { id: 2 }];
      ImportFile.findAll.mockResolvedValue(mockPendingFiles);

      // Act
      const result = await importHasMoreToProcess(importId);

      // Assert
      expect(ImportFile.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        where: {
          importId,
          processAttempts: { [Op.lt]: 5 },
          status: [IMPORT_STATUSES.COLLECTED, IMPORT_STATUSES.PROCESSING_FAILED],
        },
        lock: true,
      });
      expect(result).toBe(true);
    });

    it('should return false if there are no pending files to process', async () => {
      // Arrange
      const importId = 2;
      const mockPendingFiles = [];
      ImportFile.findAll.mockResolvedValue(mockPendingFiles);

      // Act
      const result = await importHasMoreToProcess(importId);

      // Assert
      expect(ImportFile.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        where: {
          importId,
          processAttempts: { [Op.lt]: 5 },
          status: [IMPORT_STATUSES.COLLECTED, IMPORT_STATUSES.PROCESSING_FAILED],
        },
        lock: true,
      });
      expect(result).toBe(false);
    });

    it('should handle errors thrown by the ImportFile.findAll method', async () => {
      // Arrange
      const importId = 3;
      const errorMessage = 'Error finding import files';
      ImportFile.findAll.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(importHasMoreToProcess(importId)).rejects.toThrow(errorMessage);
    });
  });

  describe('getNextFileToProcess', () => {
    it('should call ImportFile.findOne with the correct parameters', async () => {
      const importId = 1;
      const maxAttempts = 3;
      const mockImportFile = {
        id: 123,
        fileId: 1,
        importId: 1,
        status: 'collected',
        processAttempts: 1,
      };
      const mockFile = {
        id: mockImportFile.fileId,
        key: '/import/1/cc74c8a9-9fe7-4bf4-bde7-1ba1962e9e2d.zip',
      };
      const mockImport = {
        id: mockImportFile.fileId,
        definitions: [
          {
            keys: [
              'statusId',
            ],
            path: '.',
            encoding: 'utf16le',
            fileName: 'AMS_ReviewStatus.xml',
            remapDef: {
              Name: 'name',
              StatusId: 'statusId',
            },
            tableName: 'MonitoringReviewStatuses',
          },
        ],
      };
      ImportFile.findOne.mockResolvedValue(mockImportFile);
      File.findOne.mockResolvedValue(mockFile);
      Import.findOne.mockResolvedValue(mockImport);

      const result = await getNextFileToProcess(importId, maxAttempts);

      expect(ImportFile.findOne).toHaveBeenCalledWith({
        attributes: [
          'id',
          'fileId',
          'status',
          'processAttempts',
          'importId',
        ],
        where: {
          importId,
          fileId: { [Op.ne]: null },
          [Op.or]: [
            { status: IMPORT_STATUSES.COLLECTED },
            {
              status: IMPORT_STATUSES.PROCESSING_FAILED,
              processAttempts: { [Op.lt]: maxAttempts },
            },
          ],
        },
        order: [['createdAt', 'ASC']],
        limit: 1,
        lock: true,
        raw: true,
      });

      expect(File.findOne).toHaveBeenCalledWith({
        attributes: ['key'],
        where: {
          id: mockImportFile.fileId,
        },
        raw: true,
      });

      expect(Import.findOne).toHaveBeenCalledWith({
        attributes: ['definitions'],
        where: {
          id: mockImportFile.importId,
        },
        raw: true,
      });

      expect(result).toEqual({
        importFileId: mockImportFile.id,
        fileId: mockImportFile.fileId,
        status: mockImportFile.status,
        processAttempts: mockImportFile.processAttempts,
        fileKey: mockFile?.key,
        importDefinitions: mockImport?.definitions,
      });
    });

    it('should return null when no import file is found', async () => {
      const importId = 2;
      ImportFile.findOne.mockResolvedValue(null);

      const result = await getNextFileToProcess(importId);

      expect(result).toBeNull();
    });

    it('should use the default maxAttempts value when not provided', async () => {
      const importId = 3;
      const defaultMaxAttempts = 5;
      const mockValues = {
        id: 456,
        fileId: 1,
        importId,
        status: 'collected',
        processAttempts: 2,
      };
      ImportFile.findOne.mockImplementation((options) => {
        const processAttemptsCondition = options.where[Op.or][1].processAttempts;
        if (processAttemptsCondition[Op.lt] === defaultMaxAttempts) {
          return Promise.resolve();
        }
        return Promise.resolve(null);
      });

      const result = await getNextFileToProcess(importId);
      expect(ImportFile.findOne).toHaveBeenCalledWith({
        attributes: [
          'id',
          'fileId',
          'status',
          'processAttempts',
          'importId',
        ],
        where: {
          importId,
          fileId: { [Op.ne]: null },
          [Op.or]: [
            { status: IMPORT_STATUSES.COLLECTED },
            {
              status: IMPORT_STATUSES.PROCESSING_FAILED,
              processAttempts: { [Op.lt]: defaultMaxAttempts },
            },
          ],
        },
        order: [['createdAt', 'ASC']],
        limit: 1,
        lock: true,
        raw: true,
      });
    });

    it('should use avg and stddev from results when provided', async () => {
      const importId = 1;
      const maxAttempts = 3;
      const mockImportFile = {
        id: 123,
        fileId: 1,
        importId: 1,
        status: 'collected',
        processAttempts: 1,
      };
      const mockFile = {
        id: mockImportFile.fileId,
        key: '/import/1/cc74c8a9-9fe7-4bf4-bde7-1ba1962e9e2d.zip',
      };
      const mockImport = {
        id: mockImportFile.fileId,
        definitions: [
          {
            keys: [
              'statusId',
            ],
            path: '.',
            encoding: 'utf16le',
            fileName: 'AMS_ReviewStatus.xml',
            remapDef: {
              Name: 'name',
              StatusId: 'statusId',
            },
            tableName: 'MonitoringReviewStatuses',
          },
        ],
      };
      const mockResults = [{
        avg: { seconds: undefined, milliseconds: 0 },
        stddev: { seconds: 10, milliseconds: 0 },
      }];
      ZALImportFile.findAll.mockResolvedValue(mockResults);
      ImportFile.findOne.mockResolvedValue(mockImportFile);
      File.findOne.mockResolvedValue(mockFile);
      Import.findOne.mockResolvedValue(mockImport);

      const result = await getNextFileToProcess(importId, maxAttempts);

      expect(ZALImportFile.findAll).toHaveBeenCalled();
      expect(ImportFile.findOne).toHaveBeenCalledWith({
        attributes: [
          'id',
          'fileId',
          'status',
          'processAttempts',
          'importId',
        ],
        where: {
          importId,
          fileId: { [Op.ne]: null },
          [Op.or]: [
            { status: IMPORT_STATUSES.COLLECTED },
            {
              status: IMPORT_STATUSES.PROCESSING_FAILED,
              processAttempts: { [Op.lt]: maxAttempts },
            },
          ],
        },
        order: [['createdAt', 'ASC']],
        limit: 1,
        lock: true,
        raw: true,
      });

      expect(File.findOne).toHaveBeenCalledWith({
        attributes: ['key'],
        where: {
          id: mockImportFile.fileId,
        },
        raw: true,
      });

      expect(Import.findOne).toHaveBeenCalledWith({
        attributes: ['definitions'],
        where: {
          id: mockImportFile.importId,
        },
        raw: true,
      });

      expect(result).toEqual({
        importFileId: mockImportFile.id,
        fileId: mockImportFile.fileId,
        status: mockImportFile.status,
        processAttempts: mockImportFile.processAttempts,
        fileKey: mockFile?.key,
        importDefinitions: mockImport?.definitions,
      });
    });
  });

  describe('recordAvailableFiles', () => {
    const importId = 1;
    const availableFiles = [
      { fullPath: '/path/to/file1.txt', fileInfo: { path: '/path/to', name: 'file1.txt' } },
      { fullPath: '/path/to/file2.txt', fileInfo: { path: '/path/to', name: 'file2.txt' } },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create new files in the database', async () => {
      ImportFile.findAll.mockResolvedValueOnce([]);
      await recordAvailableFiles(importId, availableFiles);

      expect(ImportFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          importId: expect.anything(),
          ftpFileInfo: expect.any(Object),
          status: IMPORT_STATUSES.IDENTIFIED,
        }),
        { lock: true },
      );
    });

    it('should update matched files in the database', async () => {
      ImportFile.findAll.mockResolvedValueOnce([
        { id: 2, importId, fileInfo: availableFiles[0].fileInfo },
      ]);
      await recordAvailableFiles(importId, availableFiles);

      expect(ImportFile.update).toHaveBeenCalledWith(
        { ftpFileInfo: availableFiles[0].fileInfo },
        {
          where: {
            importId,
            ftpFileInfo: {
              [Op.contains]: {
                path: availableFiles[0].fileInfo.path,
                name: availableFiles[0].fileInfo.name,
              },
            },
          },
          individualHooks: true,
          lock: true,
        },
      );
    });

    it('should delete removed files from the database', async () => {
      ImportFile.findAll.mockResolvedValueOnce([
        {
          id: 2,
          importId,
          fileInfo: { path: '/path/to', name: 'file3.txt' },
        },
      ]);
      await recordAvailableFiles(importId, availableFiles);

      expect(ImportFile.destroy).toHaveBeenCalledWith({
        where: {
          importId,
          id: [2],
          status: [IMPORT_STATUSES.IDENTIFIED],
        },
        individualHooks: true,
        lock: true,
      });
    });

    it('should handle when there are no new, or removed files', async () => {
      ImportFile.findAll.mockResolvedValueOnce(availableFiles.map((file, index) => ({
        id: index + 2,
        importId,
        fileInfo: file.fileInfo,
      })));
      await recordAvailableFiles(importId, availableFiles);

      expect(ImportFile.create).not.toHaveBeenCalled();
      expect(ImportFile.update).toHaveBeenCalled();
      expect(ImportFile.destroy).not.toHaveBeenCalled();
    });

    it('should resolve all promises when handling files', async () => {
      ImportFile.findAll.mockResolvedValueOnce([]);
      const result = await recordAvailableFiles(importId, availableFiles);
      ImportFile.create = jest.fn().mockResolvedValue(Promise);

      expect(result).toBeInstanceOf(Array);
      // Assuming there are three types of operations: create, update, delete
      expect(result).toHaveLength(3);
    });
  });

  describe('recordAvailableDataFiles', () => {
    // Define common variables for your tests
    const importFileId = 1;
    const availableFiles = [
      // Populate with test data for available files
      { path: '/data/current/', name: 'file1.csv' },
      { path: '/data/current/', name: 'file2.csv' },
      { path: '/data/new/', name: 'file3.csv' },
    ];
    const currentImportDataFiles = [
      // Populate with test data for current import data files in the database
      { fileInfo: { path: '/data/current/', name: 'file1.csv' }, importFileId: 1, status: 'PROCESSED' },
      { fileInfo: { path: '/data/current/', name: 'file2.csv' }, importFileId: 1, status: 'PROCESSED' },
    ];

    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    it('should create new files in the database when there are new files', async () => {
      // Mock the database response for current import data files
      ImportDataFile.findAll.mockResolvedValue(currentImportDataFiles);

      // Assuming that availableFiles contains some files that are not in currentImportDataFiles
      const newFiles = availableFiles
        .filter((af) => !currentImportDataFiles
          .some((cif) => cif.fileInfo.path === af.path && cif.fileInfo.name === af.name));

      // Mock the database response for create
      const mockNewFilesResponse = newFiles
        .map((file) => ({
          ...file,
          id: expect.any(Number),
          importFileId,
          status: IMPORT_DATA_STATUSES.IDENTIFIED,
        }));
      ImportDataFile.create.mockResolvedValue(mockNewFilesResponse[0]);

      await recordAvailableDataFiles(importFileId, availableFiles);

      // Expected argument for create should be the new files with additional properties
      const expectedBulkCreateArgument = newFiles.map((newFile) => ({
        importFileId,
        fileInfo: newFile,
        status: IMPORT_DATA_STATUSES.IDENTIFIED,
      }));

      expect(ImportDataFile.create)
        .toHaveBeenCalledWith(expectedBulkCreateArgument[0]);
    });

    it('should update matched files in the database when there are matched files', async () => {
      // Mock the database response for current import data files
      ImportDataFile.findAll.mockResolvedValue(currentImportDataFiles);
      // Mock the database response for update
      ImportDataFile.update.mockResolvedValue(/* Mock response for updated files */);

      const matchedFile = availableFiles[0]; // Assuming this is a matched file for the test

      await recordAvailableDataFiles(importFileId, availableFiles);

      expect(ImportDataFile.update).toHaveBeenCalledWith(
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
      );
    });

    it('should delete removed files from the database when there are removed files', async () => {
      ImportDataFile.findAll.mockResolvedValue(currentImportDataFiles);

      await recordAvailableDataFiles(importFileId, [availableFiles[0]]);

      expect(ImportDataFile.destroy).toHaveBeenCalled();
    });

    it('should not perform any database operations when there are no new, or removed files', async () => {
      // Mock the database response for current import data files
      ImportDataFile.findAll.mockResolvedValue(currentImportDataFiles);

      await recordAvailableDataFiles(importFileId, [availableFiles[0], availableFiles[1]]);

      expect(ImportDataFile.create).not.toHaveBeenCalled();
      expect(ImportDataFile.update).toHaveBeenCalled();
      expect(ImportDataFile.destroy).not.toHaveBeenCalled();
    });

    // Add more tests as needed to cover different scenarios and edge cases
  });

  describe('updateAvailableDataFileMetadata', () => {
    // Define common variables for tests if needed
    let importFileId;
    let fileInfo;
    let status;
    let metadata;

    beforeEach(() => {
      // Reset the mocks before each test
      jest.clearAllMocks();

      // Initialize variables with test data
      importFileId = 1;
      fileInfo = { name: 'test.zip' };
      status = IMPORT_DATA_STATUSES.PROCESSED;
      metadata = { key: 'value' };
    });

    it('should call ImportDataFile.update with the correct parameters', async () => {
      // Arrange
      const expectedUpdateArg = {
        ...metadata,
        status,
      };
      const expectedWhereClause = {
        where: {
          importFileId,
          fileInfo: {
            name: fileInfo.name,
          },
        },
        individualHooks: true,
      };

      // Act
      await updateAvailableDataFileMetadata(importFileId, fileInfo, status, metadata);

      // Assert
      expect(ImportDataFile.update).toHaveBeenCalledWith(expectedUpdateArg, expectedWhereClause);
    });

    it('should return the result of the ImportDataFile.update call', async () => {
      // Arrange
      const mockUpdateResult = { affectedRows: 1 };
      ImportDataFile.update.mockResolvedValue(mockUpdateResult);

      // Act
      const result = await updateAvailableDataFileMetadata(
        importFileId,
        fileInfo,
        status,
        metadata,
      );

      // Assert
      expect(result).toEqual(mockUpdateResult);
    });
  });

  describe('logFileToBeCollected', () => {
    const importId = 123;
    const availableFile = {
      fullPath: '/path/to/file.txt',
      fileInfo: {
        path: '/path/to',
        name: 'file.txt',
        size: 1024,
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a new file record and update import file record if fileId does not exist', async () => {
      ImportFile.findOne.mockResolvedValue({
        id: 1,
        fileId: null,
        downloadAttempts: 0,
      });

      File.create.mockResolvedValue({
        id: 2,
        key: '/import/123/uuid-mock.txt',
      });

      const result = await logFileToBeCollected(importId, availableFile);

      expect(ImportFile.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          importId,
          ftpFileInfo: {
            [Op.contains]: {
              path: availableFile.fileInfo.path,
              name: availableFile.fileInfo.name,
            },
          },
        }),
      }));

      expect(File.create).toHaveBeenCalledWith({
        key: `/import/${importId}/uuid-mock.txt`,
        originalFileName: availableFile.fileInfo.name,
        fileSize: availableFile.fileInfo.size,
        status: FILE_STATUSES.UPLOADING,
      });

      expect(ImportFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: 2,
          downloadAttempts: 1,
          status: IMPORT_STATUSES.COLLECTING,
        }),
        expect.anything(),
      );

      expect(result).toEqual({
        importFileId: 1,
        key: '/import/123/uuid-mock.txt',
        attempts: 1,
      });
    });

    it('should update import file record if fileId exists', async () => {
      ImportFile.findOne.mockResolvedValue({
        id: 1,
        fileId: 2,
        downloadAttempts: 1,
      });

      File.findOne.mockResolvedValue({
        id: 2,
        key: '/import/123/uuid-mock.txt',
      });

      const result = await logFileToBeCollected(importId, availableFile);

      expect(ImportFile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadAttempts: 2,
          status: IMPORT_STATUSES.COLLECTING,
        }),
        expect.anything(),
      );

      expect(result).toEqual({
        importFileId: 1,
        key: '/import/123/uuid-mock.txt',
        attempts: 2,
      });
    });

    it('should throw when ImportFile record is not found', async () => {
      ImportFile.findOne.mockResolvedValue(null);

      await expect(logFileToBeCollected(importId, availableFile)).rejects.toThrow();
    });
  });

  describe('setImportFileHash', () => {
    // Define constants for testing
    const importFileId = 1;
    const newHash = 'newHashValue';
    const status = 'processed';

    beforeEach(() => {
      // Clear all instances and calls to constructor and all methods:
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call ImportFile.update with the correct parameters when only hash is provided', async () => {
      await setImportFileHash(importFileId, newHash);

      expect(ImportFile.update).toHaveBeenCalledWith(
        { hash: newHash },
        { where: { id: importFileId }, individualHooks: true, lock: true },
      );
    });

    it('should call ImportFile.update with the correct parameters when hash and status are provided', async () => {
      await setImportFileHash(importFileId, newHash, status);

      expect(ImportFile.update).toHaveBeenCalledWith(
        { hash: newHash, status },
        { where: { id: importFileId }, individualHooks: true, lock: true },
      );
    });

    it('should not include status in the update payload if it is not provided', async () => {
      await setImportFileHash(importFileId, newHash);

      expect(ImportFile.update).toHaveBeenCalledWith(
        { hash: newHash },
        { where: { id: importFileId }, individualHooks: true, lock: true },
      );
    });

    it('should handle null hash values', async () => {
      await setImportFileHash(importFileId, null);

      expect(ImportFile.update).toHaveBeenCalledWith(
        { hash: null },
        { where: { id: importFileId }, individualHooks: true, lock: true },
      );
    });

    it('should return a promise that resolves when the update is complete', async () => {
      const mockUpdatePromise = Promise.resolve();
      ImportFile.update.mockReturnValue(mockUpdatePromise);

      const result = setImportFileHash(importFileId, newHash);

      await expect(result).resolves.toBeUndefined();
      expect(ImportFile.update).toHaveBeenCalled();
    });
  });

  describe('setImportFileStatus', () => {
    // Define the variables that will be used in the tests
    const importFileId = 1;
    const status = 'processed';
    const downloadAttempts = 3;
    const processAttempts = 2;

    beforeEach(() => {
      // Clear all instances and calls to constructor and all methods:
      jest.clearAllMocks();
    });

    it('should update the status of an import file', async () => {
      // Arrange
      const expectedUpdateArg = {
        status,
      };

      // Act
      await setImportFileStatus(importFileId, status);

      // Assert
      expect(ImportFile.update).toHaveBeenCalledWith(expectedUpdateArg, {
        where: { id: importFileId },
        individualHooks: true,
        lock: true,
      });
    });

    it('should update the download attempts when provided', async () => {
      // Arrange
      const expectedUpdateArg = {
        status,
        downloadAttempts,
      };

      // Act
      await setImportFileStatus(importFileId, status, downloadAttempts);

      // Assert
      expect(ImportFile.update).toHaveBeenCalledWith(expectedUpdateArg, {
        where: { id: importFileId },
        individualHooks: true,
        lock: true,
      });
    });

    it('should update the process attempts when provided', async () => {
      // Arrange
      const expectedUpdateArg = {
        status,
        processAttempts,
      };

      // Act
      await setImportFileStatus(importFileId, status, null, processAttempts);

      // Assert
      expect(ImportFile.update).toHaveBeenCalledWith(expectedUpdateArg, {
        where: { id: importFileId },
        individualHooks: true,
        lock: true,
      });
    });

    it('should update both download and process attempts when provided', async () => {
      // Arrange
      const expectedUpdateArg = {
        status,
        downloadAttempts,
        processAttempts,
      };

      // Act
      await setImportFileStatus(importFileId, status, downloadAttempts, processAttempts);

      // Assert
      expect(ImportFile.update).toHaveBeenCalledWith(expectedUpdateArg, {
        where: { id: importFileId },
        individualHooks: true,
        lock: true,
      });
    });

    it('should not include downloadAttempts or processAttempts in the update when they are null', async () => {
      // Arrange
      const expectedUpdateArg = {
        status,
      };

      // Act
      await setImportFileStatus(importFileId, status, null, null);

      // Assert
      expect(ImportFile.update).toHaveBeenCalledWith(expectedUpdateArg, {
        where: { id: importFileId },
        individualHooks: true,
        lock: true,
      });
    });

    it('should handle the case when the update fails', async () => {
      // Arrange
      const errorMessage = 'Update failed';
      ImportFile.update.mockRejectedValueOnce(new Error(errorMessage));

      // Act & Assert
      await expect(setImportFileStatus(importFileId, status)).rejects.toThrow(errorMessage);
    });
  });

  describe('setImportDataFileStatus', () => {
    // Define the function you are testing
    const setImportDataFileStatus = async (
      importDataFileId,
      status,
    ) => ImportDataFile.update(
      {
        status,
      },
      {
        where: { id: importDataFileId },
        individualHooks: true,
        lock: true,
      },
    );

    it('should call update with the correct parameters', async () => {
      const importFileId = 1;
      const newStatus = 'processed';

      // Call the function with test data
      await setImportDataFileStatus(importFileId, newStatus);

      // Check that ImportDataFile.update was called correctly
      expect(ImportDataFile.update).toHaveBeenCalledWith(
        { status: newStatus },
        { where: { id: importFileId }, individualHooks: true, lock: true },
      );
    });

    it('should resolve when the update is complete', async () => {
      const importFileId = 1;
      const newStatus = 'processed';
      const mockUpdatedImportDataFile = { id: importFileId, status: newStatus };

      // Mock the update method to return a promise that resolves
      ImportDataFile.update.mockResolvedValue([1, [mockUpdatedImportDataFile]]);

      // Call the function and expect it to resolve
      await expect(setImportDataFileStatus(importFileId, newStatus))
        .resolves.toEqual([1, [mockUpdatedImportDataFile]]);
    });
  });

  describe('setImportDataFileStatusByPath', () => {
    const mockImportFileId = 1;
    const mockFileInfo = { path: 'mock/path', name: 'mockFile.txt' };
    const mockStatus = 'processed';

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should update the status of the import data file if found', async () => {
      // Arrange
      const mockImportDataFile = { id: 2 };
      ImportDataFile.findOne.mockResolvedValue(mockImportDataFile);

      // Act
      const result = await setImportDataFileStatusByPath(
        mockImportFileId,
        mockFileInfo,
        mockStatus,
      );

      // Assert
      expect(ImportDataFile.findOne).toHaveBeenCalledWith({
        where: {
          importFileId: mockImportFileId,
          fileInfo: {
            [Op.contains]: {
              path: mockFileInfo.path,
              name: mockFileInfo.name,
            },
          },
        },
      });
      expect(ImportDataFile.update).toHaveBeenCalledWith(
        { status: mockStatus },
        { where: { id: mockImportDataFile.id }, individualHooks: true },
      );
    });

    it('should resolve to undefined if the import data file is not found', async () => {
      // Arrange
      ImportDataFile.findOne.mockResolvedValue(null);

      // Act
      const result = await setImportDataFileStatusByPath(
        mockImportFileId,
        mockFileInfo,
        mockStatus,
      );

      // Assert
      expect(ImportDataFile.findOne).toHaveBeenCalledWith({
        where: {
          importFileId: mockImportFileId,
          fileInfo: {
            [Op.contains]: {
              path: mockFileInfo.path,
              name: mockFileInfo.name,
            },
          },
        },
      });
      expect(ImportDataFile.update).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle errors thrown by the database operation during file search', async () => {
      // Arrange
      const errorMessage = 'Database error on findOne';
      ImportDataFile.findOne.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(setImportDataFileStatusByPath(mockImportFileId, mockFileInfo, mockStatus))
        .rejects
        .toThrow(errorMessage);
    });

    it('should handle errors thrown by the database operation during update', async () => {
      // Arrange
      const mockImportDataFile = { id: 2 };
      ImportDataFile.findOne.mockResolvedValue(mockImportDataFile);
      const errorMessage = 'Database error on update';
      ImportDataFile.update.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(setImportDataFileStatusByPath(mockImportFileId, mockFileInfo, mockStatus))
        .rejects
        .toThrow(errorMessage);
    });
  });

  describe('importSchedules', () => {
    it('should return a list of enabled schedules', async () => {
      // Arrange
      const expectedSchedules = [
        { id: 1, name: 'Schedule 1', schedule: '0 5 * * *' },
        { id: 2, name: 'Schedule 2', schedule: '0 10 * * *' },
      ];
      Import.findAll.mockResolvedValue(expectedSchedules);

      // Act
      const schedules = await importSchedules();

      // Assert
      expect(schedules).toEqual(expectedSchedules);
      expect(Import.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'name', 'schedule'],
        where: {
          enabled: true,
        },
        raw: true,
      });
    });

    it('should handle the case when no schedules are found', async () => {
      // Arrange
      Import.findAll.mockResolvedValue([]);

      // Act
      const schedules = await importSchedules();

      // Assert
      expect(schedules).toEqual([]);
      expect(Import.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'name', 'schedule'],
        where: {
          enabled: true,
        },
        raw: true,
      });
    });

    it('should handle errors thrown by the Import model', async () => {
      // Arrange
      const error = new Error('Database error');
      Import.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(importSchedules()).rejects.toThrow('Database error');
    });
  });
});
