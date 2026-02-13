import { getResourcesDashboardData, getFlatResourcesDataWithCache } from './handlers'
import { resourceDashboardPhase1, resourceDashboardFlat } from '../../services/dashboards/resource'
import { getUserReadRegions } from '../../services/accessValidation'

jest.mock('../../services/dashboards/resource', () => ({
  resourceDashboardPhase1: jest.fn(),
  resourceDashboardFlat: jest.fn(),
}))
jest.mock('../../services/accessValidation')

describe('Resources handler', () => {
  describe('getResourcesDashboardData', () => {
    it('should return all dashboard data', async () => {
      const responseData = { overview: {}, use: {}, reportIds: [1] }
      const resourcesData = {
        resourcesDashboardOverview: {},
        resourcesUse: {},
        reportIds: [1],
      }
      resourceDashboardPhase1.mockResolvedValue(responseData)
      getUserReadRegions.mockResolvedValue([1])
      const req = {
        session: { userId: 1 },
        query: {
          sortBy: 'id',
          direction: 'asc',
          limit: 10,
          offset: 0,
        },
      }
      const res = { json: jest.fn() }
      await getResourcesDashboardData(req, res)
      expect(res.json).toHaveBeenCalledWith(resourcesData)
    })
  })
  describe('getFlatResourcesDataWithCache', () => {
    it('should return all dashboard data', async () => {
      const responseData = {
        overview: {},
        rolledUpResourceUse: {},
        rolledUpTopicUse: {},
        dateHeaders: [],
      }

      resourceDashboardFlat.mockResolvedValue(responseData)
      getUserReadRegions.mockResolvedValue([1])
      const req = {
        session: { userId: 1 },
        query: {
          sortBy: 'id',
          direction: 'asc',
          limit: 10,
          offset: 0,
        },
      }
      const res = { json: jest.fn() }
      await getFlatResourcesDataWithCache(req, res)
      expect(res.json).toHaveBeenCalledWith(responseData)
    })
  })
})
