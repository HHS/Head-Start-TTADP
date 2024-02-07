import { getRecipients } from './recipient';
import { allRecipients } from '../../services/recipient';

jest.mock('../../services/recipient', () => ({
  allRecipients: jest.fn(),
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

describe('recipient routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('allRecipients', () => {
    it('returns recipients', async () => {
      const recipients = [{ id: 1 }];
      allRecipients.mockResolvedValue(recipients);
      await getRecipients(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(recipients);
    });
  });
});
