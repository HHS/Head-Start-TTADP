import { getGrantee } from './handlers';
import { granteeByIdAndRegion } from '../../services/grantee';

jest.mock('../../services/grantee', () => ({
  granteeByIdAndRegion: jest.fn(),
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
    };
    granteeByIdAndRegion.mockResolvedValue(granteeWhere);
    await getGrantee(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(granteeWhere);
  });

  it('returns a 404 when a grantee can\'t be found', async () => {
    const req = {
      params: {
        granteeId: 14565,
      },
    };
    granteeByIdAndRegion.mockResolvedValue(null);
    await getGrantee(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('returns a 500 on error', async () => {
    const req = {};
    await getGrantee(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(500);
  });
});
