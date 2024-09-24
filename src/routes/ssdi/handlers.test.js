import request from 'supertest';
import express from 'express';
import {
  validateScriptPath,
  checkFolderPermissions,
  filterAttributes,
  listQueryFiles,
  readFiltersFromFile,
  setFilters,
  sanitizeFilename,
  generateFilterString,
  executeQuery,
} from '../../services/ssdi';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { listQueries, getFilters, runQuery } from './handlers';
import Generic from '../../policies/generic';

jest.mock('../../../services/ssdi', () => ({
  listQueryFiles: jest.fn(),
  readFiltersFromFile: jest.fn(),
  setFilters: jest.fn(),
  sanitizeFilename: jest.fn(),
  generateFilterString: jest.fn(),
  executeQuery: jest.fn(),
  isFile: jest.fn(),
}));

jest.mock('../../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../../policies/generic');

const app = express();
app.use(express.json());
app.get('/listQueries', listQueries);
app.get('/getFilters', getFilters);
app.post('/runQuery', runQuery);

describe('API Endpoints', () => {
  describe('validateScriptPath', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn(),
        headersSent: false,
      };
    });

    it('should return true and send a 400 response if scriptPath is not provided', async () => {
      const user = {}; // Mock user object
      const result = await validateScriptPath('', user, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Script path is required');
      expect(result).toBe(true);
    });

    it('should return true and send a 400 response for path traversal attempts', async () => {
      const user = {}; // Mock user object
      const result = await validateScriptPath('../dataRequests/query.sql', user, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid script path: Path traversal detected' });
      expect(result).toBe(true);
    });

    it('should return true and send a 400 response if the scriptPath does not start with "dataRequests" or "api"', async () => {
      const user = {}; // Mock user object
      const result = await validateScriptPath('invalidPath/query.sql', user, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid script path: Must start with "dataRequests" or "api"' });
      expect(result).toBe(true);
    });

    it('should return true and send a 403 response if the user lacks folder permissions', async () => {
      const user = {}; // Mock user object
      checkFolderPermissions.mockResolvedValue(false); // Mock permission check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access forbidden: You do not have permission to run this query' });
      expect(result).toBe(true);
    });

    it('should return true and send a 400 response if the file does not exist', async () => {
      const user = {}; // Mock user object
      checkFolderPermissions.mockResolvedValue(true); // Mock permission check
      isFile.mockResolvedValue(false); // Mock file existence check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid script path: No file matches the path specified' });
      expect(result).toBe(true);
    });

    it('should return false and not send any response if all validations pass', async () => {
      const user = {}; // Mock user object
      checkFolderPermissions.mockResolvedValue(true); // Mock permission check
      isFile.mockResolvedValue(true); // Mock file existence check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes);

      expect(result).toBe(false);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should skip file existence check if skipFileCheck is true', async () => {
      const user = {}; // Mock user object
      checkFolderPermissions.mockResolvedValue(true); // Mock permission check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes, true);

      expect(result).toBe(false);
      expect(isFile).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });

  describe('filterAttributes', () => {
    it('should filter out specified attributes from an object', () => {
      const obj = {
        name: 'John Doe',
        age: 30,
        email: 'john.doe@example.com',
        city: 'New York',
      };

      const keysToRemove = ['email', 'city'];
      const result = filterAttributes(obj, keysToRemove);

      expect(result).toEqual({
        name: 'John Doe',
        age: 30,
      });
    });

    it('should return the same object if no keys are removed', () => {
      const obj = {
        name: 'Jane Doe',
        age: 25,
        email: 'jane.doe@example.com',
      };

      const keysToRemove = [];
      const result = filterAttributes(obj, keysToRemove);

      expect(result).toEqual(obj);
    });

    it('should return an empty object if all keys are removed', () => {
      const obj = {
        name: 'Alice',
        age: 28,
        email: 'alice@example.com',
      };

      const keysToRemove = ['name', 'age', 'email'];
      const result = filterAttributes(obj, keysToRemove);

      expect(result).toEqual({});
    });

    it('should return an empty object if given an empty object', () => {
      const obj = {};
      const keysToRemove = ['name', 'age'];
      const result = filterAttributes(obj, keysToRemove);

      expect(result).toEqual({});
    });

    it('should not fail if attempting to remove keys that are not in the object', () => {
      const obj = {
        name: 'Bob',
        age: 32,
      };

      const keysToRemove = ['email', 'city'];
      const result = filterAttributes(obj, keysToRemove);

      expect(result).toEqual({
        name: 'Bob',
        age: 32,
      });
    });
  });

  describe('listQueries', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should list all available query files', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);
      listQueryFiles.mockResolvedValue([{ name: 'Test Query', description: 'Test Description' }]);

      const response = await request(app).get('/listQueries');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ name: 'Test Query', description: 'Test Description' }]);
    });

    it('should handle errors when listing query files', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);
      listQueryFiles.mockImplementation(() => { throw new Error('Error listing query files'); });

      const response = await request(app).get('/listQueries');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error listing query files');
    });

    it('should return 500 when an unexpected error occurs', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);
      listQueryFiles.mockImplementation(() => { throw new Error('Unexpected Error'); });

      const response = await request(app).get('/listQueries');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Unexpected Error');
    });

    it('should return 400 if scriptPath is invalid', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(true); // Simulate early return due to invalid script path

      const response = await request(app).get('/listQueries?path=invalidPath');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Must start with "dataRequests" or "api"' });
    });

    it('should return early if validateScriptPath sends a response', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(true); // Simulate early return

      const response = await request(app).get('/listQueries?path=dataRequests');
      expect(validateScriptPath).toHaveBeenCalled();
      expect(response.status).toBe(400); // Assuming validateScriptPath causes a 400 response
    });

    it('should default scriptPath to "dataRequests" when not provided', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);
      listQueryFiles.mockResolvedValue([{ name: 'Default Query', description: 'Default Description' }]);

      const response = await request(app).get('/listQueries'); // No path provided
      expect(validateScriptPath).toHaveBeenCalledWith('dataRequests', expect.any(Object), expect.any(Object), true);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ name: 'Default Query', description: 'Default Description' }]);
    });

    it('should list all available query files', async () => {
      listQueryFiles.mockReturnValue([{ name: 'Test Query', description: 'Test Description' }]);

      const response = await request(app).get('/listQueries');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ name: 'Test Query', description: 'Test Description' }]);
    });

    it('should handle errors', async () => {
      listQueryFiles.mockImplementation(() => { throw new Error('Error listing query files'); });

      const response = await request(app).get('/listQueries');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error listing query files');
    });

    it('should return 500 when an unexpected error occurs', async () => {
      listQueryFiles.mockImplementation(() => { throw new Error('Unexpected Error'); });

      const response = await request(app).get('/listQueries');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Unexpected Error');
    });
  });

  describe('getFilters', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get filters with options when the options query param is set to true', async () => {
      readFiltersFromFile.mockReturnValue({ filters: { filter1: { type: 'integer[]', description: 'Test Filter with options' } } });
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path', options: 'true' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ filter1: { type: 'integer[]', description: 'Test Filter with options' } });
      expect(readFiltersFromFile).toHaveBeenCalledWith('./dataRequests/test/path', 1, true);
    });

    it('should default options query param to false if not provided', async () => {
      readFiltersFromFile.mockReturnValue({ filters: { filter1: { type: 'integer[]', description: 'Test Filter' } } });
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ filter1: { type: 'integer[]', description: 'Test Filter' } });
      expect(readFiltersFromFile).toHaveBeenCalledWith('./dataRequests/test/path', 1, false);
    });

    it('should return early if validateScriptPath sends a response', async () => {
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(true); // Simulate early return

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' });

      expect(validateScriptPath).toHaveBeenCalledWith('dataRequests/test/path', { id: 1, name: 'John Doe' }, expect.any(Object));
      expect(response.status).toBe(400); // Assuming validateScriptPath triggers a 400 response
    });

    it('should return 500 if an unexpected error occurs when reading filters', async () => {
      readFiltersFromFile.mockImplementation(() => { throw new Error('Unexpected Error'); });
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1, name: 'John Doe' });
      validateScriptPath.mockResolvedValue(false);

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error reading filters');
    });
    it('should get filters from the script', async () => {
      readFiltersFromFile.mockReturnValue({ filters: { filter1: { type: 'integer[]', description: 'Test Filter' } } });

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ filter1: { type: 'integer[]', description: 'Test Filter' } });
    });

    it('should return 400 if script path is not provided', async () => {
      const response = await request(app).get('/getFilters');
      expect(response.status).toBe(400);
      expect(response.text).toBe('Script path is required');
    });

    it('should return 400 for path traversal attempts', async () => {
      const response = await request(app).get('/getFilters').query({ path: '../outside/path' });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' });
    });

    it('should return 400 for a script path with invalid characters', async () => {
      const response = await request(app)
        .get('/getFilters')
        .query({ path: 'invalid/../../path' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' });
    });

    it('should return 400 if script path is not within allowed directory', async () => {
      const response = await request(app)
        .get('/getFilters')
        .query({ path: 'some/other/path' });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Must start with "dataRequests" or "api"' });
    });

    it('should handle errors', async () => {
      readFiltersFromFile.mockImplementation(() => { throw new Error('Error reading filters'); });

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' });
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error reading filters');
    });
  });

  describe('runQuery', () => {
    const user = {
      id: 1,
      permissions: [
        { scopeId: 1, regionId: 1 },
        { scopeId: 2, regionId: 2 },
        { scopeId: 3, regionId: 3 },
      ],
    };

    beforeEach(() => {
      readFiltersFromFile.mockReturnValue({
        filters: { recipientIds: { type: 'integer[]', description: 'Test Filter' } },
        query: 'SELECT * FROM test',
        defaultOutputName: 'test_output',
      });
      setFilters.mockResolvedValue([]);
      executeQuery.mockResolvedValue([{ id: 1, name: 'Test' }]);
      sanitizeFilename.mockReturnValue('test_output_recipientIds_1-2-3');
      generateFilterString.mockReturnValue('recipientIds_1-2-3');
      currentUserId.mockResolvedValue(user.id);
      userById.mockResolvedValue(user);
      Generic.mockImplementation(() => ({
        filterRegions: jest.fn((ids) => ids.filter((id) => id <= 3)),
        getAllAccessibleRegions: jest.fn(() => [1, 2, 3]),
      }));
    });

    it('should run the query and return JSON result', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ recipientIds: [1, 2, 3, 4] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should run the query and return CSV result', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path', format: 'csv' })
        .send({ recipientIds: [1, 2, 3, 4] });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="test_output_recipientIds_1-2-3.csv"');
    });

    it('should return 400 if script path is not provided', async () => {
      const response = await request(app)
        .post('/runQuery')
        .send({ recipientIds: [1, 2, 3] });
      expect(response.status).toBe(400);
      expect(response.text).toBe('Script path is required');
    });

    it('should return 400 for path traversal attempts', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: '../outside/path' })
        .send({ recipientIds: [1, 2, 3] });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' });
    });

    it('should return 400 if script path is not within allowed directory', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'some/other/path' })
        .send({ recipientIds: [1, 2, 3] });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Must start with "dataRequests" or "api"' });
    });

    it('should return 400 if recipientIds are missing', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({}); // No recipientIds sent

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid recipientIds: recipientIds are required');
    });

    it('should return 400 if recipientIds are not an array of integers', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ recipientIds: 'invalidType' }); // Invalid data type

      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid recipientIds: must be an array of integers');
    });

    it('should return 401 if regionIds is an empty set', async () => {
      Generic.mockImplementation(() => ({
        filterRegions: jest.fn(() => []),
        getAllAccessibleRegions: jest.fn(() => []),
      }));

      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 401 if no accessible regions are found', async () => {
      Generic.mockImplementation(() => ({
        filterRegions: jest.fn(() => []),
        getAllAccessibleRegions: jest.fn(() => []),
      }));

      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ recipientIds: [1, 2, 3] });

      expect(response.status).toBe(401);
    });

    it('should handle errors', async () => {
      readFiltersFromFile.mockImplementation(() => { throw new Error('Error reading query'); });

      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ recipientIds: [1, 2, 3] });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error executing query: Error reading query');
    });

    it('should filter out non-integer regionIds', async () => {
      const filterRegionsMock = jest.fn((val) => val);
      Generic.mockImplementation(() => ({
        filterRegions: filterRegionsMock,
        getAllAccessibleRegions: jest.fn(() => [1, 2, 3]),
      }));
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ regionIds: [1, 'a', 2, 'b', 3] });

      expect(response.status).toBe(200);
      expect(filterRegionsMock).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should filter regionIds using policy', async () => {
      const filterRegionsMock = jest.fn((val) => val);
      Generic.mockImplementation(() => ({
        filterRegions: filterRegionsMock,
        getAllAccessibleRegions: jest.fn(() => []),
      }));
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ regionIds: [1, 2, 3, 4] });

      expect(response.status).toBe(200);
      expect(filterRegionsMock).toHaveBeenCalledWith([1, 2, 3, 4]);
      expect(response.body).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should return CSV response with sanitized file name', async () => {
      sanitizeFilename.mockReturnValue('test_output_sanitized.csv');

      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path', format: 'csv' })
        .send({ recipientIds: [1, 2, 3] });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="test_output_sanitized.csv"');
    });
  });
});
