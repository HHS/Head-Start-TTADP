import { getRecipientSpotLight } from './handlers';
import filtersToScopes from '../../scopes';
import { currentUserId } from '../../services/currentUser';
import handleErrors from '../../lib/apiErrorHandler';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';
import { getUserReadRegions } from '../../services/accessValidation';

jest.mock('../../scopes');
jest.mock('../../services/currentUser');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../services/recipientSpotlight');
jest.mock('../../services/accessValidation');

const namespace = 'SERVICE:RECIPIENT_SPOTLIGHT';

describe('recipientSpotlight handlers', () => {
  describe('getRecipientSpotLight', () => {
    let req;
    let res;
    const mockUserId = 123;
    const mockGrantScopes = { someScope: 'value' };
    const mockScopes = { grant: mockGrantScopes };
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
        status: jest.fn().mockReturnThis(),
      };

      currentUserId.mockResolvedValue(mockUserId);
      getUserReadRegions.mockResolvedValue([1, 2, 3]); // User has access to regions 1, 2, 3
      filtersToScopes.mockResolvedValue(mockScopes);
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
        0,
        10,
        ['1'],
        [],
        [],
        null,
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should work with optional recipientId param omitted but region provided', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'name',
        'asc',
        0,
        10,
        ['1'],
        [],
        [],
        null,
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
        10,
        10,
        ['1'],
        [],
        [],
        null,
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
        0,
        10,
        ['1'],
        [],
        [],
        null,
      );
    });

    it('should return 403 FORBIDDEN when user tries to access a region they do not have permission for', async () => {
      req.query = {
        'region.in': '5', // User does not have access to region 5
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should return 403 FORBIDDEN when user tries to access multiple regions and one is unauthorized', async () => {
      req.query = {
        'region.in': ['1', '5'], // User has access to region 1 but not region 5
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should default to all user read regions when no region is specified in the request', async () => {
      req.query = {
        'recipientId.in': '456',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      // Should use all user's read regions (1, 2, 3) as strings
      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'name',
        'asc',
        0,
        10,
        ['1', '2', '3'],
        [],
        [],
        null,
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
    });

    it('should allow access when user requests multiple regions they have access to', async () => {
      req.query = {
        'region.in': ['1', '2'], // User has access to both regions 1 and 2
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should call getUserReadRegions with the correct userId', async () => {
      await getRecipientSpotLight(req, res);

      expect(getUserReadRegions).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle region.in[] array notation from filtersToQueryString', async () => {
      req.query = {
        'region.in[]': '1', // Array notation with brackets (from filtersToQueryString)
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(res.sendStatus).not.toHaveBeenCalledWith(404);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
    });

    it('should still handle region.in without brackets for backward compatibility', async () => {
      req.query = {
        'region.in': '2', // Without brackets (manual construction)
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(res.sendStatus).not.toHaveBeenCalledWith(404);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
    });

    it('should handle region.in[] with multiple regions', async () => {
      req.query = {
        'region.in[]': ['1', '2'], // Multiple regions with array notation
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(res.sendStatus).not.toHaveBeenCalledWith(404);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
    });

    it('should return 403 when region.in[] contains unauthorized region', async () => {
      req.query = {
        'region.in[]': '5', // Region 5 not in user's allowed regions [1, 2, 3]
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should pass priorityIndicator.nin as indicatorsToExclude', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        'priorityIndicator.nin': 'No TTA',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'recipientName',
        'asc',
        0,
        10,
        ['1'],
        [],
        ['No TTA'],
        null,
      );
    });

    it('should handle priorityIndicator.nin[] array notation', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        'priorityIndicator.nin[]': ['No TTA', 'Deficiency'],
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'recipientName',
        'asc',
        0,
        10,
        ['1'],
        [],
        ['No TTA', 'Deficiency'],
        null,
      );
    });

    it('should pass both indicatorsToInclude and indicatorsToExclude when both are provided', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        'priorityIndicator.in': 'New staff',
        'priorityIndicator.nin': 'No TTA',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'recipientName',
        'asc',
        0,
        10,
        ['1'],
        ['New staff'],
        ['No TTA'],
        null,
      );
    });

    it('should pass valid grantId as an integer', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        grantId: '123',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'name',
        'asc',
        0,
        10,
        ['1'],
        [],
        [],
        123,
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should return 400 when grantId is not a valid integer', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        grantId: 'invalid',
      };

      await getRecipientSpotLight(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid grantId: must be a positive integer' });
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should return 400 when grantId is a negative number', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        grantId: '-5',
      };

      await getRecipientSpotLight(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid grantId: must be a positive integer' });
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should return 400 when grantId is zero', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        grantId: '0',
      };

      await getRecipientSpotLight(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid grantId: must be a positive integer' });
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should return 400 when grantId is a decimal number', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        grantId: '123.45',
      };

      await getRecipientSpotLight(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid grantId: must be a positive integer' });
      expect(getRecipientSpotlightIndicators).not.toHaveBeenCalled();
    });

    it('should pass null for grantId when it is empty string', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        grantId: '',
      };

      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'name',
        'asc',
        0,
        10,
        ['1'],
        [],
        [],
        null,
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });
  });
});
