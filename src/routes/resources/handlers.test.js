import { getResourcesDashboardData } from './handlers';
import { resourceDashboardPhase1 } from '../../services/dashboards/resource';
import { activityReports } from '../../services/activityReports';
import { getUserReadRegions } from '../../services/accessValidation';

jest.mock('../../services/activityReports', () => ({
  activityReports: jest.fn(),
}));

jest.mock('../../services/dashboards/resource', () => ({
  resourceDashboardPhase1: jest.fn(),
}));
jest.mock('../../services/accessValidation');

describe('Resources handler', () => {
  describe('getResourcesDashboardData', () => {
    it('should return all dashboard data', async () => {
      const responseData = { overview: {}, use: {}, reportIds: [1] };
      activityReports.mockResolvedValue({});
      const resourcesData = {
        resourcesDashboardOverview: {},
        resourcesUse: {},
        activityReports: {},
        reportIds: [1],
      };
      resourceDashboardPhase1.mockResolvedValue(responseData);
      getUserReadRegions.mockResolvedValue([1]);
      const req = {
        session: { userId: 1 },
        query: {
          sortBy: 'id',
          direction: 'asc',
          limit: 10,
          offset: 0,
        },
      };
      const res = { json: jest.fn() };
      await getResourcesDashboardData(req, res);
      expect(activityReports).toHaveBeenCalledWith(
        {
          sortBy: 'id',
          sortDir: 'asc',
          offset: 0,
          limit: 10,
        },
        true,
        1,
        [1],
      );
      expect(res.json).toHaveBeenCalledWith(resourcesData);
    });
  });
});
