import ActivityReportsPresenter from '../../../serializers/activityReports';
import ActivityReport from '../../../policies/activityReport';
import { notFound, unauthorized } from '../../../serializers/errorResponses';
import { activityReportById } from '../../../services/activityReports';
import { getReportByDisplayId } from './handlers';

jest.mock('../../../services/users', () => ({
  userById: jest.fn(),
}));
jest.mock('../../../middleware/authMiddleware', () => ({
  currentUserId: jest.fn(),
}));
jest.mock('../../../services/activityReports', () => ({
  activityReportById: jest.fn(),
}));
jest.mock('../../../serializers/activityReports');
jest.mock('../../../serializers/errorResponses');
jest.mock('../../../policies/activityReport');

describe('External API Activity Report handlers', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getReportByDisplayId', () => {
    const mockRequest = { params: { displayId: 'R01-AR-1234' } };
    const mockResponse = { json: jest.fn() };

    it('returns a found report', async () => {
      const report = jest.fn();
      activityReportById.mockResolvedValue(report);
      ActivityReport.mockImplementationOnce(() => ({
        canGet: () => true,
      }));
      const mockRender = jest.fn();
      ActivityReportsPresenter.render.mockReturnValue(mockRender);

      await getReportByDisplayId(mockRequest, mockResponse);

      expect(ActivityReportsPresenter.render).toHaveBeenCalledWith(report);
      expect(mockResponse.json).toHaveBeenCalledWith(mockRender);
    });

    it('handles a missing report', async () => {
      activityReportById.mockResolvedValue(null);

      await getReportByDisplayId(mockRequest, mockResponse);

      expect(notFound).toHaveBeenCalledWith(mockResponse, 'Report R01-AR-1234 could not be found');
    });

    it('handles an unauthorized user', async () => {
      const report = jest.fn();
      activityReportById.mockResolvedValue(report);
      ActivityReport.mockImplementationOnce(() => ({
        canGet: () => false,
      }));

      await getReportByDisplayId(mockRequest, mockResponse);

      expect(unauthorized).toHaveBeenCalledWith(mockResponse, 'User is not authorized to access R01-AR-1234');
    });
  });
});
