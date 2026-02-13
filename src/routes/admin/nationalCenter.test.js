import httpCodes from 'http-codes'
import db from '../../models'
import { updateNationalCenter, deleteNationalCenter, createNationalCenter } from './nationalCenter'
import { updateById, deleteById, create } from '../../services/nationalCenters'

jest.mock('../../services/nationalCenters', () => ({
  updateById: jest.fn(),
  deleteById: jest.fn(),
  create: jest.fn(),
}))

describe('nationalCenter admin routes', () => {
  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json: jest.fn(),
    })),
  }

  const mockRequest = {
    session: {
      userId: 1,
    },
    query: {},
  }

  describe('updateNationalCenter', () => {
    afterAll(() => db.sequelize.close())
    it('successfully updates a nationalCenter', async () => {
      const nationalCenter = { id: 1, name: 'Updated National Center' }
      updateById.mockResolvedValueOnce(nationalCenter)

      const req = {
        ...mockRequest,
        body: {
          name: nationalCenter.name,
        },
        params: {
          nationalCenterId: nationalCenter.id,
        },
      }

      await updateNationalCenter(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK)
    })
    it('handles failures', async () => {
      const nationalCenter = { id: 1, name: 'Updated National Center' }
      updateById.mockRejectedValueOnce(new Error('Failed to update nationalCenter'))

      const req = {
        ...mockRequest,
        body: {
          name: nationalCenter.name,
        },
        params: {
          nationalCenterId: nationalCenter.id,
        },
      }

      await updateNationalCenter(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR)
    })
  })

  describe('deleteNationalCenter', () => {
    it('successfully deletes a nationalCenter', async () => {
      const nationalCenter = { id: 1, name: 'Updated National Center' }
      deleteById.mockResolvedValueOnce(nationalCenter)

      const req = {
        ...mockRequest,
        params: {
          nationalCenterId: nationalCenter.id,
        },
      }

      await deleteNationalCenter(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK)
    })
    it('handles failures', async () => {
      const nationalCenter = { id: 1, name: 'Updated National Center' }
      deleteById.mockRejectedValueOnce(new Error('Failed to delete nationalCenter'))

      const req = {
        ...mockRequest,
        params: {
          nationalCenterId: nationalCenter.id,
        },
      }

      await deleteNationalCenter(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR)
    })
  })

  describe('createNationalCenter', () => {
    it('successfully creates a nationalCenter', async () => {
      const nationalCenter = { id: 1, name: 'Updated National Center' }
      create.mockResolvedValueOnce(nationalCenter)

      const req = {
        ...mockRequest,
        body: {
          name: nationalCenter.name,
        },
      }

      await createNationalCenter(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.CREATED)
    })
    it('handles failures', async () => {
      const nationalCenter = { id: 1, name: 'Updated National Center' }
      create.mockRejectedValueOnce(new Error('Failed to create nationalCenter'))

      const req = {
        ...mockRequest,
        body: {
          name: nationalCenter.name,
        },
      }

      await createNationalCenter(req, mockResponse)
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR)
    })
  })
})
