import { checkRecipientAccessAndExistence } from '../utils'
import handleErrors from '../../lib/apiErrorHandler'
import { classScore, monitoringData, ttaByCitations, ttaByReviews } from '../../services/monitoring'
import { getMonitoringData, getClassScore, getTtaByCitation, getTtaByReview } from './handlers'

jest.mock('../utils')
jest.mock('../../lib/apiErrorHandler')
jest.mock('../../services/monitoring')

describe('monintoring handlers', () => {
  describe('getMonitoringData', () => {
    let req
    let res

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
          grantNumber: '01',
        },
      }

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
    })

    it('should call checkRecipientAccessAndExistence and monitoringData with correct arguments', async () => {
      await getMonitoringData(req, res)

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res)
      expect(monitoringData).toHaveBeenCalledWith({
        recipientId: 1,
        regionId: 2,
        grantNumber: '01',
      })
    })

    it('should call res.status with 200 and res.json with the data returned by monitoringData', async () => {
      const data = { foo: 'bar' }
      monitoringData.mockResolvedValue(data)

      await getMonitoringData(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error')
      monitoringData.mockRejectedValue(error)

      await getMonitoringData(req, res)

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      })
    })
  })

  describe('getTtaByReview', () => {
    let req
    let res

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
        },
      }

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
    })

    it('should call checkRecipientAccessAndExistence and classScore with correct arguments', async () => {
      await getTtaByReview(req, res)

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res)
      expect(ttaByReviews).toHaveBeenCalledWith(1, 2)
    })

    it('should call res.status with 200 and res.json with the data returned by classScore', async () => {
      const data = { foo: 'bar' }
      ttaByReviews.mockResolvedValue(data)

      await getTtaByReview(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error')
      ttaByReviews.mockRejectedValue(error)

      await getTtaByReview(req, res)

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      })
    })
  })

  describe('getTtaByCitation', () => {
    let req
    let res

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
        },
      }

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
    })

    it('should call checkRecipientAccessAndExistence and classScore with correct arguments', async () => {
      await getTtaByCitation(req, res)

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res)
      expect(ttaByCitations).toHaveBeenCalledWith(1, 2)
    })

    it('should call res.status with 200 and res.json with the data returned by classScore', async () => {
      const data = { foo: 'bar' }
      ttaByCitations.mockResolvedValue(data)

      await getTtaByCitation(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error')
      ttaByCitations.mockRejectedValue(error)

      await getTtaByCitation(req, res)

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      })
    })
  })
  describe('getClassScore', () => {
    let req
    let res

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
          grantNumber: '01',
        },
      }

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      }
    })

    it('should call checkRecipientAccessAndExistence and classScore with correct arguments', async () => {
      await getClassScore(req, res)

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res)
      expect(classScore).toHaveBeenCalledWith({ recipientId: 1, regionId: 2, grantNumber: '01' })
    })

    it('should call res.status with 200 and res.json with the data returned by classScore', async () => {
      const data = { foo: 'bar' }
      classScore.mockResolvedValue(data)

      await getClassScore(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error')
      classScore.mockRejectedValue(error)

      await getClassScore(req, res)

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      })
    })
  })
})
