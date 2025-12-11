import { getRecipientSpotLight } from './handlers';
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import handleErrors from '../../lib/apiErrorHandler';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';

jest.mock('../../scopes');
jest.mock('../../services/currentUser');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../services/recipientSpotlight');

const namespace = 'SERVICE:RECIPIENT_SPOTLIGHT';

describe('recipientSpotlight handlers', () => {
  describe('getRecipientSpotLight', () => {
    let req;
    let res;
    const mockUserId = 123;
    const mockScopes = { someScope: 'value' };
    const mockRecipientSpotlightData = {
      recipients: [{ id: 1, name: 'Indicator 1' }],
      overview: {
        numRecipients: '0',
        totalRecipients: '0',
        recipientPercentage: '0%',
      },
    };

    beforeEach(() => {
      req = {
        query: {
          'recipientId.in': '456',
          'region.in': '1',
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
      filtersToScopes.mockResolvedValue({ grant: mockScopes });
      getRecipientSpotlightIndicators.mockResolvedValue(mockRecipientSpotlightData);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call all required services with correct parameters', async () => {
      await getRecipientSpotLight(req, res);

      expect(currentUserId).toHaveBeenCalledWith(req, res);
      expect(filtersToScopes).toHaveBeenCalledWith(
        req.query,
        { userId: mockUserId },
      );
      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'name',
        'asc',
        '0',
        undefined,
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
        mockScopes,
        'name',
        'asc',
        '0',
        undefined,
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
        'recipientId.in': '456',
        'region.in': '1',
        sortBy: 'date',
        direction: 'desc',
        offset: '10',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'date',
        'desc',
        '10',
        undefined,
      );
    });

    it('should handle missing sort parameters', async () => {
      req.query = {
        'recipientId.in': '456',
        'region.in': '1',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        undefined,
        undefined,
        '0',
        undefined,
      );
    });
  });
});
