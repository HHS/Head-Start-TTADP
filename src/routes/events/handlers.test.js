import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db from '../../models';
import {
  getHandler,
  createHandler,
  updateHandler,
  deleteHandler,
  getByStatus,
} from './handlers';
import {
  createEvent,
  findEventsByCollaboratorId,
  findEventById,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByRegionId,
  updateEvent,
  findEventsByStatus,
} from '../../services/event';
import EventReport from '../../policies/event';

jest.mock('../../policies/event');

jest.mock('../../services/event', () => ({
  createEvent: jest.fn(),
  findEventsByCollaboratorId: jest.fn(),
  findEventById: jest.fn(),
  findEventsByOwnerId: jest.fn(),
  findEventsByPocId: jest.fn(),
  findEventsByRegionId: jest.fn(),
  updateEvent: jest.fn(),
  destroyEvent: jest.fn(),
  findEventsByStatus: jest.fn(),
}));

const mockEvent = {
  id: 99_999,
  ownerId: 99_999,
  pocIds: [99_999],
  regionId: 99_999,
  collaboratorIds: [99_998, 99_999],
  data: {
    status: 'not-started',
  },
};

describe('event handlers', () => {
  const mockResponse = {
    send: jest.fn(),
    status: jest.fn(() => ({
      send: jest.fn(),
      end: jest.fn(),
    })),
    sendStatus: jest.fn(),
  };

  beforeEach(() => {
    mockResponse.status.mockClear();
    mockResponse.send.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll((async () => {
    await db.sequelize.close();
  }));

  describe('getHandler', () => {
    it('returns the event', async () => {
      findEventById.mockResolvedValueOnce(mockEvent);
      EventReport.mockImplementationOnce(() => ({
        canRead: () => true,
      }));
      await getHandler({ params: { eventId: 99_999 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('400 when no params', async () => {
      await getHandler({ params: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('404 when not found by eventId', async () => {
      findEventById.mockResolvedValueOnce(null);
      await getHandler({ params: { eventId: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by regionId', async () => {
      findEventsByRegionId.mockResolvedValueOnce(null);
      await getHandler({ params: { regionId: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by ownerId', async () => {
      findEventsByOwnerId.mockResolvedValueOnce(null);
      await getHandler({ params: { ownerId: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by pocIds', async () => {
      findEventsByPocId.mockResolvedValueOnce(null);
      await getHandler({ params: { pocIds: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by collaboratorId', async () => {
      findEventsByCollaboratorId.mockResolvedValueOnce(null);
      await getHandler({ params: { collaboratorId: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when the user cannot read the event', async () => {
      EventReport.mockImplementationOnce(() => ({
        canRead: () => false,
        isPoc: () => false,
      }));
      findEventById.mockResolvedValueOnce(mockEvent);
      await getHandler({ params: { eventId: 1 } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('createHandler', () => {
    const mockRequest = {
      session: {
        userId: 1,
      },
      body: {
        ownerId: 99_999,
        pocIds: [99_999],
        collaboratorIds: [99_998, 99_999],
        regionId: 99_999,
        data: {},
      },
    };

    it('returns the event', async () => {
      EventReport.mockImplementationOnce(() => ({
        canWriteInRegion: () => true,
      }));
      createEvent.mockResolvedValueOnce(mockEvent);
      await createHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when no body', async () => {
      await createHandler({ body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateHandler', () => {
    const mockRequest = {
      session: {
        userId: 1,
      },
      params: {
        eventId: 99_999,
      },
      body: {
        ownerId: 99_999,
        pocIds: [99_999],
        collaboratorIds: [99_998, 99_999],
        regionId: 99_999,
        data: {},
      },
    };

    it('returns the event', async () => {
      EventReport.mockImplementationOnce(() => ({
        canEditEvent: () => true,
      }));
      updateEvent.mockResolvedValueOnce(mockEvent);
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when no body', async () => {
      await updateHandler({ params: { eventId: 99_999 }, body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('owners can update status to complete', async () => {
      EventReport.mockImplementationOnce(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => true,
      }));
      updateEvent.mockResolvedValueOnce(mockEvent);
      await updateHandler({
        ...mockRequest,
        body: {
          ownerId: 99_999,
          pocIds: [99_999],
          collaboratorIds: [99_998, 99_999],
          regionId: 99_999,
          data: {
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          },
        },
      }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('others cannot update status to complete', async () => {
      EventReport.mockImplementationOnce(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => false,
      }));
      updateEvent.mockResolvedValueOnce(mockEvent);
      await updateHandler({
        ...mockRequest,
        body: {
          ownerId: 99_998,
          pocIds: [99_999],
          collaboratorIds: [99_998, 99_999],
          regionId: 99_999,
          data: {
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          },
        },
      }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('owner can update status to suspended', async () => {
      EventReport.mockImplementationOnce(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => true,
      }));
      updateEvent.mockResolvedValueOnce(mockEvent);
      await updateHandler({
        ...mockRequest,
        body: {
          ownerId: 99_999,
          pocIds: [99_999],
          collaboratorIds: [99_998, 99_999],
          regionId: 99_999,
          data: {
            status: TRAINING_REPORT_STATUSES.SUSPENDED,
          },
        },
      }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('owner cannot update status to suspended', async () => {
      EventReport.mockImplementationOnce(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => false,
      }));
      updateEvent.mockResolvedValueOnce(mockEvent);
      await updateHandler({
        ...mockRequest,
        body: {
          ownerId: 99_998,
          pocIds: [99_999],
          collaboratorIds: [99_998, 99_999],
          regionId: 99_999,
          data: {
            status: TRAINING_REPORT_STATUSES.SUSPENDED,
          },
        },
      }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteHandler', () => {
    it('works', async () => {
      EventReport.mockImplementationOnce(() => ({
        canDelete: () => true,
      }));
      findEventById.mockResolvedValueOnce(mockEvent);
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id } },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
    it('returns 404 when no event', async () => {
      findEventById.mockResolvedValueOnce(null);
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id } },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when user can\'t delete', async () => {
      EventReport.mockImplementationOnce(() => ({
        canDelete: () => false,
      }));
      findEventById.mockResolvedValueOnce(mockEvent);
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id } },
        mockResponse,
      );
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('handles errors', async () => {
      findEventById.mockRejectedValueOnce(new Error('error'));
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id }, query: {} },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getByStatus', () => {
    it('works', async () => {
      EventReport.mockImplementationOnce(() => ({
        isAdmin: () => false,
      }));
      findEventsByStatus.mockResolvedValueOnce([mockEvent]);
      await getByStatus(
        {
          session: { userId: 1 },
          params: { status: 'not-started' },
          query: { regionId: 99_999 },
        },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
    it('handles errors', async () => {
      EventReport.mockImplementationOnce(() => ({
        isAdmin: () => false,
      }));
      findEventsByStatus.mockRejectedValueOnce(new Error('error'));
      await getByStatus(
        {
          session: { userId: 1 },
          params: { status: 'not-started' },
          query: { regionId: 99_999 },
        },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
