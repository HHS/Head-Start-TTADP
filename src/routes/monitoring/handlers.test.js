import { checkRecipientAccessAndExistence } from '../utils';
import handleErrors from '../../lib/apiErrorHandler';
import { classScore, monitoringData } from '../../services/monitoring';
import { getMonitoringData, getClassScore } from './handlers';

jest.mock('../utils');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../services/monitoring');

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
    expect(monitoringData).toHaveBeenCalledWith({ recipientId: 1, regionId: 2, grantNumber: '01' });
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

    expect(handleErrors).toHaveBeenCalledWith(req, res, error, { namespace: 'SERVICE:MONITORING' });
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

    expect(handleErrors).toHaveBeenCalledWith(req, res, error, { namespace: 'SERVICE:MONITORING' });
  });
});
