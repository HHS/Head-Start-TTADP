import db from '../../models';
import { allCourses } from './handlers';
import { getAllCourses } from '../../services/course';
import handleErrors from '../../lib/apiErrorHandler';

jest.mock('../../services/course');
jest.mock('../../lib/apiErrorHandler');

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
    send: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
};

describe('Courses handlers', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });
  afterEach(() => jest.clearAllMocks());
  it('get all courses', async () => {
    getAllCourses.mockResolvedValue([]);
    await allCourses(mockRequest, mockResponse);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(handleErrors).not.toHaveBeenCalled();
  });
  it('handles an error', async () => {
    getAllCourses.mockRejectedValue(new Error('Test error'));
    await allCourses(mockRequest, mockResponse);
    expect(handleErrors).toHaveBeenCalled();
  });
});
