import db, { Grantee } from '../../models';
import { getGrantee } from './handlers';
import { granteeByIdAndRegion } from '../../services/grantee';

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

  afterAll(async () => {
    await Grantee.destroy({
      where: granteeWhere,
    });

    await db.sequelize.close();
  });
  it('retrieves a grantee', async () => {
    await Grantee.create(granteeWhere);
    const grantee = await Grantee.findOne({ where: granteeWhere });
    const req = {
      params: {
        granteeId: grantee.id,
      },
    };
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
