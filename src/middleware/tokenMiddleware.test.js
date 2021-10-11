import { auditLogger } from '../logger';
import { validateUserAuthForAccess } from '../services/accessValidation';
import { currentUserId, retrieveUserDetails } from '../services/currentUser';
import { unauthorized } from '../serializers/errorResponses';
import tokenMiddleware from './tokenMiddleware';

jest.mock('../logger');
jest.mock('../services/accessValidation');
jest.mock('./authMiddleware');
jest.mock('../services/currentUser');
jest.mock('../serializers/errorResponses');

describe('tokenMiddleware', () => {
  const mockRequest = jest.fn();
  const mockResponse = jest.fn();
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    mockRequest.headers = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 for an unknown token', async () => {
    mockResponse.status = jest.fn().mockReturnValue(mockResponse);
    mockResponse.json = jest.fn();

    await tokenMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    });
  });

  it('returns a 403 for a user missing SITE_ACCESS', async () => {
    currentUserId.mockReturnValue(1);
    validateUserAuthForAccess.mockResolvedValue(false);

    await tokenMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(unauthorized).toHaveBeenCalledWith(mockResponse, 'User does not have appropriate permissions to view this resource');
  });

  it('allows a good user through', async () => {
    mockRequest.headers.authorization = 'Bearer 1234';
    retrieveUserDetails.mockResolvedValue({ id: 1 });
    validateUserAuthForAccess.mockResolvedValue(true);
    mockResponse.locals = jest.fn();

    await tokenMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockResponse.locals.userId).toEqual(1);

    expect(mockNext).toHaveBeenCalled();
    expect(auditLogger.info).toHaveBeenCalledWith('User 1 making API request');
  });
});
