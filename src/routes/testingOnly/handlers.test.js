import { reseedDB, queryDB, health } from './handlers'
import { reseed, query } from '../../../tests/utils/dbUtils'
import handleErrors from '../../lib/apiErrorHandler'

jest.mock('../../../tests/utils/dbUtils')
jest.mock('../../lib/apiErrorHandler')

describe('handlers', () => {
  let req
  let res

  beforeEach(() => {
    req = { body: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
  })

  describe('reseedDB', () => {
    it('should return 200 if reseed is successful', async () => {
      reseed.mockResolvedValue(true)
      await reseedDB(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(true)
    })

    it('should return 500 if reseed fails', async () => {
      reseed.mockResolvedValue(false)
      await reseedDB(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(false)
    })

    it('should handle errors', async () => {
      const error = new Error('test error')
      reseed.mockRejectedValue(error)
      await reseedDB(req, res)
      expect(handleErrors).toHaveBeenCalledWith(req, res, error, 'reseedDB')
    })
  })

  describe('queryDB', () => {
    it('should return 200 if query is successful', async () => {
      req.body = { command: 'SELECT * FROM users' }
      query.mockResolvedValue([{}])
      await queryDB(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith([{}])
    })

    it('should return 501 if query returns empty result', async () => {
      req.body = { command: 'SELECT * FROM users' }
      query.mockResolvedValue([])
      await queryDB(req, res)
      expect(res.status).toHaveBeenCalledWith(501)
      expect(res.json).toHaveBeenCalledWith([])
    })

    it('should throw error if req.body is missing', async () => {
      req.body = null
      await queryDB(req, res)
      expect(handleErrors).toHaveBeenCalledWith(req, res, new Error('req.body is required'), 'queryDB')
    })

    it('should throw error if command is missing', async () => {
      req.body = { options: {} }
      await queryDB(req, res)
      expect(handleErrors).toHaveBeenCalledWith(req, res, new Error('command is required'), 'queryDB')
    })

    it('should handle errors', async () => {
      req.body = { command: 'SELECT * FROM users' }
      const error = new Error('test error')
      query.mockRejectedValue(error)
      await queryDB(req, res)
      expect(handleErrors).toHaveBeenCalledWith(req, res, error, 'queryDB')
    })
  })

  describe('health', () => {
    it('should always return 200', async () => {
      await health(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })
})
