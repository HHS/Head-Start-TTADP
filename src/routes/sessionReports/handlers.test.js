import db from '../../models';
import {
  createHandler,
  deleteHandler,
  getHandler,
  updateHandler,
  getParticipants,
  getGroups,
} from './handlers';
import {
  createSession,
  findSessionById,
  updateSession,
  findSessionsByEventId,
  getPossibleSessionParticipants,
} from '../../services/sessionReports';
import EventReport from '../../policies/event';
import { findEventBySmartsheetIdSuffix, findEventByDbId } from '../../services/event';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';
import { groupsByRegion } from '../../services/groups';

jest.mock('../../services/event');
jest.mock('../../policies/event');
jest.mock('../../services/sessionReports');
jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
}));
jest.mock('../../services/groups', () => ({
  groupsByRegion: jest.fn(),
}));

describe('session report handlers', () => {
  const mockEvent = {
    id: 99_998,
    ownerId: 99_998,
    pocIds: 99_998,
    regionId: 99_998,
    collaboratorIds: [99_998],
    data: {},
  };

  const mockSession = {
    id: 99_999,
    eventId: 99_998,
    data: {},
  };

  const mockResponse = {
    send: jest.fn(),
    status: jest.fn(() => ({
      send: jest.fn(),
      end: jest.fn(),
    })),
    sendStatus: jest.fn(),
    json: jest.fn(),
  };

  beforeEach(() => {
    mockResponse.status.mockClear();
    mockResponse.send.mockClear();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHandler', () => {
    it('returns the session', async () => {
      EventReport.mockImplementation(() => ({
        canEditSession: () => true,
      }));
      findSessionById.mockResolvedValue(mockSession);
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      await getHandler({ session: { userId: 1 }, params: { id: 99_999 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('returns the session by eventId', async () => {
      EventReport.mockImplementation(() => ({
        canEditSession: () => true,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      findSessionsByEventId.mockResolvedValue(mockSession);
      await getHandler({ session: { userId: 1 }, params: { eventId: 99_998 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('400 when no params', async () => {
      await getHandler({ params: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when not found by id', async () => {
      await getHandler({ params: { id: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by eventId', async () => {
      findSessionsByEventId.mockResolvedValue(null);
      await getHandler({ params: { eventId: 0 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when session is linked to a completed training event', async () => {
      const completedEventSession = {
        ...mockSession,
        event: {
          data: {
            status: 'Complete',
          },
        },
      };
      findSessionById.mockResolvedValue(completedEventSession);
      await getHandler({ session: { userId: 1 }, params: { id: 99_999 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when event is complete', async () => {
      const completedEvent = {
        ...mockEvent,
        data: {
          status: 'Complete',
        },
      };
      findEventBySmartsheetIdSuffix.mockResolvedValue(completedEvent);
      await getHandler({ session: { userId: 1 }, params: { eventId: 99_998 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getGroups', () => {
    it('returns the groups', async () => {
      // Mock userById with correct permissions.
      userById.mockResolvedValueOnce({
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
            regionId: 1,
          },
        ],
      });
      // Mock permissions.
      EventReport.mockImplementationOnce(() => ({
        canGetGroupsForEditingSession: () => true,
      }));
      // Group response.
      const groupsByRegionResponse = [{ name: 'name', id: 1 }];
      groupsByRegion.mockResolvedValueOnce(groupsByRegionResponse);

      await getGroups(
        { session: { userId: 1 }, params: { }, query: { region: 1 } },
        mockResponse,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(groupsByRegionResponse);
    });

    it('returns 403 with incorrect permissions', async () => {
      // Mock userById with correct permissions.
      userById.mockResolvedValueOnce({
        id: 1,
        permissions: [
          {
            scopeId: SCOPES.READ_TRAINING_REPORTS,
            regionId: 1,
          },
        ],
      });
      // Mock permissions.
      EventReport.mockImplementationOnce(() => ({
        canGetGroupsForEditingSession: () => false,
      }));
      await getGroups(
        { session: { userId: 1 }, params: { }, query: { region: 1 } },
        mockResponse,
      );
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('createHandler', () => {
    const mockRequest = {
      session: { userId: 1 },
      body: {
        eventId: 99_998,
        data: {},
      },
    };

    it('returns the session', async () => {
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      EventReport.mockImplementation(() => ({
        canCreateSession: () => true,
      }));
      createSession.mockResolvedValue(mockSession);
      await createHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when there is no body', async () => {
      await createHandler({ body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when eventId is not in the body', async () => {
      await createHandler({ body: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if there is no event', async () => {
      findEventBySmartsheetIdSuffix.mockResolvedValue(null);
      await createHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when permissions are inadequate', async () => {
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      EventReport.mockImplementation(() => ({
        canCreateSession: () => false,
      }));
      await createHandler(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('updateHandler', () => {
    const mockRequest = {
      session: { userId: 1 },
      params: { id: 99_999 },
      body: {
        data: {},
        eventId: 99_998,
      },
    };

    it('returns the session', async () => {
      EventReport.mockImplementation(() => ({
        canEditSession: () => true,
      }));
      findEventByDbId.mockResolvedValue(mockEvent);
      findSessionById.mockResolvedValue(mockSession);
      updateSession.mockResolvedValue(mockSession);
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('allows update for event role only', async () => {
      EventReport.mockImplementation(() => ({
        canEditSession: () => true,
      }));
      findEventByDbId.mockResolvedValue(mockEvent);
      findSessionById.mockResolvedValue(mockSession);
      updateSession.mockResolvedValue(mockSession);
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 403 if permissions are inadaquate', async () => {
      EventReport.mockImplementation(() => ({
        canEditSession: () => false,
      }));
      findEventByDbId.mockResolvedValue(mockEvent);
      findSessionById.mockResolvedValue(mockSession);
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('returns 400 when there is no body', async () => {
      await updateHandler({ params: {}, body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 if there is no id param', async () => {
      await updateHandler({ params: {}, body: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteHandler', () => {
    it('returns 200', async () => {
      EventReport.mockImplementation(() => ({
        canDeleteSession: () => true,
      }));
      findEventByDbId.mockResolvedValue(mockEvent);
      findSessionById.mockResolvedValue(mockSession);
      await deleteHandler({ session: { userId: 1 }, params: { id: mockSession.id } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
    it('returns 400 if there is no id param', async () => {
      await deleteHandler({ params: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    it('returns 403 if permissions are inadaquate', async () => {
      EventReport.mockImplementation(() => ({
        canDeleteSession: () => false,
      }));
      findEventByDbId.mockResolvedValue(mockEvent);
      findSessionById.mockResolvedValue(mockSession);
      await deleteHandler({ session: { userId: 1 }, params: { id: mockSession.id } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getParticipants', () => {
    it('returns participants', async () => {
      getPossibleSessionParticipants.mockResolvedValue([]);
      await getParticipants({ params: { id: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('handles errors', async () => {
      getPossibleSessionParticipants.mockRejectedValue(new Error('error'));
      await getParticipants({ params: { id: 1 } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
