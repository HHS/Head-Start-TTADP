import fs from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db from '../models';
import {
  cache,
  sanitizeFilename,
  checkFolderPermissions,
  isFile,
  safeResolvePath,
  isValidJsonHeader,
  readJsonHeaderFromFile,
  createQueryFile,
  checkDirectoryExists,
  listQueryFiles,
  applyFilterOptions,
  generateConditions,
  processFilters,
  generateArtificialFilters,
  readFiltersFromFile,
  readFilesRecursively,
  validateType,
  preprocessAndValidateFilters,
  setFilters,
  generateFilterString,
  executeQuery,
} from './ssdi';
import UserPolicy from '../policies/user';

// Mock fs and db
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
    constants: { R_OK: 1 },
  },
}));
jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT', RAW: 'RAW' },
  },
}));

describe('ssdi', () => {
  // Clear the caches before each test
  beforeEach(() => {
    cache.clear();
    jest.clearAllMocks();
  });

  describe('sanitizeFilename', () => {
    it('should sanitize the filename', () => {
      expect(sanitizeFilename('test@file#name!')).toBe('test_file_name_');
    });
  });

  describe('checkFolderPermissions', () => {
    it('should check folder permissions using the Generic policy class', async () => {
      const mockUser = jest.fn().mockImplementation(() => ({
        checkPermissions: jest.fn().mockResolvedValue(true),
      }));
      jest.mock('../policies/user', () => mockUser);

      const user = { id: 1 };
      const result = await checkFolderPermissions(user, 'test/path');
      expect(result).toBe(true);
    });
  });

  describe('safeResolvePath', () => {
    it('should resolve the path safely within BASE_DIRECTORY', () => {
      const result = safeResolvePath('test/path.sql');
      expect(result.endsWith('/app/src/queries/test/path.sql')).toBe(true);
    });

    it('should throw an error if the resolved path is outside BASE_DIRECTORY', () => {
      expect(() => safeResolvePath('../../outside/path.sql')).toThrow(
        'Attempted to access a file outside the allowed directory.',
      );
    });
  });

  describe('isFile', () => {
    it('should return true for a valid file', async () => {
      const mockStat = { isFile: jest.fn().mockReturnValue(true) };
      fs.promises.stat.mockResolvedValue(mockStat);

      const result = await isFile('valid/path');
      expect(result).toBe(true);
    });

    it('should return false for a non-file path', async () => {
      const mockStat = { isFile: jest.fn().mockReturnValue(false) };
      fs.promises.stat.mockResolvedValue(mockStat);

      const result = await isFile('invalid/path');
      expect(result).toBe(false);
    });

    it('should return false if stat throws an error', async () => {
      fs.promises.stat.mockRejectedValue(new Error('File not found'));

      const result = await isFile('invalid/path');
      expect(result).toBe(false);
    });
  });

  describe('isValidJsonHeader', () => {
    it('should return true for a valid JSON header', () => {
      const validJson = {
        name: 'Test',
        description: { standard: 'desc', technical: 'tech desc' },
        output: { defaultName: 'output', schema: [] },
        filters: [],
      };
      expect(isValidJsonHeader(validJson)).toBe(true);
    });

    it('should return false for invalid JSON header', () => {
      const invalidJson = { invalidKey: 'invalid' };
      expect(isValidJsonHeader(invalidJson)).toBe(false);
    });
  });

  describe('readJsonHeaderFromFile', () => {
    it('should handle non-existent file', async () => {
      fs.promises.stat.mockRejectedValue(new Error('File not found'));
      await expect(readJsonHeaderFromFile('invalid/path.sql')).rejects.toThrow('File not found');
    });

    it('should parse JSON header correctly from a valid file', async () => {
      const mockFileContent = `
      /*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string[]",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
     SELECT * FROM test;`;
      fs.promises.readFile.mockResolvedValue(mockFileContent);
      fs.promises.stat.mockResolvedValue({ mtime: new Date() });

      const result = await readJsonHeaderFromFile('test/path.sql');
      expect(result.jsonHeader.name).toBe('Sample Header');
    });

    it('should return cached file if modification time is unchanged', async () => {
      const mockFileContent = `
      /*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string[]",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
     SELECT * FROM test;`;
      const mockFile = {
        jsonHeader: {
          name: 'Sample Header',
          description: {
            standard: 'A standard description',
            technical: 'A technical description',
          },
          output: {
            defaultName: 'Sample Output',
            schema: [
              {
                columnName: 'sample_column',
                type: 'string',
                nullable: true,
                description: 'A sample column description',
              },
            ],
          },
          filters: [
            {
              name: 'sampleFilter',
              type: 'string[]',
              display: 'Sample Filter',
              description: 'This is a sample filter',
            },
          ],
        },
        query: 'SELECT * FROM test;',
        modificationTime: new Date(),
      };
      const mockPath = 'test/path.sql';
      cache.set(mockPath, mockFile);

      fs.promises.readFile.mockResolvedValue(mockFileContent);
      const mockStat = { mtime: mockFile.modificationTime };
      fs.promises.stat.mockResolvedValue(mockStat);

      const result = await readJsonHeaderFromFile(mockPath);
      expect(result).toEqual(mockFile);
    });

    it('should read and cache a new file if modification time has changed', async () => {
      const mockFileContent = `/*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string[]",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
     SELECT * FROM test;`;
      const mockStat = { mtime: new Date() };

      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue(mockFileContent);

      const result = await readJsonHeaderFromFile('test/path.sql');
      expect(result).toEqual({
        jsonHeader: {
          name: 'Sample Header',
          description: {
            standard: 'A standard description',
            technical: 'A technical description',
          },
          output: {
            defaultName: 'Sample Output',
            schema: [
              {
                columnName: 'sample_column',
                type: 'string',
                nullable: true,
                description: 'A sample column description',
              },
            ],
          },
          filters: [
            {
              name: 'sampleFilter',
              type: 'string[]',
              display: 'Sample Filter',
              description: 'This is a sample filter',
            },
          ],
        },
        query: 'SELECT * FROM test;',
        modificationTime: mockStat.mtime,
      });
    });

    it('should handle JSON parsing errors gracefully', async () => {
      fs.promises.stat.mockResolvedValue({ mtime: new Date() });
      fs.promises.readFile.mockResolvedValue('INVALID JSON HEADER');

      await expect(await readJsonHeaderFromFile('test/path.sql')).toBe(null);
    });
  });

  describe('readFilesRecursively', () => {
    it('should recursively read files in a directory', async () => {
      fs.promises.readdir.mockResolvedValueOnce([
        { name: 'file1.sql', isDirectory: () => false },
        { name: 'subfolder', isDirectory: () => true },
      ]);

      const result = await readFilesRecursively('test/path');
      expect(result).toContain('test/path/file1.sql');
    });

    it('should recursively read files in the directory', async () => {
      fs.promises.readdir
        .mockResolvedValueOnce([
          { name: 'file1.sql', isDirectory: () => false },
          { name: 'subfolder', isDirectory: () => true },
        ])
        .mockResolvedValueOnce([
          { name: 'file2.sql', isDirectory: () => false },
        ]);

      const result = await readFilesRecursively('test/path');
      expect(result).toEqual(['test/path/file1.sql', 'test/path/subfolder/file2.sql']);
    });
  });

  describe('checkDirectoryExists', () => {
    it('should return true if the directory exists', async () => {
      fs.promises.stat.mockResolvedValue({ isDirectory: jest.fn().mockReturnValue(true) });
      fs.promises.access.mockReturnValue(true);
      const result = await checkDirectoryExists('test/path');
      expect(result).toBe(true);
    });

    it('should return false if the directory does not have permission', async () => {
      fs.promises.stat.mockRejectedValue({ isDirectory: jest.fn().mockReturnValue(true) });
      fs.promises.access.mockReturnValue(new Error('No access'));
      const result = await checkDirectoryExists('test/path');
      expect(result).toBe(false);
    });

    it('should return false if the directory does not exist', async () => {
      fs.promises.stat.mockRejectedValue(new Error('Directory not found'));
      fs.promises.access.mockReturnValue();
      const result = await checkDirectoryExists('test/path');
      expect(result).toBe(false);
    });
  });

  describe('listQueryFiles', () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      permissions: ['dataRequests/ohs', 'dataRequests/internal'],
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should return a list of SQL files when the user has permission', async () => {
      // Mock the file system and permissions
      fs.promises.readdir.mockResolvedValue([
        { name: 'file1.sql', isDirectory: () => false },
        { name: 'file2.sql', isDirectory: () => false },
      ]);
      fs.promises.stat.mockImplementation((filePath) => (!filePath.endsWith('sql')
        ? { isDirectory: () => true, isFile: () => false }
        : { isFile: () => true }));
      fs.promises.access.mockResolvedValue(true);
      fs.promises.readFile.mockResolvedValue(`
      /*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
     SELECT * FROM test;`);

      // Mock the permission check to always return true
      const checkFolderPermissionsMock = jest
        .spyOn(UserPolicy.prototype, 'checkPermissions')
        .mockResolvedValue(true);

      const result = await listQueryFiles('api', mockUser);

      // Assert the result is as expected
      expect(result).toEqual([
        expect.objectContaining({ filePath: expect.stringContaining('file1.sql') }),
        expect.objectContaining({ filePath: expect.stringContaining('file2.sql') }),
      ]);

      // Assert that permissions were checked
      expect(checkFolderPermissionsMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('file1.sql'), // Check if the path contains 'file1.sql'
        ['dataRequests/ohs', 'dataRequests/internal'], // Exact array for permissions
        'ssdi_restricted', // The restriction string
      );

      expect(checkFolderPermissionsMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('file2.sql'), // Check if the path contains 'file2.sql'
        ['dataRequests/ohs', 'dataRequests/internal'], // Exact array for permissions
        'ssdi_restricted', // The restriction string
      );
    });

    it('should only return SQL files when user has permission and ignore non-SQL files', async () => {
      // Mock the file system and permissions
      fs.promises.readdir.mockResolvedValue([
        { name: 'file1.sql', isDirectory: () => false },
        { name: 'file2.text', isDirectory: () => false },
      ]);
      fs.promises.stat.mockImplementation((filePath) => (!filePath.endsWith('sql')
        ? { isDirectory: () => true, isFile: () => false }
        : { isFile: () => true }));
      fs.promises.access.mockResolvedValue(true);
      fs.promises.readFile.mockResolvedValue(`
      /*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
     SELECT * FROM test;`);

      // Mock the permission check to always return true
      const checkFolderPermissionsMock = jest
        .spyOn(UserPolicy.prototype, 'checkPermissions')
        .mockResolvedValue(true);

      const result = await listQueryFiles('test/path', mockUser);

      // Assert that only SQL files are returned
      expect(result).toEqual([
        expect.objectContaining({ filePath: expect.stringContaining('file1.sql') }),
      ]);

      // Assert that permissions were checked
      expect(checkFolderPermissionsMock).toHaveBeenCalled();
    });

    it('should skip files if the user does not have permission', async () => {
      // Mock the file system and permissions
      fs.promises.readdir.mockResolvedValue([
        { name: 'file1.sql', isDirectory: () => false },
        { name: 'file2.sql', isDirectory: () => false },
      ]);
      fs.promises.stat.mockImplementation((filePath) => (!filePath.endsWith('sql')
        ? { isDirectory: () => true, isFile: () => false }
        : { isFile: () => true }));
      fs.promises.access.mockResolvedValue(true);
      fs.promises.readFile.mockResolvedValue(`
      /*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
     SELECT * FROM test;`);

      // Mock the permission check to return false for one file
      const checkFolderPermissionsMock = jest
        .spyOn(UserPolicy.prototype, 'checkPermissions')
        .mockImplementation((
          targetString,
          _matchStrings,
          _featureFlag,
        ) => targetString.includes('file1.sql'));

      const result = await listQueryFiles('test/path', mockUser);

      // Assert that only the file with permission is returned
      expect(result).toEqual([
        expect.objectContaining({ filePath: expect.stringContaining('file1.sql') }),
      ]);

      // Assert that permissions were checked
      expect(checkFolderPermissionsMock).toHaveBeenCalled();
    });
  });

  describe('createQueryFile', () => {
    it('should create a query file object from a cached file', () => {
      const cachedFile = {
        jsonHeader: {
          name: 'test',
          description: { standard: 'desc', technical: 'tech desc' },
          output: { defaultName: 'output' },
        },
        query: 'SELECT * FROM test;',
        modificationTime: new Date(),
      };
      const result = createQueryFile('test/path.sql', cachedFile);
      expect(result).toEqual({
        name: 'test',
        description: 'desc',
        technicalDescription: 'tech desc',
        filePath: 'test/path.sql',
        defaultOutputName: 'output',
      });
    });
  });

  describe('applyFilterOptions', () => {
    it('should return static values if defined', async () => {
      const filter = { options: { staticValues: [1, 2, 3] } };
      const result = await applyFilterOptions(filter);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return query results if a SQL query is defined', async () => {
      db.sequelize.query.mockResolvedValue([{ col1: 'value1' }]);
      const filter = { options: { query: { sqlQuery: 'SELECT *', column: 'col1' } } };

      const result = await applyFilterOptions(filter);
      expect(result).toEqual(['value1']);
    });

    it('should return query results for defined SQL query', async () => {
      db.sequelize.query.mockResolvedValue([{ col1: 'value1' }]);
      const filter = { options: { query: { sqlQuery: 'SELECT * FROM test', column: 'col1' } } };

      const result = await applyFilterOptions(filter);
      expect(result).toEqual(['value1']);
    });
  });

  describe('generateConditions', () => {
    it('should generate correct conditions for string[] type', () => {
      const filter = { type: 'string[]', supportsFuzzyMatch: true, supportsExclusion: true };
      const result = generateConditions(filter);
      expect(result).toEqual(['ctn', 'nctn']);
    });

    it('should generate correct conditions for date[] type', () => {
      const filter = { type: 'date[]', supportsExclusion: true };
      const result = generateConditions(filter);
      expect(result).toEqual(['aft', 'win', 'in', 'bef']);
    });
  });

  describe('processFilters', () => {
    it('should process filters and return the correct structure', async () => {
      const cachedFile = {
        jsonHeader: {
          filters: [{ name: 'testFilter', type: 'string[]', description: 'Test filter' }],
        },
      };
      const result = await processFilters(cachedFile, false);
      expect(result).toEqual({
        testFilter: {
          id: 'testFilter',
          type: 'string[]',
          description: 'Test filter',
          conditions: ['in'],
        },
      });
    });
  });

  describe('generateArtificialFilters', () => {
    it('should generate artificial filters for sorting and pagination', () => {
      const cachedFile = {
        jsonHeader: {
          output: {
            schema: [{ columnName: 'col1' }],
            sorting: { default: [{ name: 'col1', order: 'ASC' }] },
            supportsPagination: true,
          },
        },
      };
      const result = generateArtificialFilters(cachedFile, 1);
      expect(result).toEqual({
        currentUserId: {
          id: 'currentUserId',
          type: 'integer[]',
          description: 'A static filter to allow restriction to the current user.',
          options: [1],
          defaultValues: [1],
        },
        'sortOrder.column': {
          id: 'sortOrder.column',
          type: 'string[]',
          description: 'The column to sort by',
          options: ['col1'],
          defaultValues: ['col1'],
        },
        'sortOrder.direction': {
          id: 'sortOrder.direction',
          type: 'string[]',
          description: 'The direction to sort (ASC or DESC)',
          options: ['ASC', 'DESC'],
          defaultValues: ['ASC'],
        },
        'pagination.page': {
          id: 'pagination.page',
          type: 'integer[]',
          description: 'The page number to retrieve',
          defaultValues: [0],
        },
        'pagination.size': {
          id: 'pagination.size',
          type: 'integer[]',
          description: 'The number of records to retrieve per page',
          defaultValues: [2147483647],
        },
      });
    });
  });

  describe('readFiltersFromFile', () => {
    it('should read and process filters from a file', async () => {
      // Mock the file system and permissions
      fs.promises.readdir.mockResolvedValue([
        { name: 'file1.sql', isDirectory: () => false },
      ]);
      fs.promises.stat.mockResolvedValue({ isFile: () => true, mtime: new Date() });
      fs.promises.access.mockResolvedValue(true);
      fs.promises.readFile.mockResolvedValue(`
      /*
      JSON: {
        "name": "Sample Header",
        "description": {
          "standard": "A standard description",
          "technical": "A technical description"
        },
        "output": {
          "defaultName": "Sample Output",
          "schema": [
            {
              "columnName": "sample_column",
              "type": "string",
              "nullable": true,
              "description": "A sample column description"
            }
          ]
        },
        "filters": [
          {
            "name": "sampleFilter",
            "type": "string[]",
            "display": "Sample Filter",
            "description": "This is a sample filter"
          }
        ]
      }
      */
    SELECT * FROM test;`);

      // Mock the permission check to always return true
      const checkFolderPermissionsMock = jest
        .spyOn(UserPolicy.prototype, 'checkPermissions')
        .mockResolvedValue(true);

      const result = await readFiltersFromFile('file1.sql', 1);
      expect(result).toEqual({
        sampleFilter: {
          id: 'sampleFilter',
          type: 'string[]',
          description: 'This is a sample filter',
          display: 'Sample Filter',
          conditions: ['in'],
        },
        currentUserId: {
          id: 'currentUserId',
          type: 'integer[]',
          description: 'A static filter to allow restriction to the current user.',
          options: [1],
          defaultValues: [1],
        },
      });
    });
  });

  describe('validateType', () => {
    it('should validate integer[] type', () => {
      expect(validateType('integer[]', [1, 2, 3])).toBe(true);
      expect(validateType('integer[]', [1, '2', 3])).toBe(true);
    });

    it('should validate date[] type', () => {
      expect(validateType('date[]', ['2021-01-01', '2021-02-01'])).toBe(true);
      expect(validateType('date[]', ['2021-01-01', 'invalid-date'])).toBe(false);
    });

    it('should validate string[] type', () => {
      expect(validateType('string[]', ['hello', 'world'])).toBe(true);
      expect(validateType('string[]', ['hello', 123])).toBe(false);
    });

    it('should validate boolean[] type', () => {
      expect(validateType('boolean[]', [true, false])).toBe(true);
      expect(validateType('boolean[]', [true, 'false'])).toBe(false);
    });

    it('should throw an error for unknown type', () => {
      expect(validateType('unknown[]', ['test'])).toBe(false);
    });
  });

  describe('preprocessAndValidateFilters', () => {
    const filters = {
      flag1: { type: 'integer[]', name: 'flag1', description: 'Flag description' },
      dateFlag: { type: 'date[]', name: 'dateFlag', description: 'Date array flag' },
      stringFlag: { type: 'string[]', name: 'stringFlag', description: 'String flag' },
    };

    it('should preprocess and validate filters correctly', () => {
      const input = { flag1: [1, 2, 3] };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ flag1: [1, 2, 3] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should return errors for invalid filters and types', () => {
      const input = { flag1: [1, 'two', 3], invalidFlag: [1, 2, 3] };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(errors.invalidFilters).toEqual(['Invalid filter: invalidFlag']);
      expect(errors.invalidTypes).toEqual(['Invalid type for filter flag1: expected integer[] received 1,two,3']);
    });

    it('should preprocess date array filters with separator correctly', () => {
      const input = { 'dateFlag.in': ['2023/01/01', '2023/02/01-2023/03/01'] };
      const { result, errors } = preprocessAndValidateFilters(filters, input);

      expect(result).toEqual({ dateFlag: ['2023/01/01', '2023/02/01', '2023/03/01'] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should handle non-array date flag input and split it with a dash', () => {
      const input = { 'dateFlag.in': '2023/01/01-2023/02/01' };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ dateFlag: ['2023/01/01', '2023/02/01'] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should split string values with comma for .in suffix', () => {
      const input = { 'stringFlag.in': 'value1,value2,value3' };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ stringFlag: ['value1', 'value2', 'value3'] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should return default values for missing filters', () => {
      const filtersWithDefaults = {
        flag1: {
          type: 'integer[]',
          name: 'flag1',
          description: 'Flag description',
          defaultValues: [1, 2, 3],
        },
      };
      const input = {};
      const { result, errors } = preprocessAndValidateFilters(filtersWithDefaults, input);
      expect(result).toEqual({ flag1: [1, 2, 3] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should handle filters with .nin suffix and split them by comma', () => {
      const input = { 'flag1.nin': '1,2,3' };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ 'flag1.not': [1, 2, 3] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should handle array input with .in suffix correctly', () => {
      const input = { 'flag1.in': [1, 2, '3,4'] };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ flag1: [1, 2, 3, 4] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should add empty array as value if an invalid type is received', () => {
      const input = { flag1: 'not an array' };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ flag1: ['not an array'] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(1);
    });

    it('should correctly handle cases where a filter is missing but has a default value', () => {
      const filtersWithDefaults = {
        flag2: {
          type: 'string',
          name: 'flag2',
          description: 'Flag 2 description',
          defaultValues: ['default'],
        },
      };
      const input = {};
      const { result, errors } = preprocessAndValidateFilters(filtersWithDefaults, input);
      expect(result).toEqual({ flag2: ['default'] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });
  });

  describe('setFilters', () => {
    it('should set filters in the database', async () => {
      const filterValues = { flag1: [1, 2, 3] };
      db.sequelize.query.mockResolvedValue([{ success: true }]);

      const result = await setFilters(filterValues);
      expect(result).toEqual([[{ success: true }]]);
      expect(db.sequelize.query).toHaveBeenCalledWith('SELECT set_config($1, $2, false)', {
        bind: ['ssdi.flag1', JSON.stringify([1, 2, 3])],
        type: db.sequelize.QueryTypes.SELECT,
      });
    });
  });

  describe('generateFilterString', () => {
    it('should generate a string representation of the filter values', () => {
      const filterValues = { flag1: [1, 2, 3], flag2: 'value' };
      expect(generateFilterString(filterValues)).toBe('flag1_1-2-3_flag2_value');
    });
  });

  describe('executeQuery', () => {
    const mockQuery = jest.fn();
    let pathResolveSpy;
    let fsReadFileSpy;
    let fsStatSpy;

    beforeEach(() => {
      jest.clearAllMocks();
      db.sequelize.query = mockQuery;
      cache.clear();
    });

    afterEach(() => {
      // Restore the original implementations after each test
      if (pathResolveSpy) pathResolveSpy.mockRestore();
      if (fsReadFileSpy) fsReadFileSpy.mockRestore();
      if (fsStatSpy) fsStatSpy.mockRestore();
    });

    it('should throw an error if the file path is not a string', async () => {
      await expect(executeQuery(123)).rejects.toThrow(
        'The "paths[1]" argument must be of type string. Received type number (123)',
      );
    });

    it('should resolve the file path correctly using safeResolvePath', async () => {
      const mockResolvedPath = '/app/src/queries/resolved/path/to/test.sql';
      // Spy on path.resolve to mock it only for this test
      pathResolveSpy = jest.spyOn(path, 'resolve').mockReturnValue(mockResolvedPath);

      const mockStat = { mtime: new Date() };
      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue('/* JSON: { "name": "test", "filters": [] } */\nSELECT * FROM test;');

      await executeQuery('test.sql');

      expect(path.resolve).toHaveBeenCalledWith(expect.anything(), 'test.sql');
      const cachedFile = cache.get(mockResolvedPath);
      expect(cachedFile).toBeDefined();
      expect(cachedFile?.query).toEqual('SELECT * FROM test;');
    });

    it('should cache the query after reading the file', async () => {
      const mockResolvedPath = '/app/src/queries/resolved/path/to/test.sql';
      pathResolveSpy = jest.spyOn(path, 'resolve').mockReturnValue(mockResolvedPath);

      const mockStat = { mtime: new Date() };
      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue('/* JSON: { "name": "test", "filters": [] } */\nSELECT * FROM test;');

      await executeQuery('test.sql');

      expect(cache.has(mockResolvedPath)).toBe(true);
      expect(cache.get(mockResolvedPath)?.query).toEqual('SELECT * FROM test;');
    });

    it('should throw an error if the JSON header cannot be read from the file', async () => {
      const mockResolvedPath = '/app/src/queries/resolved/path/to/invalid.sql';
      pathResolveSpy = jest.spyOn(path, 'resolve').mockReturnValue(mockResolvedPath);

      const mockStat = { mtime: new Date() };
      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue('INVALID CONTENT');

      await expect(executeQuery('invalid.sql')).rejects.toThrow(
        `Unable to read and parse the JSON header from file: ${mockResolvedPath}`,
      );
    });

    it('should execute the query and return the result', async () => {
      const mockResolvedPath = '/app/src/queries/resolved/path/to/valid.sql';
      pathResolveSpy = jest.spyOn(path, 'resolve').mockReturnValue(mockResolvedPath);

      const mockStat = { mtime: new Date() };
      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue('/* JSON: { "name": "test", "filters": [] } */\nSELECT * FROM test;');
      mockQuery.mockResolvedValue([{ id: 1, name: 'Test' }]);

      const result = await executeQuery('valid.sql');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test;', { type: QueryTypes.SELECT });
      expect(result).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should throw an error if the query execution fails', async () => {
      const mockResolvedPath = '/app/src/queries/resolved/path/to/valid.sql';
      pathResolveSpy = jest.spyOn(path, 'resolve').mockReturnValue(mockResolvedPath);

      const mockStat = { mtime: new Date() };
      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue('/* JSON: { "name": "test", "filters": [] } */\nSELECT * FROM test;');
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(executeQuery('valid.sql')).rejects.toThrow('Query failed: Database error');
    });

    it('should use the cached result if the file has been cached', async () => {
      const mockResolvedPath = '/app/src/queries/resolved/path/to/cached.sql';
      pathResolveSpy = jest.spyOn(path, 'resolve').mockReturnValue(mockResolvedPath);

      cache.set(mockResolvedPath, {
        jsonHeader: { name: 'test', filters: [] },
        query: 'SELECT * FROM cached;',
        modificationTime: new Date(),
      });
      mockQuery.mockResolvedValue([{ id: 2, name: 'Cached' }]);

      const result = await executeQuery('cached.sql');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM cached;', { type: QueryTypes.SELECT });
      expect(result).toEqual([{ id: 2, name: 'Cached' }]);
    });
  });
});
