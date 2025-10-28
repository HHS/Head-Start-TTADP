import { getRecipientSpotLight } from './handlers';
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import { getUserReadRegions } from '../../services/accessValidation';
import handleErrors from '../../lib/apiErrorHandler';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';

jest.mock('../../scopes');
jest.mock('../../services/currentUser');
jest.mock('../../services/accessValidation');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../services/recipientSpotlight');

const namespace = 'SERVICE:RECIPIENT_SPOTLIGHT';

describe('recipientSpotlight handlers', () => {
  describe('getRecipientSpotLight', () => {
    let req;
    let res;
    const mockUserId = 123;
    const mockUserRegions = [1, 9];
    const mockScopes = { someScope: 'value' };
    const mockRecipientSpotlightData = {
      indicators: [{ id: 1, name: 'Indicator 1' }],
      count: 1,
    };

    beforeEach(() => {
      req = {
        query: {
          recipientId: '456',
          regionId: '1',
          sortBy: 'name',
          direction: 'asc',
          offset: '0',
        },
      };

      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
      };

      currentUserId.mockResolvedValue(mockUserId);
      getUserReadRegions.mockResolvedValue(mockUserRegions);
      filtersToScopes.mockResolvedValue({ grant: mockScopes });
      getRecipientSpotlightIndicators.mockResolvedValue(mockRecipientSpotlightData);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call all required services with correct parameters', async () => {
      await getRecipientSpotLight(req, res);

      expect(currentUserId).toHaveBeenCalledWith(req, res);
      expect(getUserReadRegions).toHaveBeenCalledWith(mockUserId);
      expect(filtersToScopes).toHaveBeenCalledWith(
        req.query,
        { userId: mockUserId },
      );
      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        '456',
        '1',
        mockScopes,
        'name',
        'asc',
        '0',
        mockUserRegions,
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should work with optional recipientId and regionId params omitted', async () => {
      req.query = {
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        undefined,
        undefined,
        mockScopes,
        'name',
        'asc',
        '0',
        mockUserRegions,
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should return 404 if no spotlight data is returned', async () => {
      getRecipientSpotlightIndicators.mockResolvedValue(null);

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(404);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call handleErrors when an error occurs', async () => {
      const error = new Error('Test error');
      getRecipientSpotlightIndicators.mockRejectedValue(error);

      await getRecipientSpotLight(req, res);

      expect(handleErrors).toHaveBeenCalledWith(
        req,
        res,
        error,
        { namespace },
      );
    });

    it('should pass different sort and direction parameters correctly', async () => {
      req.query = {
        recipientId: '456',
        regionId: '1',
        sortBy: 'date',
        direction: 'desc',
        offset: '10',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        '456',
        '1',
        mockScopes,
        'date',
        'desc',
        '10',
        mockUserRegions,
      );
    });

    it('should handle missing sort parameters', async () => {
      req.query = {
        recipientId: '456',
        regionId: '1',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        '456',
        '1',
        mockScopes,
        undefined,
        undefined,
        '0',
        mockUserRegions,
      );
    });
  });
});
