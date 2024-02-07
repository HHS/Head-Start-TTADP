import getRequestErrors, { getRequestError, deleteRequestErrors } from './handlers';
import {
  requestErrors, requestErrorById, requestErrorsByIds, delRequestErrors,
} from '../../services/requestErrors';
import { auditLogger as logger } from '../../logger';

jest.mock('../../services/requestErrors', () => ({
  requestErrors: jest.fn(),
  requestErrorById: jest.fn(),
  requestErrorsByIds: jest.fn(),
  delRequestErrors: jest.fn(),
}));

jest.mock('../../logger');

const mockResponse = {
  header: jest.fn(),
  json: jest.fn(),
  sendStatus: jest.fn(),
};

describe('RequestError handlers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequestError', () => {
    const request = {
      params: { id: 4 },
    };

    it('returns a requestError', async () => {
      const response = {
        id: '4',
        operation: 'TEST OPERATION',
        uri: 'http://smarthub',
        method: 'POST',
        requestBody: {
          foo: 'bar',
        },
        responseBody: {
          error: {
            foo: 'bar',
          },
        },
        responseCode: '500',
        createdAt: '2021-05-010T11:37:53.321Z',
        updatedAt: '2021-05-010T11:37:53.321Z',
      };

      requestErrorById.mockResolvedValue(response);
      await getRequestError(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles unexpected response', async () => {
      requestErrorById.mockResolvedValue(undefined);
      await getRequestError(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles errors', async () => {
      requestErrorById.mockImplementation(() => {
        throw new Error();
      });
      await getRequestError(request, mockResponse);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('requestErrors', () => {
    const request = {
      query: { filter: '{}', range: '[0,9]', sort: '["id","ASC"]' },
    };

    it('returns getRequestErrors', async () => {
      const response = {
        count: 1,
        rows: [
          {
            id: '4',
            operation: 'TEST OPERATION',
            uri: 'http://smarthub',
            method: 'POST',
            requestBody: {
              foo: 'bar',
            },
            responseBody: {
              error: {
                foo: 'bar',
              },
            },
            responseCode: '500',
            createdAt: '2021-05-010T11:37:53.321Z',
            updatedAt: '2021-05-010T11:37:53.321Z',
          },
        ],
      };
      requestErrors.mockResolvedValue(response);
      await getRequestErrors(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response.rows);
    });

    it('handles unexpected response', async () => {
      requestErrors.mockResolvedValue(undefined);
      await getRequestErrors(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles errors', async () => {
      requestErrors.mockImplementation(() => {
        throw new Error();
      });
      await getRequestErrors(request, mockResponse);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteRequestErrors', () => {
    const request = {
      query: { filter: '{"id":["58"]}' },
    };

    it('deletes RequestErrors', async () => {
      const response = [
        {
          id: '58',
        },
      ];
      requestErrorsByIds.mockResolvedValue(response);
      delRequestErrors.mockResolvedValue(1);
      await deleteRequestErrors(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles unexpected response', async () => {
      delRequestErrors.mockResolvedValue(undefined);
      await deleteRequestErrors(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles errors', async () => {
      requestErrorsByIds.mockImplementation(() => {
        throw new Error();
      });
      await deleteRequestErrors(request, mockResponse);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
