import { auditLogger as logger } from '../../logger';
import router, { listSheets, getSheet, route } from './ss';
import * as smartClient from 'smartsheet';

const mockSheetsList = {
  data: [
    {
      id: 1,
      name: 'PD23-24 b. Region 1',
      accessLevel: 'admin',
      permalink: 'https://example.com/sheet1',
      createdAt: '2022-01-01',
      modifiedAt: '2022-01-02'
    },
    {
      id: 2,
      name: 'PD23-24 b. Region 2',
      accessLevel: 'user',
      permalink: 'https://example.com/sheet2',
      createdAt: '2022-01-03',
      modifiedAt: '2022-01-04'
    },
    {
      id: 3,
      name: 'PD23-24 a. Region 1',
      accessLevel: 'admin',
      permalink: 'https://example.com/sheet1a',
      createdAt: '2022-01-01',
      modifiedAt: '2022-01-02'
    },
  ]
};

const mockSheetsListFiltered = {
  data: [
    {
      id: 1,
      name: 'PD23-24 b. Region 1',
      accessLevel: 'admin',
      permalink: 'https://example.com/sheet1',
      createdAt: '2022-01-01',
      modifiedAt: '2022-01-02'
    },
    {
      id: 2,
      name: 'PD23-24 b. Region 2',
      accessLevel: 'user',
      permalink: 'https://example.com/sheet2',
      createdAt: '2022-01-03',
      modifiedAt: '2022-01-04'
    }
  ]
};

jest.mock('axios');
jest.mock('smartsheet', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    sheets: {
      listSheets: jest.fn().mockImplementationOnce(() => Promise.resolve(mockSheetsList))
        .mockImplementationOnce(() => Promise.resolve(mockSheetsList))
        .mockImplementationOnce(() => Promise.resolve(undefined))
        .mockImplementationOnce(() => { throw new Error('Something went wrong') }),
      getSheet: jest.fn().mockImplementationOnce(async () => Promise.resolve({ sheetData: 'sheetData' }))
        .mockImplementationOnce(async () => Promise.resolve({ sheetData: 'sheetData' })),
    }
  }))
}));

describe('smartsheets', () => {
  let req, res;
  beforeEach(() => {
    req = {
      session: {
        userId: 1,
      },
      query: {
        pageSize: 18,
        page: 89
      },
      params: {
        sheetId: '123',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
  });

  // afterEach(() => {
  //   // jest.clearAllMocks();
  // });

  it('listSheets should return a 200 status code', async () => {
    await listSheets(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSheetsListFiltered);
    expect(smartClient.createClient.mock.results[0].value.sheets.listSheets)
      .toHaveBeenCalledWith({ queryParameters: { pageSize: 18, page: 89 } });
  });

  it('listSheets should handle default parameters', async () => {
    req = {
      session: {
        userId: 1,
      },
      query: {},
    };

    await listSheets(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSheetsListFiltered);
    expect(smartClient.createClient.mock.results[0].value.sheets.listSheets).toHaveBeenCalledWith({ queryParameters: { pageSize: 4400, page: 1 } });
  });

  it('listSheets should return a 500 status code on error', async () => {
    logger.error = jest.fn();

    await listSheets(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("UNEXPECTED ERROR - Error: Failed to list sheets"));

  });

  it('listSheets should handle an error', async () => {
    logger.error = jest.fn();

    await listSheets(req, res);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("UNEXPECTED ERROR - Error: Something went wrong"));
  });

  //   const req = {
  //     query: {
  //       pageSize: 18,
  //       page: 89
  //     }
  //   };
  //   const res = {
  //     status: jest.fn().mockReturnThis(),
  //     json: jest.fn().mockReturnThis(),
  //     end: jest.fn(),
  //   };
  //   const error = new Error('Smartsheet API error');
  //   // jest.clearAllMocks();
  //   // Create a spy and mock the implementation to reject with an error
  //   // jest.spyOn(smartsheet.createClient().sheets, 'listSheets').mockRejectedValueOnce(error);
  //   smartsheet.createClient().sheets.listSheets.mockImplementationOnce(() => Promise.reject(error));
  //   // Spy on logger.info
  //   jest.spyOn(logger, 'info').mockImplementation(() => { });

  //   await listSheets(req, res);

  //   expect(res.status).toHaveBeenCalledWith(500);
  //   expect(logger.info).toHaveBeenCalledWith(`Failed to list sheets ${error}`);
  // });
  // Successfully retrieves a sheet with a valid sheetId
  // it('should successfully retrieve a sheet with a valid sheetId', async () => {
  //   const req = { params: { sheetId: 'validSheetId' } };
  //   const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  //   const result = { sheetData: 'sheetData' };
  //   smartsheetClient.sheets.getSheet = jest.fn().mockResolvedValue(result);

  //   await getSheet(req, res);

  //   expect(smartsheetClient.sheets.getSheet).toHaveBeenCalledWith({ id: 'validSheetId' });
  //   expect(res.status).toHaveBeenCalledWith(200);
  //   expect(res.json).toHaveBeenCalledWith(result);
  // });
  // Fetching a sheet with an empty ID throws an error

  // it('should throw an error when fetching a sheet with an empty ID', async () => {
  //   const sheetId = '';
  //   const activeSheetUrl = `/api/admin/ss/sheet/${sheetId}`;
  //   fetchMock.getOnce(activeSheetUrl, { throws: new Error('Empty ID') });

  //   await expect(getSheetById(sheetId)).rejects.toThrow('Empty ID');
  // });

  // it('should log the returned sheet', async () => {
  //   const mockSheet = { id: 1, name: 'Sheet1' };
  //   const sheetId = '1';
  //   const activeSheetUrl = `/api/admin/ss/sheet/${sheetId}`;
  //   fetchMock.getOnce(activeSheetUrl, mockSheet);

  //   const consoleSpy = jest.spyOn(console, 'log');
  //   await getSheetById(sheetId);
  //   expect(consoleSpy).toHaveBeenCalledWith(mockSheet);
  // });
  it('getSheet should return a 200 status code', async () => {
    await getSheet(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sheetData: 'sheetData' });
  });

  it('getSheet should handle undefined sheetId', async () => {
    req = {
      session: {
        userId: 1,
      },
      params: {},
    };
    await getSheet(req, res);

    expect(smartClient.createClient.mock.results[0].value.sheets.getSheet).toHaveBeenCalledWith({ "id": undefined });
  });

  it('getSheet should return a 500 status code on error', async () => {
    logger.error = jest.fn();

    await getSheet(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error: Failed to get sheet: 123'));
  });

  describe('route function', () => {
    let mockRouter, mockTransactionWrapper, mockListSheets, mockGetSheet;

    beforeEach(() => {
      jest.resetModules();

      mockRouter = {
        get: jest.fn()
      };
      mockTransactionWrapper = jest.fn((fn) => fn);
      mockListSheets = jest.fn();
      mockGetSheet = jest.fn();

      jest.doMock('express', () => ({
        Router: () => mockRouter
      }));

      jest.doMock('../transactionWrapper', () => mockTransactionWrapper);
      jest.doMock('../../lib/apiErrorHandler', () => jest.fn());
      jest.doMock('../../logger', () => ({
        auditLogger: {
          error: jest.fn()
        }
      }));
    });

    it('should register two GET routes with transactionWrapper middleware when environment variable is set to app.cloud.gov domain', () => {
      const { route } = require('./ss');

      route('https://tta.app.cloud.gov');

      expect(mockRouter.get).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith('/', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/sheet/:sheetId', expect.any(Function));
    });

    it('should register two GET routes returning 403 when environment variable is not set to app.cloud.gov domain', () => {
      const { route } = require('./ss');

      route('https://tta.app.cloud.gov');

      expect(mockRouter.get).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith('/', expect.any(Function));
      expect(mockRouter.get).toHaveBeenCalledWith('/sheet/:sheetId', expect.any(Function));

      // Check the 403 status functionality
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };

      const [firstRoutePath, firstRouteHandler] = mockRouter.get.mock.calls[0];
      const [secondRoutePath, secondRouteHandler] = mockRouter.get.mock.calls[1];

      firstRouteHandler(req, res);
      secondRouteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Feature not available');
    });
  });

});