import { INTERNAL_SERVER_ERROR } from 'http-codes';
import { getGrantee } from './handlers';
import { granteeByScopes } from '../../services/grantee';

jest.mock('../../services/grantee', () => ({
  granteeByScopes: jest.fn(),
}));

describe('getGrantee', () => {
  const granteeWhere = { name: 'Mr Thaddeus Q Grantee' };

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('retrieves a grantee', async () => {
    const req = {
      params: {
        granteeId: 100000,
      },
      query: {
        'region.in': 1,
        widgetType: 'grant',
      },
    };
    granteeByScopes.mockResolvedValue(granteeWhere);
    await getGrantee(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(granteeWhere);
  });

  it('returns a 404 when a grantee can\'t be found', async () => {
    const req = {
      params: {
        granteeId: 14565,
      },
      query: {
        'region.in': 1,
        widgetType: 'grant',
      },
    };
    granteeByScopes.mockResolvedValue(null);
    await getGrantee(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('returns a 500 on error', async () => {
    const req = {};
    await getGrantee(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});
