import db from '../../models';
import { allTopics } from './handlers';

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
};

describe('Topic handlers', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });
  it('get all topics', async () => {
    await allTopics(mockRequest, mockResponse);
    expect(mockResponse.json).toHaveBeenCalled();
  });
});
