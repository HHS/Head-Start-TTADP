import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-codes';
import { getRecipient, searchRecipients } from './handlers';
import { granteeById, granteesByName } from '../../services/grantee';

jest.mock('../../services/grantee', () => ({
  granteeById: jest.fn(),
  granteesByName: jest.fn(),
}));

describe('getRecipient', () => {
  const recipientWhere = { name: 'Mr Thaddeus Q Recipient' };

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('retrieves a recipient', async () => {
    const req = {
      params: {
        recipientId: 100000,
      },
      query: {
        'region.in': 1,
        modelType: 'grant',
      },
    };
    granteeById.mockResolvedValue(recipientWhere);
    await getRecipient(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(recipientWhere);
  });

  it('returns a 404 when a recipient can\'t be found', async () => {
    const req = {
      params: {
        recipientId: 14565,
      },
      query: {
        'region.in': 1,
        modelType: 'grant',
      },
    };
    granteeById.mockResolvedValue(null);
    await getRecipient(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('returns a 500 on error', async () => {
    const req = {};
    await getRecipient(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('searchRecipient', () => {
  const recipientResults = [
    {
      name: 'City of Florida Mr Thaddeus Q Recipient',
    },
  ];

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('retrieves matching recipients', async () => {
    const req = {
      query: {
        s: 'City of Florida',
        'region.in': 1,
        modelType: 'grant',
        sortBy: 'name',
        direction: 'asc',
        offset: 0,
      },
    };
    granteesByName.mockResolvedValue(recipientResults);
    await searchRecipients(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(recipientResults);
  });

  it('returns a 404 when a recipient can\'t be found', async () => {
    const req = {
      query: {
        s: 'City of Florida',
        'region.in': 1,
        modelType: 'grant',
        sortBy: 'name',
        direction: 'asc',
        offset: 0,
      },
    };
    granteesByName.mockResolvedValue(null);
    await searchRecipients(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('returns a 500 on error', async () => {
    const req = {};
    await searchRecipients(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});
