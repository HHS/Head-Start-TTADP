import { EventReportPilot, SessionReportPilot } from '../../models';
import { createSession } from '../../services/sessionReports';
import {
  createHandler,
  deleteHandler,
  getHandler,
  updateHandler,
} from './handlers';

describe('training report handlers', () => {
  beforeAll(async () => {
    await EventReportPilot.create({
      id: 99_998,
      ownerId: 99_998,
      pocId: 99_998,
      regionId: 99_998,
      collaboratorIds: [99_998],
      data: {},
    });

    await SessionReportPilot.create({
      id: 99_999,
      eventId: 99_998,
      data: {},
    });
  });

  afterAll(async () => {
    await SessionReportPilot.destroy({ where: { eventId: 99_998 } });
    await EventReportPilot.destroy({ where: { id: 99_998 } });
  });

  const mockResponse = {
    send: jest.fn(),
    status: jest.fn(() => ({
      send: jest.fn(),
      end: jest.fn(),
    })),
  };

  describe('getHandler', () => {
    it('returns the tr', async () => {
      await getHandler({ params: { id: 99_999 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when not found by id', async () => {
      await getHandler({ params: { id: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by eventId', async () => {
      await getHandler({ params: { eventId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createHandler', () => {
    const mockRequest = {
      body: {
        eventId: 99_998,
        data: {},
      },
    };

    it('returns the tr', async () => {
      await createHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when there is no body', async () => {
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
      params: { id: 99_999 },
      body: {
        data: {},
      },
    };

    it('returns the tr', async () => {
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when there is no body', async () => {
      await updateHandler({ body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 when fields are missing', async () => {
      await updateHandler({ body: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteHandler', () => {
    it('returns 200', async () => {
      const created = await createSession({ eventId: 99_998, data: {} });
      await deleteHandler({ params: { id: created.id } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
