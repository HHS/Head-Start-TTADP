import fs from 'fs';
import path from 'path';
import db from '../models';
import {
  cache,
  sanitizeFilename,
  checkFolderPermissions,
  safeResolvePath,
  isValidJsonHeader,
  readJsonHeaderFromFile,
  createQueryFile,
  listQueryFiles,
  applyFilterOptions,
  generateConditions,
  processFilters,
  generateArtificialFilters,
  readFiltersFromFile,
  validateType,
  preprocessAndValidateFilters,
  setFilters,
  generateFilterString,
  executeQuery,
} from './ssdi';

// Mock fs and db
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
  },
}));
jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT', RAW: 'RAW' },
  },
}));

// Clear the caches before each test
beforeEach(() => {
  cache.clear();
  jest.clearAllMocks();
});

describe('ssdi', () => {
  describe('sanitizeFilename', () => {
    it('should sanitize the filename', () => {
      expect(sanitizeFilename('test@file#name!')).toBe('test_file_name_');
    });
  });

  describe('checkFolderPermissions', () => {
    it('should check folder permissions using the Generic policy class', async () => {
      const mockGeneric = jest.fn().mockImplementation(() => ({
        checkPermissions: jest.fn().mockResolvedValue(true),
      }));
      jest.mock('../policies/generic', () => mockGeneric);

      const user = { id: 1 };
      const result = await checkFolderPermissions(user, 'test/path');
      expect(result).toBe(true);
    });
  });

  describe('safeResolvePath', () => {
    it('should resolve the path safely within BASE_DIRECTORY', () => {
      const result = safeResolvePath('test/path.sql');
      expect(result).toBe(path.resolve(process.cwd(), '/src/queries/test/path.sql'));
    });

    it('should throw an error if the resolved path is outside BASE_DIRECTORY', () => {
      expect(() => safeResolvePath('../../outside/path.sql')).toThrow(
        'Attempted to access a file outside the allowed directory.',
      );
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

    it('should return false and log error for invalid JSON header', () => {
      const invalidJson = { invalidKey: 'invalid' };
      const mockLogger = jest.spyOn(console, 'error').mockImplementation();
      expect(isValidJsonHeader(invalidJson)).toBe(false);
      expect(mockLogger).toHaveBeenCalled();
    });
  });

  describe('readJsonHeaderFromFile', () => {
    it('should return cached file if modification time is unchanged', async () => {
      const mockFile = {
        jsonHeader: {},
        query: 'SELECT * FROM test',
        modificationTime: new Date(),
      };
      const mockPath = 'test/path.sql';
      cache.set(mockPath, mockFile);

      const mockStat = { mtime: new Date() };
      fs.promises.stat.mockResolvedValue(mockStat);

      const result = await readJsonHeaderFromFile(mockPath);
      expect(result).toEqual(mockFile);
    });

    it('should read and cache a new file if modification time has changed', async () => {
      // eslint-disable-next-line typescript-eslint/quotes
      const mockFileContent = `JSON: { "name": "test" } */ SELECT * FROM test;`;
      const mockStat = { mtime: new Date() };

      fs.promises.stat.mockResolvedValue(mockStat);
      fs.promises.readFile.mockResolvedValue(mockFileContent);

      const result = await readJsonHeaderFromFile('test/path.sql');
      expect(result).toEqual({
        jsonHeader: { name: 'test' },
        query: 'SELECT * FROM test;',
        modificationTime: mockStat.mtime,
      });
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
      const mockFile = {
        jsonHeader: {
          filters: [{ name: 'testFilter', type: 'string[]', description: 'Test filter' }],
        },
        query: 'SELECT * FROM test',
      };
      cache.set('test/path.sql', mockFile);

      const result = await readFiltersFromFile('test/path.sql', 1);
      expect(result).toEqual({
        testFilter: {
          id: 'testFilter',
          type: 'string[]',
          description: 'Test filter',
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
      expect(validateType('integer[]', [1, '2', 3])).toBe(false);
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
      expect(() => validateType('unknown[]', ['test'])).toThrow('Unknown type: unknown[]');
    });
  });

  describe('preprocessAndValidateFilters', () => {
    const filters = {
      flag1: { type: 'integer[]', name: 'flag1', description: 'Flag description' },
    };

    it('should preprocess and validate filters correctly', () => {
      const input = { flag1: [1, 2, 3] };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(result).toEqual({ flag1: [1, 2, 3] });
      expect(errors.invalidFilters.length).toBe(0);
      expect(errors.invalidTypes.length).toBe(0);
    });

    it('should return errors for invalid filters and types', () => {
      const input = { flag1: [1, '2', 3], invalidFlag: [1, 2, 3] };
      const { result, errors } = preprocessAndValidateFilters(filters, input);
      expect(errors.invalidFilters).toEqual(['Invalid filter: invalidFlag']);
      expect(errors.invalidTypes).toEqual(['Invalid type for filter flag1: expected integer[]']);
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
    it('should throw an error if the query is not a string', async () => {
      await expect(executeQuery(123)).rejects.toThrow('The query must be a string');
    });

    it('should set the transaction to READ ONLY and execute the query', async () => {
      const mockQuery = 'SELECT * FROM users;';
      const mockResult = [{ id: 1, name: 'John Doe' }];
      db.sequelize.query
        .mockResolvedValueOnce([]) // for SET TRANSACTION READ ONLY
        .mockResolvedValueOnce(mockResult); // for the actual query

      const result = await executeQuery(mockQuery);
      expect(result).toEqual(mockResult);
      expect(db.sequelize.query).toHaveBeenCalledWith('SET TRANSACTION READ ONLY;', {
        type: db.sequelize.QueryTypes.RAW,
      });
      expect(db.sequelize.query).toHaveBeenCalledWith(mockQuery, {
        type: db.sequelize.QueryTypes.SELECT,
      });
    });
  });
});
