import request from 'supertest';
import express from 'express';
import {
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
  describe('listQueries', () => {
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
  });

  describe('getFilters', () => {
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

    it('should return 400 if script path is not within allowed directory', async () => {
      const response = await request(app).get('/getFilters').query({ path: 'some/other/path' });
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
      const response = await request(app).post('/runQuery').send({ recipientIds: [1, 2, 3] });
      expect(response.status).toBe(400);
      expect(response.text).toBe('Script path is required');
    });

    it('should return 400 for path traversal attempts', async () => {
      const response = await request(app).post('/runQuery').query({ path: '../outside/path' }).send({ recipientIds: [1, 2, 3] });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' });
    });

    it('should return 400 if script path is not within allowed directory', async () => {
      const response = await request(app).post('/runQuery').query({ path: 'some/other/path' }).send({ recipientIds: [1, 2, 3] });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid script path: Must start with "dataRequests" or "api"' });
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
        getAllAccessibleRegions: jest.fn(() => []),
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
  });
});
