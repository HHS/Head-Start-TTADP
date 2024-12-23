import db from '../../models';
import {
  allCourses,
  getCourseUrlWidgetDataWithCache,
  getCourseById,
  updateCourseById,
  createCourseByName,
  courseAuthorization,
  deleteCourseById,
} from './handlers';
import {
  getAllCourses,
  getCourseById as getById,
  createCourseByName as createCourse,
} from '../../services/course';
import handleErrors from '../../lib/apiErrorHandler';
import { getUserReadRegions } from '../../services/accessValidation';
import { getCourseUrlWidgetData } from '../../services/dashboards/course';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';

jest.mock('../../services/course');
jest.mock('../../lib/apiErrorHandler');

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

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

  describe('courseAuthorization', () => {
    it('sends a  403', async () => {
      const req = {
        session: { userId: 1 },
        params: { id: 2 },
      };
      userById.mockResolvedValue({ id: 2, permissions: [] });
      const { course, isAuthorized } = await courseAuthorization(req, mockResponse);
      expect(isAuthorized).toBe(false);
      expect(course).toBeNull();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('sends a 404', async () => {
      const req = {
        session: { userId: 1 },
        params: { id: 2 },
      };
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      getById.mockResolvedValue(null);
      const { course, isAuthorized } = await courseAuthorization(req, mockResponse);
      expect(isAuthorized).toBe(false);
      expect(course).toBeNull();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('auths new course', async () => {
      const req = {
        session: { userId: 1 },
        params: { id: 2 },
      };
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      const { course, isAuthorized } = await courseAuthorization(req, mockResponse, true);
      expect(isAuthorized).toBe(true);
      expect(course).toBeNull();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('returns course and authorization', async () => {
      const req = {
        session: { userId: 1 },
        params: { id: 2 },
      };
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      getById.mockResolvedValue({ id: 1 });
      const { course, isAuthorized } = await courseAuthorization(req, mockResponse);
      expect(isAuthorized).toBe(true);
      expect(course).toStrictEqual({ id: 1 });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

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

    it('handles errors', async () => {
      getById.mockRejectedValue(new Error('Test error'));
      const req = {
        params: { id: 1 },
      };
      await getCourseById(req, mockResponse);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('updateCourseById', () => {
    it('should update a course by id', async () => {
      const course = {
        id: 1,
        name: 'Test Course 1',
        update: jest.fn(),
        destroy: jest.fn(),
      };
      const newCourse = { id: 2, name: 'Test Course 2' };
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });

      getById.mockResolvedValue(course);
      createCourse.mockResolvedValue(newCourse);

      const req = {
        session: { userId: 1 },
        params: { id: 1 },
        body: { name: 'Updated Course' },
      };

      await updateCourseById(req, mockResponse);

      expect(course.update).toHaveBeenCalledWith({ mapsTo: newCourse.id });
      expect(course.destroy).toHaveBeenCalled();
    });

    it('handles unauthorized', async () => {
      const course = {
        id: 1,
        name: 'Test Course 1',
        update: jest.fn(),
        destroy: jest.fn(),
      };
      const newCourse = { id: 2, name: 'Test Course 2' };

      getById.mockResolvedValue(course);
      createCourse.mockResolvedValue(newCourse);
      userById.mockResolvedValue({ id: 2, permissions: [] });
      const req = {
        session: { userId: 1 },
        params: { id: 1 },
        body: { name: 'Updated Course' },
      };

      await updateCourseById(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(course.update).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const course = {
        id: 1,
        name: 'Test Course 1',
        update: jest.fn(),
        destroy: jest.fn(),
      };

      getById.mockResolvedValue(course);
      createCourse.mockRejectedValue(new Error('Test error'));
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      const req = {
        session: { userId: 1 },
        params: { id: 1 },
        body: { name: 'Updated Course' },
      };

      await updateCourseById(req, mockResponse);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('createCourseByName', () => {
    it('should create a course by name', async () => {
      const course = { id: 1, name: 'Test Course' };
      createCourse.mockResolvedValue(course);
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      const req = {
        session: { userId: 1 },
        body: { name: 'Test Course' },
      };
      await createCourseByName(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(course);
    });
    it('handles unauthorized', async () => {
      const course = { id: 1, name: 'Test Course' };
      createCourse.mockResolvedValue(course);
      userById.mockResolvedValue({
        id: 2,
        permissions: [],
      });
      const req = {
        session: { userId: 1 },
        body: { name: 'Test Course' },
      };
      await createCourseByName(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
    it('handles errors', async () => {
      createCourse.mockRejectedValue(new Error('Test error'));
      userById.mockResolvedValue({
        id: 2,
        permissions: [
          {
            regionId: 14,
            scopeId: SCOPES.ADMIN,
          },
        ],
      });
      const req = {
        session: { userId: 1 },
        body: { name: 'Test Course' },
      };
      await createCourseByName(req, mockResponse);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('deleteCourseById', () => {
    it('should delete a course by id', async () => {
      const course = { id: 1, name: 'Test Course', destroy: jest.fn() };
      getById.mockResolvedValue(course);
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      const req = {
        session: { userId: 1 },
        params: { id: 1 },
      };
      await deleteCourseById(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(course.destroy).toHaveBeenCalled();
    });
    it('handles unauthorized', async () => {
      const course = { id: 1, name: 'Test Course', destroy: jest.fn() };
      getById.mockResolvedValue(course);
      userById.mockResolvedValue({
        id: 2,
        permissions: [],
      });
      const req = {
        session: { userId: 1 },
        params: { id: 1 },
      };
      await deleteCourseById(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(course.destroy).not.toHaveBeenCalled();
    });
    it('handles errors', async () => {
      const course = {
        id: 1,
        name: 'Test Course',
        destroy: jest.fn(() => {
          throw new Error('Test error');
        }),
      };
      getById.mockResolvedValue(course);
      userById.mockResolvedValue({
        id: 2,
        permissions: [{
          regionId: 14,
          scopeId: SCOPES.ADMIN,
        }],
      });
      const req = {
        session: { userId: 1 },
        params: { id: 1 },
      };
      await deleteCourseById(req, mockResponse);
      expect(handleErrors).toHaveBeenCalled();
      expect(course.destroy).toHaveBeenCalled();
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
