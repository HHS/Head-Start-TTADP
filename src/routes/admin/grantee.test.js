import { getGrantees } from './grantee';
import { allGrantees } from '../../services/grantee';

jest.mock('../../services/grantee', () => ({
  allGrantees: jest.fn(),
}));

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

describe('grantee routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('allGrantees', () => {
    it('returns grantees', async () => {
      const grantees = [{ id: 1 }];
      allGrantees.mockResolvedValue(grantees);
      await getGrantees(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(grantees);
    });
  });
});
