import {
  getCDIGrants,
  assignRegionGranteeToCDIGrant,
} from './grant';
import { cdiGrants, grantById, assignCDIGrant } from '../../services/grant';
import Grant from '../../policies/grant';

jest.mock('../../services/grant', () => ({
  cdiGrants: jest.fn(),
  grantById: jest.fn(),
  assignCDIGrant: jest.fn(),
}));

jest.mock('../../policies/grant');
jest.mock('../../lib/apiErrorHandler');

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
  query: {},
};

describe('grant routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCDIGrants', () => {
    it('returns grants', async () => {
      const grants = [{ id: 1 }];
      cdiGrants.mockResolvedValue(grants);
      await getCDIGrants(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(grants);
    });
  });

  describe('assignRegionGranteeToCDIGrant', () => {
    it('returns the updated grant', async () => {
      const grant = { id: 1 };
      const updatedGrant = { regionId: 2, granteeId: 3 };
      grantById.mockResolvedValue(grant);
      assignCDIGrant.mockResolvedValue(grant);
      Grant.mockImplementationOnce(() => ({
        canAssignRegionAndGrantee: () => true,
      }));
      await assignRegionGranteeToCDIGrant({
        ...mockRequest,
        body: updatedGrant,
        params: { grantId: 1 },
      }, mockResponse);

      expect(assignCDIGrant).toHaveBeenCalledWith(grant, 2, 3);
      expect(mockResponse.json).toHaveBeenCalledWith(grant);
    });

    it('returns 409 if grant cannot be assigned region and grantee', async () => {
      const updatedGrant = { regionId: 2, granteeId: 3 };
      Grant.mockImplementationOnce(() => ({
        canAssignRegionAndGrantee: () => false,
      }));
      await assignRegionGranteeToCDIGrant({
        ...mockRequest,
        body: updatedGrant,
        params: { grantId: 1 },
      }, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(409);
    });
  });
});
