import handleErrors from '../../lib/apiErrorHandler';
import { auditLogger } from '../../logger';
import { setReadRegions } from '../../services/accessValidation';
import { goalDashboardGoals, goalDashboardGoalsCsvRows } from '../../services/dashboards/goal';
import widgets from '../../widgets';
import { getWidget, keysDisallowCache, postWidget } from './handlers';

jest.mock('../../lib/cache', () => jest.fn(async (_key, fn, parser) => parser(await fn())));
jest.mock('../../lib/apiErrorHandler', () =>
  jest.fn(async (_req, res) => {
    res.status(500).end();
  })
);
jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));
jest.mock('../../services/accessValidation');
jest.mock('../../services/dashboards/goal', () => ({
  GOAL_DASHBOARD_CSV_COLUMNS: [
    { key: 'recipientName', header: 'Recipient name' },
    { key: 'grantNumber', header: 'Grant Number' },
  ],
  goalDashboardGoals: jest.fn(),
  goalDashboardGoalsCsvRows: jest.fn(),
}));
jest.mock('../../widgets');
let mockStringifierInstance;
jest.mock('csv-stringify', () => {
  const MockStringifier = jest.fn().mockImplementation(() => {
    mockStringifierInstance = {
      pipe: jest.fn().mockReturnThis(),
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    };
    return mockStringifierInstance;
  });
  return { Stringifier: MockStringifier };
});

const mockStatusEnd = jest.fn();

const mockResponse = {
  attachment: jest.fn(),
  destroy: jest.fn(),
  end: jest.fn(),
  headersSent: false,
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: mockStatusEnd,
  })),
  type: jest.fn(),
  write: jest.fn(() => true),
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
      query: { 'region.in': ['1'], skipCache: 'true' },
    };
    const response = {
      numGrants: '0',
      numOtherEntities: '0',
      numParticipants: '0',
      numReports: '0',
      numTotalGrants: '2',
      sumDuration: '0',
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

    it('streams csv for goal dashboard exports over GET', async () => {
      goalDashboardGoalsCsvRows.mockReturnValue(
        (async function* goalDashboardCsv() {
          yield { recipientName: 'A', grantNumber: 'B' };
        })()
      );

      await getWidget(
        {
          ...request,
          params: { widgetId: 'goalDashboardGoals' },
          query: { 'region.in': ['1'], format: 'csv' },
        },
        mockResponse
      );

      expect(mockResponse.type).toHaveBeenCalledWith('text/csv');
      expect(mockResponse.attachment).toHaveBeenCalledWith('goal-dashboard-goals.csv');
      expect(mockResponse.write).toHaveBeenNthCalledWith(1, '\ufeff');
      expect(mockResponse.write).toHaveBeenNthCalledWith(2, '"Recipient name","Grant Number"\n');
      expect(mockStringifierInstance.pipe).toHaveBeenCalledWith(mockResponse);
      expect(mockStringifierInstance.write).toHaveBeenCalledWith({
        recipientName: 'A',
        grantNumber: 'B',
      });
      expect(mockStringifierInstance.end).toHaveBeenCalled();
      expect(widgets.goalDashboardGoals).not.toHaveBeenCalled();
    });

    it('handles an early csv streaming failure before the response starts', async () => {
      const error = new Error('failed before first chunk');
      goalDashboardGoalsCsvRows.mockReturnValue({
        next: jest.fn().mockRejectedValue(error),
        [Symbol.asyncIterator]() {
          return this;
        },
      });

      await postWidget(
        {
          ...request,
          body: { goalIds: [7, 9] },
          params: { widgetId: 'goalDashboardGoals' },
          query: { ...request.query, format: 'csv' },
        },
        mockResponse
      );

      expect(handleErrors).toHaveBeenCalledWith(
        expect.anything(),
        mockResponse,
        error,
        expect.objectContaining({ namespace: 'SERVICE:WIDGETS' })
      );
      expect(mockResponse.type).not.toHaveBeenCalled();
      expect(mockResponse.attachment).not.toHaveBeenCalled();
      expect(mockResponse.write).not.toHaveBeenCalled();
      expect(mockResponse.destroy).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockStatusEnd).toHaveBeenCalled();
    });

    it('posts goal ids for selected goal dashboard rows', async () => {
      const response = { goalDashboardGoals: { count: 1, goalRows: [{ id: 7 }], allGoalIds: [] } };
      goalDashboardGoals.mockResolvedValue(response);

      await postWidget(
        {
          ...request,
          body: { goalIds: [7, 9] },
          params: { widgetId: 'goalDashboardGoals' },
        },
        mockResponse
      );

      expect(goalDashboardGoals).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ goalIds: [7, 9] })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('uses goal ids from the POST body instead of query sanitization', async () => {
      const response = { goalDashboardGoals: { count: 1, goalRows: [{ id: 7 }], allGoalIds: [] } };
      goalDashboardGoals.mockResolvedValue(response);

      await postWidget(
        {
          ...request,
          body: { goalIds: [7, 9] },
          params: { widgetId: 'goalDashboardGoals' },
          query: { ...request.query, goalIds: ['99'] },
        },
        mockResponse
      );

      expect(goalDashboardGoals).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ goalIds: [7, 9] })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('streams csv when goal dashboard goals are posted with format=csv', async () => {
      goalDashboardGoalsCsvRows.mockReturnValue(
        (async function* goalDashboardCsv() {
          yield { recipientName: 'A', grantNumber: 'B' };
        })()
      );

      await postWidget(
        {
          ...request,
          body: { goalIds: [7, 9] },
          params: { widgetId: 'goalDashboardGoals' },
          query: { ...request.query, format: 'csv' },
        },
        mockResponse
      );

      expect(mockResponse.type).toHaveBeenCalledWith('text/csv');
      expect(mockResponse.attachment).toHaveBeenCalledWith('goal-dashboard-goals.csv');
      expect(mockResponse.write).toHaveBeenNthCalledWith(1, '\ufeff');
      expect(mockResponse.write).toHaveBeenNthCalledWith(2, '"Recipient name","Grant Number"\n');
      expect(mockStringifierInstance.pipe).toHaveBeenCalledWith(mockResponse);
      expect(mockStringifierInstance.write).toHaveBeenCalledWith({
        recipientName: 'A',
        grantNumber: 'B',
      });
      expect(mockStringifierInstance.end).toHaveBeenCalled();
    });

    it('logs and destroys the response when csv streaming fails after it starts', async () => {
      const error = new Error('stream failed after header');
      goalDashboardGoalsCsvRows.mockReturnValue({
        next: jest.fn().mockResolvedValueOnce({
          value: { recipientName: 'A', grantNumber: 'B' },
          done: false,
        }),
        [Symbol.asyncIterator]: jest.fn(function asyncIterator() {
          return {
            next: jest.fn().mockRejectedValue(error),
          };
        }),
      });

      await postWidget(
        {
          ...request,
          body: { goalIds: [7, 9] },
          params: { widgetId: 'goalDashboardGoals' },
          query: { ...request.query, format: 'csv' },
        },
        mockResponse
      );

      expect(mockResponse.type).toHaveBeenCalledWith('text/csv');
      expect(mockResponse.attachment).toHaveBeenCalledWith('goal-dashboard-goals.csv');
      expect(mockResponse.write).toHaveBeenNthCalledWith(1, '\ufeff');
      expect(mockResponse.write).toHaveBeenNthCalledWith(2, '"Recipient name","Grant Number"\n');
      expect(mockStringifierInstance.write).toHaveBeenCalledWith({
        recipientName: 'A',
        grantNumber: 'B',
      });
      expect(auditLogger.error).toHaveBeenCalledWith(
        'SERVICE:WIDGETS - goalDashboardGoals CSV stream failed after response started',
        expect.objectContaining({ err: error })
      );
      expect(mockStringifierInstance.destroy).toHaveBeenCalledWith(error);
      expect(mockResponse.destroy).toHaveBeenCalledWith(error);
      expect(mockStringifierInstance.end).not.toHaveBeenCalled();
      expect(handleErrors).not.toHaveBeenCalled();
    });
  });

  describe('onlyAllowedKeys', () => {
    it('returns true if disallowed filter', async () => {
      const queryToCheck = { 'region.in': ['1'], 'myReports.in': ['Creator'] };
      const skipCache = keysDisallowCache(queryToCheck);
      expect(skipCache).toBe(true);
    });

    it('returns false if disallowed filter', async () => {
      const queryToCheck = {
        'region.in': ['1'],
        'activityReportGoalResponse.in.in': ['Facilities'],
      };
      const skipCache = keysDisallowCache(queryToCheck);
      expect(skipCache).toBe(false);
    });
  });
});
