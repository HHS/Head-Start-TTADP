import request from 'supertest'
import express from 'express'
import {
  checkFolderPermissions,
  listQueryFiles,
  readFiltersFromFile,
  setFilters,
  preprocessAndValidateFilters,
  sanitizeFilename,
  generateFilterString,
  executeQuery,
  isFile,
} from '../../services/ssdi'
import { currentUserId } from '../../services/currentUser'
import { userById } from '../../services/users'
import {
  validateScriptPath,
  filterAttributes,
  listQueries,
  getFilters,
  runQuery,
  listQueriesWithWildcard,
  getFiltersWithWildcard,
  runQueryWithWildcard,
} from './handlers'
import User from '../../policies/user'

jest.mock('../../services/ssdi', () => ({
  checkFolderPermissions: jest.fn(),
  listQueryFiles: jest.fn(),
  readFiltersFromFile: jest.fn(),
  setFilters: jest.fn(),
  preprocessAndValidateFilters: jest.fn(),
  sanitizeFilename: jest.fn(),
  generateFilterString: jest.fn(),
  executeQuery: jest.fn(),
  isFile: jest.fn(),
}))

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}))

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}))

jest.mock('../../policies/user')

const app = express()
app.use(express.json())
app.get('/listQueries', listQueries)
app.get('/getFilters', getFilters)
app.post('/runQuery', runQuery)
app.get('/*/list', listQueriesWithWildcard)
app.get('/*/filters', getFiltersWithWildcard)
app.post('/*', runQueryWithWildcard)

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })
  describe('validateScriptPath', () => {
    let mockRes

    beforeEach(() => {
      jest.resetAllMocks()
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn(),
        headersSent: false,
      }
    })

    it('should return true and send a 400 response if scriptPath is not provided', async () => {
      const user = {} // Mock user object
      const result = await validateScriptPath('', user, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.send).toHaveBeenCalledWith('Script path is required')
      expect(result).toBe(true)
    })

    it('should return true and send a 400 response for path traversal attempts', async () => {
      const user = {} // Mock user object
      const result = await validateScriptPath('../dataRequests/query.sql', user, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid script path: Path traversal detected',
      })
      expect(result).toBe(true)
    })

    it('should return true and send a 400 response if the scriptPath does not start with "dataRequests" or "api"', async () => {
      const user = {} // Mock user object
      const result = await validateScriptPath('invalidPath/query.sql', user, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid script path: Must start with "dataRequests" or "api"',
      })
      expect(result).toBe(true)
    })

    it('should return true and send a 403 response if the user lacks folder permissions', async () => {
      const user = {} // Mock user object
      checkFolderPermissions.mockResolvedValue(false) // Mock permission check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access forbidden: You do not have permission to run this query',
      })
      expect(result).toBe(true)
    })

    it('should return true and send a 400 response if the file does not exist', async () => {
      const user = {} // Mock user object
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(false) // Mock file existence check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid script path: No file matches the path specified',
      })
      expect(result).toBe(true)
    })

    it('should return false and not send any response if all validations pass', async () => {
      const user = {} // Mock user object
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock file existence check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes)

      expect(result).toBe(false)
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
      expect(mockRes.send).not.toHaveBeenCalled()
    })

    it('should skip file existence check if skipFileCheck is true', async () => {
      const user = {} // Mock user object
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check

      const result = await validateScriptPath('dataRequests/query.sql', user, mockRes, true)

      expect(result).toBe(false)
      expect(isFile).not.toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
      expect(mockRes.send).not.toHaveBeenCalled()
    })
  })

  describe('filterAttributes', () => {
    it('should filter out specified attributes from an object', () => {
      const obj = {
        name: 'John Doe',
        age: 30,
        email: 'john.doe@example.com',
        city: 'New York',
      }

      const keysToRemove = ['email', 'city']
      const result = filterAttributes(obj, keysToRemove)

      expect(result).toEqual({
        name: 'John Doe',
        age: 30,
      })
    })

    it('should return the same object if no keys are removed', () => {
      const obj = {
        name: 'Jane Doe',
        age: 25,
        email: 'jane.doe@example.com',
      }

      const keysToRemove = []
      const result = filterAttributes(obj, keysToRemove)

      expect(result).toEqual(obj)
    })

    it('should return an empty object if all keys are removed', () => {
      const obj = {
        name: 'Alice',
        age: 28,
        email: 'alice@example.com',
      }

      const keysToRemove = ['name', 'age', 'email']
      const result = filterAttributes(obj, keysToRemove)

      expect(result).toEqual({})
    })

    it('should return an empty object if given an empty object', () => {
      const obj = {}
      const keysToRemove = ['name', 'age']
      const result = filterAttributes(obj, keysToRemove)

      expect(result).toEqual({})
    })

    it('should not fail if attempting to remove keys that are not in the object', () => {
      const obj = {
        name: 'Bob',
        age: 32,
      }

      const keysToRemove = ['email', 'city']
      const result = filterAttributes(obj, keysToRemove)

      expect(result).toEqual({
        name: 'Bob',
        age: 32,
      })
    })
  })

  describe('listQueries', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should list all available query files', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      listQueryFiles.mockResolvedValue([{ name: 'Test Query', description: 'Test Description' }])

      const response = await request(app).get('/listQueries')
      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ name: 'Test Query', description: 'Test Description' }])
    })

    it('should handle errors when listing query files', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      listQueryFiles.mockImplementation(() => {
        throw new Error('Error listing query files')
      })

      const response = await request(app).get('/listQueries')
      expect(response.status).toBe(500)
      expect(response.text).toBe('Error listing query files')
    })

    it('should return 500 when an unexpected error occurs', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      listQueryFiles.mockImplementation(() => {
        throw new Error('Unexpected Error')
      })

      const response = await request(app).get('/listQueries')
      expect(response.status).toBe(500)
      expect(response.text).toBe('Error listing query files')
    })

    it('should return 400 if scriptPath is invalid', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      // Simulate early return due to invalid script path
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(false) // Mock permission check

      const response = await request(app).get('/listQueries?path=invalidPath')
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: 'Invalid script path: Must start with "dataRequests" or "api"',
      })
    })

    it('should return early if validateScriptPath sends a response', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check

      const response = await request(app).get('/listQueries?path=../dataRequests')
      expect(response.status).toBe(400) // Assuming validateScriptPath causes a 400 response
    })

    it('should default scriptPath to "dataRequests" when not provided', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      listQueryFiles.mockResolvedValue([{ name: 'Default Query', description: 'Default Description' }])

      const response = await request(app).get('/listQueries') // No path provided
      expect(checkFolderPermissions).toHaveBeenCalledWith({ id: 1, name: 'John Doe' }, 'dataRequests')
      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ name: 'Default Query', description: 'Default Description' }])
    })
  })

  describe('listQueriesWithWildcard', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should list all available query files', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      listQueryFiles.mockResolvedValue([{ name: 'Test Query', description: 'Test Description' }])

      const response = await request(app).get('/dataRequests/list')
      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ name: 'Test Query', description: 'Test Description' }])
    })
  })

  describe('getFilters', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should get filters with options when the options query param is set to true', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockReturnValue({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter with options' } },
      })

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path', options: 'true' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter with options' } },
      })
      expect(readFiltersFromFile).toHaveBeenCalledWith('./dataRequests/test/path', 1, true)
    })

    it('should default options query param to false if not provided', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockReturnValue({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter' } },
      })

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter' } },
      })
      expect(readFiltersFromFile).toHaveBeenCalledWith('./dataRequests/test/path', 1, false)
    })

    it('should return 500 if an unexpected error occurs when reading filters', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockImplementation(() => {
        throw new Error('Unexpected Error')
      })

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' })

      expect(response.status).toBe(500)
      expect(response.text).toBe('Error reading filters')
    })
    it('should get filters from the script', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockReturnValue({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter' } },
      })

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' })
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter' } },
      })
    })

    it('should return 400 if script path is not provided', async () => {
      const response = await request(app).get('/getFilters')
      expect(response.status).toBe(400)
      expect(response.text).toBe('Script path is required')
    })

    it('should return 400 for path traversal attempts', async () => {
      const response = await request(app).get('/getFilters').query({ path: '../outside/path' })
      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' })
    })

    it('should return 400 for a script path with invalid characters', async () => {
      const response = await request(app).get('/getFilters').query({ path: 'invalid/../../path' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' })
    })

    it('should return 400 if script path is not within allowed directory', async () => {
      const response = await request(app).get('/getFilters').query({ path: 'some/other/path' })
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: 'Invalid script path: Must start with "dataRequests" or "api"',
      })
    })

    it('should handle errors', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockImplementation(() => {
        throw new Error('Error reading filters')
      })

      const response = await request(app).get('/getFilters').query({ path: 'dataRequests/test/path' })
      expect(response.status).toBe(500)
      expect(response.text).toBe('Error reading filters')
    })
  })

  describe('getFiltersWithWildcard', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should get filters with options when the options query param is set to true', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockReturnValue({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter with options' } },
      })

      const response = await request(app).get('/dataRequests/test/path/filters').query({ options: 'true' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        filters: { filter1: { type: 'integer[]', description: 'Test Filter with options' } },
      })
      expect(readFiltersFromFile).toHaveBeenCalledWith('./dataRequests/test/path', 1, true)
    })
  })

  describe('runQuery', () => {
    const user = {
      id: 1,
      permissions: [
        { scopeId: 1, regionId: 1 },
        { scopeId: 2, regionId: 2 },
        { scopeId: 3, regionId: 3 },
      ],
    }

    beforeEach(() => {
      readFiltersFromFile.mockReturnValue({
        filters: { recipientIds: { type: 'integer[]', description: 'Test Filter' } },
        query: 'SELECT * FROM test',
        defaultOutputName: 'test_output',
      })
      setFilters.mockResolvedValue([])
      executeQuery.mockResolvedValue([{ id: 1, name: 'Test' }])
      sanitizeFilename.mockReturnValue('test_output_recipientIds_1-2-3')
      generateFilterString.mockReturnValue('recipientIds_1-2-3')
      currentUserId.mockResolvedValue(user.id)
      userById.mockResolvedValue(user)
      User.mockImplementation(() => ({
        filterRegions: jest.fn((ids) => ids.filter((id) => id <= 3)),
        getAllAccessibleRegions: jest.fn(() => [1, 2, 3]),
      }))
    })

    it('should run the query and return JSON result', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ region: [1, 2, 3, 4] })
        .send({ cache: false })

      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ id: 1, name: 'Test' }])
    })

    it('should run the query and return CSV result', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path', format: 'csv' })
        .send({ region: [1, 2, 3, 4] })
        .send({ cache: false })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
      expect(response.headers['content-disposition']).toBe('attachment; filename="test_output_recipientIds_1-2-3.csv"')
    })

    it('should return 400 if script path is not provided', async () => {
      const response = await request(app)
        .post('/runQuery')
        .send({ recipient: [1, 2, 3] })
        .send({ cache: false })
      expect(response.status).toBe(400)
      expect(response.text).toBe('Script path is required')
    })

    it('should return 400 for path traversal attempts', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: '../outside/path' })
        .send({ recipient: [1, 2, 3] })
        .send({ cache: false })
      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: 'Invalid script path: Path traversal detected' })
    })

    it('should return 400 if script path is not within allowed directory', async () => {
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'some/other/path' })
        .send({ recipient: [1, 2, 3] })
        .send({ cache: false })
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: 'Invalid script path: Must start with "dataRequests" or "api"',
      })
    })

    it('should return 200 if region are missing', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/' })
        .send({}) // No regionIds sent
        .send({ cache: false })
      expect(response.status).toBe(200)
    })

    it('should return 200 if region are not an array of integers', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ region: 'invalidType' }) // Invalid data type
        .send({ cache: false })
      expect(response.status).toBe(200)
    })

    it('should handle errors', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      readFiltersFromFile.mockImplementation(() => {
        throw new Error('Error reading query')
      })

      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ recipientIds: [1, 2, 3] })
        .send({ cache: false })

      expect(response.status).toBe(500)
      expect(response.text).toBe('Error executing query: Error reading query')
    })

    it('should filter out non-integer region', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const filterRegionsMock = jest.fn((val) => val)
      User.mockImplementation(() => ({
        filterRegions: filterRegionsMock,
        getAllAccessibleRegions: jest.fn(() => [1, 2, 3]),
      }))
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ 'region.in': [1, 'a', 2, 'b', 3] })
        .send({ cache: false })

      expect(response.status).toBe(200)
      expect(filterRegionsMock).toHaveBeenCalledWith([1, 2, 3])
    })

    it('should return 401 when no region are available', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      User.mockImplementation(() => ({
        filterRegions: jest.fn((ids) => ids.filter((id) => id <= null)),
        getAllAccessibleRegions: jest.fn(() => []),
      }))
      const response = await request(app).post('/runQuery').query({ path: 'dataRequests/test/path' }).send({ cache: false })

      expect(response.status).toBe(401)
    })

    it('should filter region using policy', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const filterRegionsMock = jest.fn((val) => val)
      User.mockImplementation(() => ({
        filterRegions: filterRegionsMock,
        getAllAccessibleRegions: jest.fn(() => []),
      }))
      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path' })
        .send({ 'region.in': [1, 2, 3, 4] })
        .send({ cache: false })

      expect(response.status).toBe(200)
      expect(filterRegionsMock).toHaveBeenCalledWith([1, 2, 3, 4])
      expect(response.body).toEqual([{ id: 1, name: 'Test' }])
    })

    it('should return CSV response with sanitized file name', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      sanitizeFilename.mockReturnValue('test_output_sanitized')

      const response = await request(app)
        .post('/runQuery')
        .query({ path: 'dataRequests/test/path', format: 'csv' })
        .send({ recipientIds: [1, 2, 3] })
        .send({ cache: false })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
      expect(response.headers['content-disposition']).toBe('attachment; filename="test_output_sanitized.csv"')
    })
  })

  describe('runQueryWithWildcard', () => {
    const user = {
      id: 1,
      permissions: [
        { scopeId: 1, regionId: 1 },
        { scopeId: 2, regionId: 2 },
        { scopeId: 3, regionId: 3 },
      ],
    }

    beforeEach(() => {
      readFiltersFromFile.mockReturnValue({
        filters: { recipientIds: { type: 'integer[]', description: 'Test Filter' } },
        query: 'SELECT * FROM test',
        defaultOutputName: 'test_output',
      })
      setFilters.mockResolvedValue([])
      executeQuery.mockResolvedValue([{ id: 1, name: 'Test' }])
      sanitizeFilename.mockReturnValue('test_output_recipientIds_1-2-3')
      generateFilterString.mockReturnValue('recipientIds_1-2-3')
      currentUserId.mockResolvedValue(user.id)
      userById.mockResolvedValue(user)
      User.mockImplementation(() => ({
        filterRegions: jest.fn((ids) => ids.filter((id) => id <= 3)),
        getAllAccessibleRegions: jest.fn(() => [1, 2, 3]),
      }))
    })

    it('should run the query and return JSON result', async () => {
      currentUserId.mockResolvedValue(1)
      userById.mockResolvedValue({ id: 1, name: 'John Doe' })
      checkFolderPermissions.mockResolvedValue(true) // Mock permission check
      isFile.mockResolvedValue(true) // Mock permission check
      preprocessAndValidateFilters.mockResolvedValue({ result: {}, errors: {} })
      const response = await request(app)
        .post('/dataRequests/test/path')
        .send({ 'region.in': [1, 2, 3, 4] })
        .send({ cache: false })

      expect(response.status).toBe(200)
      expect(response.body).toEqual([{ id: 1, name: 'Test' }])
    })
  })
})
