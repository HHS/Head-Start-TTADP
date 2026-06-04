import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  classScore,
  monitoringData,
  ttaByCitations,
  ttaByReviews,
} from '../../services/monitoring';
import { monitoringTtaCsvGenerator } from '../../widgets/monitoring/monitoringTta';
import { checkRecipientAccessAndExistence } from '../utils';
import { onlyAllowedKeys } from '../widgets/utils';
import {
  getClassScore,
  getMonitoringData,
  getMonitoringRelatedTtaCsv,
  getTtaByCitation,
  getTtaByReview,
} from './handlers';

jest.mock('../utils');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../services/monitoring');
jest.mock('../../services/currentUser');
jest.mock('../../services/accessValidation');
jest.mock('../../scopes');
jest.mock('../widgets/utils');
jest.mock('../../widgets/monitoring/monitoringTta');

// Mock the Stringifier class from csv-stringify so we can inspect stream interactions
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

describe('monintoring handlers', () => {
  describe('getMonitoringData', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
          grantNumber: '01',
        },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should call checkRecipientAccessAndExistence and monitoringData with correct arguments', async () => {
      await getMonitoringData(req, res);

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res);
      expect(monitoringData).toHaveBeenCalledWith({
        recipientId: 1,
        regionId: 2,
        grantNumber: '01',
      });
    });

    it('should call res.status with 200 and res.json with the data returned by monitoringData', async () => {
      const data = { foo: 'bar' };
      monitoringData.mockResolvedValue(data);

      await getMonitoringData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error');
      monitoringData.mockRejectedValue(error);

      await getMonitoringData(req, res);

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });
  });

  describe('getTtaByReview', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
        },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should call checkRecipientAccessAndExistence and classScore with correct arguments', async () => {
      await getTtaByReview(req, res);

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res);
      expect(ttaByReviews).toHaveBeenCalledWith(1, 2);
    });

    it('should call res.status with 200 and res.json with the data returned by classScore', async () => {
      const data = { foo: 'bar' };
      ttaByReviews.mockResolvedValue(data);

      await getTtaByReview(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error');
      ttaByReviews.mockRejectedValue(error);

      await getTtaByReview(req, res);

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });
  });

  describe('getTtaByCitation', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
        },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should call checkRecipientAccessAndExistence and classScore with correct arguments', async () => {
      await getTtaByCitation(req, res);

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res);
      expect(ttaByCitations).toHaveBeenCalledWith(1, 2);
    });

    it('should call res.status with 200 and res.json with the data returned by classScore', async () => {
      const data = { foo: 'bar' };
      ttaByCitations.mockResolvedValue(data);

      await getTtaByCitation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error');
      ttaByCitations.mockRejectedValue(error);

      await getTtaByCitation(req, res);

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });
  });
  describe('getClassScore', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        params: {
          recipientId: '1',
          regionId: '2',
          grantNumber: '01',
        },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should call checkRecipientAccessAndExistence and classScore with correct arguments', async () => {
      await getClassScore(req, res);

      expect(checkRecipientAccessAndExistence).toHaveBeenCalledWith(req, res);
      expect(classScore).toHaveBeenCalledWith({ recipientId: 1, regionId: 2, grantNumber: '01' });
    });

    it('should call res.status with 200 and res.json with the data returned by classScore', async () => {
      const data = { foo: 'bar' };
      classScore.mockResolvedValue(data);

      await getClassScore(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('should call handleErrors if an error is thrown', async () => {
      const error = new Error('Test error');
      classScore.mockRejectedValue(error);

      await getClassScore(req, res);

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });
  });

  describe('getMonitoringRelatedTtaCsv', () => {
    let req;
    let res;

    // Helper to make monitoringTtaCsvGenerator yield a specific set of rows
    const mockGeneratorRows = (rows) => {
      monitoringTtaCsvGenerator.mockImplementation(async function* () {
        for (const row of rows) {
          yield row;
        }
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();

      req = {
        query: { region: '1' },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        attachment: jest.fn(),
        headersSent: false,
      };

      currentUserId.mockResolvedValue(42);
      setReadRegions.mockResolvedValue({ region: '1' });
      filtersToScopes.mockResolvedValue({ grant: {} });
      onlyAllowedKeys.mockReturnValue({ region: '1' });
      mockGeneratorRows([]);
    });

    it('calls the dependency chain correctly', async () => {
      const userId = 42;
      const query = { region: '1' };
      const scopes = { grant: {} };
      const filteredQuery = { region: '1' };

      currentUserId.mockResolvedValue(userId);
      setReadRegions.mockResolvedValue(query);
      filtersToScopes.mockResolvedValue(scopes);
      onlyAllowedKeys.mockReturnValue(filteredQuery);

      await getMonitoringRelatedTtaCsv(req, res);

      expect(currentUserId).toHaveBeenCalledWith(req, res);
      expect(setReadRegions).toHaveBeenCalledWith(req.query, userId);
      expect(filtersToScopes).toHaveBeenCalledWith(query, { grant: { subset: true }, userId });
      expect(onlyAllowedKeys).toHaveBeenCalledWith(query);
      expect(monitoringTtaCsvGenerator).toHaveBeenCalledWith(scopes, filteredQuery);
    });

    it('sets attachment header and pipes stringifier to res', async () => {
      await getMonitoringRelatedTtaCsv(req, res);

      expect(res.attachment).toHaveBeenCalledWith('monitoring-related-tta.csv');
      expect(mockStringifierInstance.pipe).toHaveBeenCalledWith(res);
      expect(mockStringifierInstance.end).toHaveBeenCalled();
    });

    it('writes each yielded row to the stringifier', async () => {
      const rows = [
        {
          recipientName: 'Test Recipient',
          citation: '1302.12',
          status: 'Active',
          findingType: 'Deficiency',
          category: 'Health',
          grantNumbers: '01CH123456',
          lastTTADate: '2024-01-01',
        },
      ];
      mockGeneratorRows(rows);

      await getMonitoringRelatedTtaCsv(req, res);

      expect(mockStringifierInstance.write).toHaveBeenCalledWith(rows[0]);
      expect(mockStringifierInstance.end).toHaveBeenCalled();
    });

    it('calls handleErrors if setup (pre-stream) throws', async () => {
      const error = new Error('scope error');
      filtersToScopes.mockRejectedValue(error);

      await getMonitoringRelatedTtaCsv(req, res);

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });

    it('destroys the stringifier and calls handleErrors if the generator throws before headers sent', async () => {
      const error = new Error('DB error');
      monitoringTtaCsvGenerator.mockImplementation(async function* () {
        yield;
        throw error;
      });

      await getMonitoringRelatedTtaCsv(req, res);

      expect(mockStringifierInstance.destroy).toHaveBeenCalledWith(error);
      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });

    it('destroys the stringifier but does not call handleErrors if headers already sent', async () => {
      const error = new Error('mid-stream DB error');
      monitoringTtaCsvGenerator.mockImplementation(async function* () {
        yield;
        throw error;
      });
      res.headersSent = true;

      await getMonitoringRelatedTtaCsv(req, res);

      expect(mockStringifierInstance.destroy).toHaveBeenCalledWith(error);
      expect(handleErrors).not.toHaveBeenCalled();
    });
  });
});
