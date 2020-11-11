import Sequelize from 'sequelize';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import db, { RequestErrors } from '../models';
import handleErrors, { handleUnexpectedErrorInCatchBlock } from './apiErrorHandler';

const mockUser = {
  id: 47,
  name: 'Joe Green',
  title: null,
  phoneNumber: '555-555-554',
  hsesUserId: '33',
  email: 'test@test.com',
  homeRegionId: 1,
  permissions: [],
};
const mockSession = jest.fn();
mockSession.userId = mockUser.id;
const mockRequest = {
  path: '/api/user',
  method: 'PUT',
  session: mockSession,
  body: mockUser,
};

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockSequelizeError = new Sequelize.Error('Not all ok here');

const mockLogContext = {
  namespace: 'TEST',
};

describe('apiErrorHandler', () => {
  beforeEach(async () => {
    await RequestErrors.destroy({ where: {} });
  });
  afterAll(async () => {
    await RequestErrors.destroy({ where: {} });
    db.sequelize.close();
  });

  it('handles a sequelize error', async () => {
    await handleErrors(mockRequest, mockResponse, mockSequelizeError, mockLogContext);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).not.toBe(0);
  });

  it('handles a generic error', async () => {
    const mockGenericError = new Error('Unknown error');
    await handleErrors(mockRequest, mockResponse, mockGenericError, mockLogContext);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).toBe(0);
  });

  it('can handle unexpected error in catch block', async () => {
    const mockUnexpectedErr = new Error('Unexpected error');
    handleUnexpectedErrorInCatchBlock(mockRequest, mockResponse, mockUnexpectedErr, mockLogContext);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);

    const requestErrors = await RequestErrors.findAll();

    expect(requestErrors.length).toBe(0);
  });
});
