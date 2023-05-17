import { getHandler, createHandler, updateHandler } from './handlers';
import { EventReportPilot } from '../../models';

describe('event handlers', () => {
  beforeAll(async () => {
    await EventReportPilot.create({
      id: 99_999,
      ownerId: 99_999,
      pocId: 99_999,
      regionId: 99_999,
      collaboratorIds: [99_998, 99_999],
      data: {},
    });
  });

  afterAll(async () => {
    await EventReportPilot.destroy({ where: { id: 99_999 } });
  });

  describe('getHandler', () => {
    const mockResponse = {
      send: jest.fn(),
      status: jest.fn(() => ({
        send: jest.fn(),
        end: jest.fn(),
      })),
    };

    it('returns the event', async () => {
      await getHandler({ params: { eventId: 99_999 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalled();
    });

    it('throws an error when not found by eventId', async () => {
      await getHandler({ params: { eventId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by regionId', async () => {
      await getHandler({ params: { regionId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by ownerId', async () => {
      await getHandler({ params: { ownerId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by pocId', async () => {
      await getHandler({ params: { pocId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by collaboratorId', async () => {
      await getHandler({ params: { collaboratorId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createHandler', () => {
    const mockRequest = {
      body: {
        ownerId: 99_999,
        pocId: 99_999,
        collaboratorIds: [99_998, 99_999],
        regionId: 99_999,
        data: {},
      },
    };
    const mockResponse = {
      send: jest.fn(),
      status: jest.fn(() => ({
        send: jest.fn(),
        end: jest.fn(),
      })),
    };

    it('returns the event', async () => {
      await createHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when no body', async () => {
      await createHandler({ body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 when fields are missing', async () => {
      await createHandler({ body: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateHandler', () => {
    const mockRequest = {
      params: {
        eventId: 99_999,
      },
      body: {
        ownerId: 99_999,
        pocId: 99_999,
        collaboratorIds: [99_998, 99_999],
        regionId: 99_999,
        data: {},
      },
    };
    const mockResponse = {
      send: jest.fn(),
      status: jest.fn(() => ({
        send: jest.fn(),
        end: jest.fn(),
      })),
    };

    it('returns the event', async () => {
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when no body', async () => {
      await updateHandler({ params: { eventId: 99_999 }, body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 when fields are missing', async () => {
      await updateHandler({ params: { eventId: 99_999 }, body: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
