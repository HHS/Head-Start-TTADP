import db from '../../models';
import {
  allCourses,
  getCourseUrlWidgetDataWithCache,
  getCourseById,
  updateCourseById,
  createCourseByName,
} from './handlers';
import {
  getAllCourses,
  getCourseById as getById,
  createCourseByName as createCourse,
} from '../../services/course';
import handleErrors from '../../lib/apiErrorHandler';
import { getUserReadRegions } from '../../services/accessValidation';
import { getCourseUrlWidgetData } from '../../services/dashboards/course';

jest.mock('../../services/course');
jest.mock('../../lib/apiErrorHandler');

jest.mock('../../services/dashboards/course', () => ({
  getCourseUrlWidgetData: jest.fn(),
}));
jest.mock('../../services/accessValidation');

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

  describe('getCourseById', () => {
    it('should return a course by id', async () => {
      const course = { id: 1, name: 'Test Course' };
      getById.mockResolvedValue(course);
      const req = {
        params: { id: 1 },
      };
      await getCourseById(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(course);
    });
  });

  describe('updateCourseById', () => {
    it('should update a course by id', async () => {
      const course = { id: 1, name: 'Test Course', update: jest.fn() };
      getById.mockResolvedValue(course);
      const req = {
        session: { userId: 1 },
        params: { id: 1 },
        body: { name: 'Updated Course' },
      };
      await updateCourseById(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalled();
      expect(course.update).toHaveBeenCalledWith({ name: 'Updated Course' });
    });
  });

  describe('createCourseByName', () => {
    it('should create a course by name', async () => {
      const course = { id: 1, name: 'Test Course' };
      createCourse.mockResolvedValue(course);
      const req = {
        session: { userId: 1 },
        body: { name: 'Test Course' },
      };
      await createCourseByName(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(course);
    });
  });

  describe('getCourseUrlsWidgetData', () => {
    it('should return all course url widget data', async () => {
      const responseData = [
        {
          course: 'Widget Course 1',
          rollUpDate: 'Jan-21',
          count: '3',
          total: '3',
        },
      ];

      getCourseUrlWidgetData.mockResolvedValueOnce(responseData);
      getUserReadRegions.mockResolvedValueOnce([1]);
      const req = {
        session: { userId: 1 },
        query: {
          sortBy: 'id',
          direction: 'asc',
          limit: 10,
          offset: 0,
        },
      };
      const res = { json: jest.fn() };
      await getCourseUrlWidgetDataWithCache(req, res);
      expect(res.json).toHaveBeenCalledWith(responseData);
    });
  });
});
