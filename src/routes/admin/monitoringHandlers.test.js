import { getMonitoringDiagnostics, getMonitoringDiagnostic } from './monitoringHandlers';
import {
  monitoringDiagnostics,
  monitoringDiagnosticById,
} from '../../services/monitoringDiagnostics';
import { auditLogger as logger } from '../../logger';

jest.mock('../../services/monitoringDiagnostics', () => ({
  monitoringDiagnostics: jest.fn(),
  monitoringDiagnosticById: jest.fn(),
}));

jest.mock('../../logger');

const mockResponse = {
  header: jest.fn(),
  json: jest.fn(),
  sendStatus: jest.fn(),
};

describe('Monitoring diagnostic handlers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonitoringDiagnostic', () => {
    const request = {
      params: { id: 4 },
    };

    it('returns a monitoring diagnostic row', async () => {
      const response = {
        id: 4,
        finding_uuid: 'finding-1',
      };

      monitoringDiagnosticById.mockResolvedValue(response);

      await getMonitoringDiagnostic('citations')(request, mockResponse);

      expect(monitoringDiagnosticById).toHaveBeenCalledWith('citations', 4);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('returns 404 when the row is missing', async () => {
      monitoringDiagnosticById.mockResolvedValue(undefined);

      await getMonitoringDiagnostic('citations')(request, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('logs errors', async () => {
      monitoringDiagnosticById.mockImplementation(() => {
        throw new Error('nope');
      });

      await getMonitoringDiagnostic('citations')(request, mockResponse);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getMonitoringDiagnostics', () => {
    const request = {
      query: { filter: '{}', range: '[0,9]', sort: '["id","ASC"]' },
    };

    it('returns monitoring diagnostic rows', async () => {
      const response = {
        count: 1,
        rows: [
          {
            id: 4,
            finding_uuid: 'finding-1',
          },
        ],
      };

      monitoringDiagnostics.mockResolvedValue(response);

      await getMonitoringDiagnostics('citations')(request, mockResponse);

      expect(monitoringDiagnostics).toHaveBeenCalledWith('citations', request.query);
      expect(mockResponse.header).toHaveBeenCalledWith('Content-Range', 'citations */1');
      expect(mockResponse.json).toHaveBeenCalledWith(response.rows);
    });

    it('returns 404 on unexpected response', async () => {
      monitoringDiagnostics.mockResolvedValue(undefined);

      await getMonitoringDiagnostics('citations')(request, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('logs errors', async () => {
      monitoringDiagnostics.mockImplementation(() => {
        throw new Error('nope');
      });

      await getMonitoringDiagnostics('citations')(request, mockResponse);

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
