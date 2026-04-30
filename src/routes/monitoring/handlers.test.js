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
import { monitoringTtaCsv } from '../../widgets/monitoring/monitoringTta';
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

    beforeEach(() => {
      req = {
        query: { region: '1' },
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        attachment: jest.fn(),
        send: jest.fn(),
      };

      currentUserId.mockResolvedValue(42);
      setReadRegions.mockResolvedValue({ region: '1' });
      filtersToScopes.mockResolvedValue({ grant: {} });
      onlyAllowedKeys.mockReturnValue({ region: '1' });
      monitoringTtaCsv.mockResolvedValue([]);
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
      expect(monitoringTtaCsv).toHaveBeenCalledWith(scopes, filteredQuery);
    });

    it('sends CSV with correct headers', async () => {
      monitoringTtaCsv.mockResolvedValue([
        {
          recipientName: 'Test Recipient',
          citation: '1302.12',
          status: 'Active',
          findingType: 'Deficiency',
          category: 'Health',
          grantNumbers: '01CH123456',
          lastTTADate: '2024-01-01',
        },
      ]);

      await getMonitoringRelatedTtaCsv(req, res);

      expect(res.attachment).toHaveBeenCalledWith('monitoring-related-tta.csv');
      expect(res.send).toHaveBeenCalled();

      const csvOutput = res.send.mock.calls[0][0];
      expect(csvOutput).toContain(
        '"Recipient Name","Citation","Current status","Finding type","Finding category","Grants cited","Last TTA date"'
      );
    });

    it('calls handleErrors if monitoringTtaCsv throws', async () => {
      const error = new Error('CSV error');
      monitoringTtaCsv.mockRejectedValue(error);

      await getMonitoringRelatedTtaCsv(req, res);

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, {
        namespace: 'SERVICE:MONITORING',
      });
    });
  });
});
