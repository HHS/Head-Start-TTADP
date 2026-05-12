import { EventEmitter } from 'node:events';
import {
  monitoringDiagnosticById,
  monitoringDiagnostics,
  monitoringDiagnosticsCsv,
} from '../../services/monitoringDiagnostics';
import {
  exportMonitoringDiagnostics,
  getMonitoringDiagnostic,
  getMonitoringDiagnostics,
} from './monitoringHandlers';

jest.mock('../../services/monitoringDiagnostics', () => ({
  monitoringDiagnostics: jest.fn(),
  monitoringDiagnosticById: jest.fn(),
  monitoringDiagnosticsCsv: jest.fn(),
}));

function createMockResponse() {
  return Object.assign(new EventEmitter(), {
    end: jest.fn(),
    header: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    write: jest.fn(() => true),
    writeHead: jest.fn(),
  });
}

describe('Monitoring diagnostic handlers', () => {
  let mockResponse;

  beforeEach(() => {
    mockResponse = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonitoringDiagnostic', () => {
    const request = {
      params: { id: '4' },
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

    it('returns 400 when the id is not a strict integer', async () => {
      await getMonitoringDiagnostic('citations')({ params: { id: '1;DROP' } }, mockResponse);

      expect(monitoringDiagnosticById).not.toHaveBeenCalled();
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });

    it('returns 404 when the row is missing', async () => {
      monitoringDiagnosticById.mockResolvedValue(undefined);

      await getMonitoringDiagnostic('citations')(request, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('rethrows errors', async () => {
      monitoringDiagnosticById.mockImplementation(() => {
        throw new Error('nope');
      });

      await expect(getMonitoringDiagnostic('citations')(request, mockResponse)).rejects.toThrow(
        'nope'
      );
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

    it('rethrows errors', async () => {
      monitoringDiagnostics.mockImplementation(() => {
        throw new Error('nope');
      });

      await expect(getMonitoringDiagnostics('citations')(request, mockResponse)).rejects.toThrow(
        'nope'
      );
    });
  });

  describe('exportMonitoringDiagnostics', () => {
    const request = {
      query: {
        columns: '[{"label":"Grant ID","source":"grantId"}]',
        filter: '{}',
      },
    };

    it('returns a csv export attachment', async () => {
      monitoringDiagnosticsCsv.mockResolvedValue(
        (async function* csvLines() {
          yield 'Grant ID\n';
          yield '11\n';
        })()
      );

      await exportMonitoringDiagnostics('grantCitations')(request, mockResponse);

      expect(monitoringDiagnosticsCsv).toHaveBeenCalledWith('grantCitations', request.query);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Disposition': 'attachment; filename="grantCitations.csv"',
        'Content-Type': 'text/csv; charset=utf-8',
      });
      expect(mockResponse.write).toHaveBeenNthCalledWith(1, 'Grant ID\n');
      expect(mockResponse.write).toHaveBeenNthCalledWith(2, '11\n');
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('rethrows export errors', async () => {
      monitoringDiagnosticsCsv.mockImplementation(() => {
        throw new Error('nope');
      });

      await expect(
        exportMonitoringDiagnostics('grantCitations')(request, mockResponse)
      ).rejects.toThrow('nope');
    });

    it('waits for drain when the response buffer is full', async () => {
      monitoringDiagnosticsCsv.mockResolvedValue(
        (async function* csvLines() {
          yield 'Grant ID\n';
          yield '11\n';
        })()
      );
      mockResponse.write.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const exportPromise = exportMonitoringDiagnostics('grantCitations')(request, mockResponse);

      await new Promise(setImmediate);

      expect(mockResponse.write).toHaveBeenCalledTimes(1);
      expect(mockResponse.write).toHaveBeenCalledWith('Grant ID\n');
      expect(mockResponse.end).not.toHaveBeenCalled();

      mockResponse.emit('drain');
      await exportPromise;

      expect(mockResponse.write).toHaveBeenNthCalledWith(2, '11\n');
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
