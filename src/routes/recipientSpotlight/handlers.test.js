import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import { getRecipientSpotlightIndicators } from '../../services/recipientSpotlight';
import { getRecipientSpotLight } from './handlers';

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
          parsedGrantId: null,
        },
      };

      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      currentUserId.mockResolvedValue(mockUserId);
      // setReadRegions returns the query with region.in filtered/defaulted
      setReadRegions.mockImplementation((query) =>
        Promise.resolve({
          ...query,
          'region.in': query['region.in'] || [1, 2, 3],
        })
      );
      filtersToScopes.mockResolvedValue(mockScopes);
      getRecipientSpotlightIndicators.mockResolvedValue(mockRecipientSpotlightData);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call all required services with correct parameters', async () => {
      await getRecipientSpotLight(req, res);

      expect(currentUserId).toHaveBeenCalledWith(req, res);
      expect(setReadRegions).toHaveBeenCalledWith(
        expect.objectContaining({ 'region.in': ['1'] }),
        mockUserId
      );
      expect(filtersToScopes).toHaveBeenCalledWith(
        expect.objectContaining({ 'region.in': ['1'] }),
        { userId: mockUserId }
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
        false
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should work with optional recipientId param omitted but region provided', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
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
        false
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

      expect(handleErrors).toHaveBeenCalledWith(req, res, error, { namespace });
    });

    it('should pass different sort and direction parameters correctly', async () => {
      req.query = {
        'recipientId.in': '456',
        'region.in': '1',
        sortBy: 'date',
        direction: 'desc',
        offset: '10',
        parsedGrantId: null,
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
        false
      );
    });

    it('should handle missing sort parameters', async () => {
      req.query = {
        'recipientId.in': '456',
        'region.in': '1',
        offset: '0',
        parsedGrantId: null,
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
        false
      );
    });

    it('should silently filter unauthorized regions via setReadRegions', async () => {
      setReadRegions.mockResolvedValue({
        'region.in': [1], // setReadRegions filters out region 5
      });

      req.query = {
        'region.in': ['1', '5'],
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

      // Should NOT return 403, instead silently filters
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
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
        false
      );
    });

    it('should default to all user read regions when no region is specified in the request', async () => {
      setReadRegions.mockResolvedValue({
        'region.in': [1, 2, 3],
      });

      req.query = {
        'recipientId.in': '456',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

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
        false
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should allow access when user requests multiple regions they have access to', async () => {
      req.query = {
        'region.in': ['1', '2'],
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should call setReadRegions with the correct userId', async () => {
      await getRecipientSpotLight(req, res);

      expect(setReadRegions).toHaveBeenCalledWith(expect.any(Object), mockUserId);
    });

    it('should handle region.in[] array notation from filtersToQueryString', async () => {
      req.query = {
        'region.in[]': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(res.sendStatus).not.toHaveBeenCalledWith(404);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
    });

    it('should still handle region.in without brackets for backward compatibility', async () => {
      req.query = {
        'region.in': '2',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(res.sendStatus).not.toHaveBeenCalledWith(404);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
    });

    it('should handle region.in[] with multiple regions', async () => {
      req.query = {
        'region.in[]': ['1', '2'],
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
      expect(res.sendStatus).not.toHaveBeenCalledWith(403);
      expect(res.sendStatus).not.toHaveBeenCalledWith(404);
      expect(getRecipientSpotlightIndicators).toHaveBeenCalled();
    });

    it('should pass priorityIndicator.nin as indicatorsToExclude', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
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
        false
      );
    });

    it('should handle priorityIndicator.nin[] array notation', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
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
        false
      );
    });

    it('should pass both indicatorsToInclude and indicatorsToExclude when both are provided', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'recipientName',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
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
        false
      );
    });

    it('should pass parsedGrantId from middleware', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: 123,
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
        false
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should pass updatedQuery (not req.query) to filtersToScopes so region filtering is applied', async () => {
      // setReadRegions filters out unauthorized region 5, keeping only region 1
      setReadRegions.mockResolvedValue({
        'region.in': [1],
      });

      req.query = {
        'region.in': ['1', '5'],
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
      };

      await getRecipientSpotLight(req, res);

      // filtersToScopes should receive the authorized region list, not the raw req.query
      expect(filtersToScopes).toHaveBeenCalledWith(expect.objectContaining({ 'region.in': [1] }), {
        userId: mockUserId,
      });
      expect(filtersToScopes).not.toHaveBeenCalledWith(
        expect.objectContaining({ 'region.in': ['1', '5'] }),
        expect.anything()
      );
    });

    it('should pass mustHaveIndicators from query params', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
        mustHaveIndicators: 'true',
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
        true
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });

    it('should pass null for parsedGrantId when middleware sets it to null', async () => {
      req.query = {
        'region.in': '1',
        sortBy: 'name',
        direction: 'asc',
        offset: '0',
        parsedGrantId: null,
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
        false
      );
      expect(res.json).toHaveBeenCalledWith(mockRecipientSpotlightData);
    });
  });

  describe('getRecipientSpotLight CSV export', () => {
    let req;
    let res;
    const mockUserId = 123;
    const mockScopes = { grant: { someScope: 'value' } };

    const csvRecipients = [
      {
        recipientId: 1,
        regionId: 1,
        recipientName: 'Recipient A',
        grantIds: ['1'],
        lastTTA: '2024-05-01',
        childIncidents: true,
        deficiency: false,
        FEI: true,
        newRecipients: false,
        newStaff: true,
        noTTA: false,
        DRS: false,
        underenrolled: true,
        indicatorCount: 4,
      },
    ];

    beforeEach(() => {
      req = {
        query: {
          'region.in': '1',
          sortBy: 'recipientName',
          direction: 'asc',
          parsedGrantId: null,
          format: 'csv',
        },
      };

      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis(),
        type: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      currentUserId.mockResolvedValue(mockUserId);
      setReadRegions.mockImplementation((query) =>
        Promise.resolve({
          ...query,
          'region.in': query['region.in'] || [1, 2, 3],
        })
      );
      filtersToScopes.mockResolvedValue(mockScopes);
      getRecipientSpotlightIndicators.mockResolvedValue({
        recipients: csvRecipients,
        count: 1,
        overview: { numRecipients: '1', totalRecipients: '1', recipientPercentage: '100%' },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('requests all rows (limit null, offset 0) for the export', async () => {
      await getRecipientSpotLight(req, res);

      expect(getRecipientSpotlightIndicators).toHaveBeenCalledWith(
        mockScopes,
        'recipientName',
        'asc',
        0, // offset
        null, // limit (all rows)
        ['1'],
        [],
        [],
        null,
        false
      );
    });

    it('sends a CSV attachment and does not call res.json', async () => {
      await getRecipientSpotLight(req, res);

      expect(res.attachment).toHaveBeenCalledWith('recipient-spotlight.csv');
      expect(res.type).toHaveBeenCalledWith('text/csv');
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('includes the expected header row and column values', async () => {
      await getRecipientSpotLight(req, res);

      const csv = res.send.mock.calls[0][0];
      // BOM prefix for Excel compatibility
      expect(csv.startsWith('\ufeff')).toBe(true);
      const [headerLine, dataLine] = csv.replace('\ufeff', '').trim().split('\n');
      expect(headerLine).toContain('Recipient name');
      expect(headerLine).toContain('Region');
      expect(headerLine).toContain('Last TTA');
      expect(headerLine).toContain('Child incidents');
      expect(headerLine).toContain('Deficiency');
      expect(headerLine).toContain('FEI');
      expect(headerLine).toContain('New recipient');
      expect(headerLine).toContain('New staff');
      expect(headerLine).toContain('No TTA');
      expect(headerLine).toContain('Underenrolled');
      // DRS must not be exported
      expect(headerLine).not.toContain('DRS');

      expect(dataLine).toContain('Recipient A');
      expect(dataLine).toContain('05/01/2024');
      // indicators rendered Yes/No
      expect(dataLine).toContain('Yes');
      expect(dataLine).toContain('No');
    });

    it('sanitizes recipient names that could be interpreted as formulas', async () => {
      getRecipientSpotlightIndicators.mockResolvedValue({
        recipients: [
          {
            ...csvRecipients[0],
            recipientName: '=SUM(A1:A2)',
          },
        ],
        count: 1,
        overview: { numRecipients: '1', totalRecipients: '1', recipientPercentage: '100%' },
      });

      await getRecipientSpotLight(req, res);

      const csv = res.send.mock.calls[0][0];
      expect(csv).toContain("'=SUM(A1:A2)");
    });

    it('renders an empty Last TTA cell when there is no last TTA date', async () => {
      getRecipientSpotlightIndicators.mockResolvedValue({
        recipients: [
          {
            ...csvRecipients[0],
            lastTTA: null,
          },
        ],
        count: 1,
        overview: { numRecipients: '1', totalRecipients: '1', recipientPercentage: '100%' },
      });

      await getRecipientSpotLight(req, res);

      const csv = res.send.mock.calls[0][0];
      expect(csv).not.toContain('05/01/2024');
    });

    it('returns 404 when no data is returned', async () => {
      getRecipientSpotlightIndicators.mockResolvedValue(null);

      await getRecipientSpotLight(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(404);
      expect(res.send).not.toHaveBeenCalled();
    });
  });
});
