import { getWidget, keysDisallowCache } from './handlers';
import { setReadRegions } from '../../services/accessValidation';
import widgets from '../../widgets';

jest.mock('../../services/accessValidation');
jest.mock('../../widgets');

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
  params: { widgetId: 'overview' },
};

describe('Widget handlers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWidget', () => {
    const request = {
      ...mockRequest,
      query: { 'region.in': ['1'] },
    };
    const response = {
      numGrants: '0', numOtherEntities: '0', numParticipants: '0', numReports: '0', numTotalGrants: '2', sumDuration: '0',
    };

    beforeEach(() => {
      setReadRegions.mockReturnValue(Promise.resolve({ 'region.in': ['1'] }));
      widgets.overview.mockReturnValue(Promise.resolve(response));
    });

    it('returns overview data', async () => {
      await getWidget(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles no region in query', async () => {
      await getWidget({ ...mockRequest, query: {} }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles error in parsing region', async () => {
      await getWidget({ ...mockRequest, query: { 'region.in': [''] } }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('returns 404 when unknown widget', async () => {
      await getWidget({ ...request, params: { widgetId: 'nonexistent' } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('onlyAllowedKeys', () => {
    it('returns true if disallowed filter', async () => {
      const queryToCheck = { 'region.in': ['1'], 'myReports.in': ['Creator'] };
      const skipCache = keysDisallowCache(queryToCheck);
      expect(skipCache).toBe(true);
    });

    it('returns false if disallowed filter', async () => {
      const queryToCheck = { 'region.in': ['1'], 'activityReportGoalResponse.in.in': ['Facilities'] };
      const skipCache = keysDisallowCache(queryToCheck);
      expect(skipCache).toBe(false);
    });
  });
});
