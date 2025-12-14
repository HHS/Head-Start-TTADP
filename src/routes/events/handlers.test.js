/* eslint-disable max-len */
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import httpCodes from 'http-codes';
import db from '../../models';
import {
  getHandler,
  createHandler,
  updateHandler,
  deleteHandler,
  getByStatus,
  getTrainingReportAlertsHandler,
} from './handlers';
import {
  createEvent,
  findEventsByCollaboratorId,
  findEventBySmartsheetIdSuffix,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByRegionId,
  updateEvent,
  findEventsByStatus,
  getTrainingReportAlertsForUser,
} from '../../services/event';
import EventReport from '../../policies/event';

jest.mock('../../policies/event');

jest.mock('../../services/event', () => ({
  createEvent: jest.fn(),
  findEventsByCollaboratorId: jest.fn(),
  findEventBySmartsheetIdSuffix: jest.fn(),
  findEventsByOwnerId: jest.fn(),
  findEventsByPocId: jest.fn(),
  findEventsByRegionId: jest.fn(),
  updateEvent: jest.fn(),
  destroyEvent: jest.fn(),
  findEventsByStatus: jest.fn(),
  getTrainingReportAlertsForUser: jest.fn(),
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
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
      }));
      await getHandler({ params: { eventId: 99_999 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('returns the event if read only', async () => {
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
      }));
      await getHandler({ params: { eventId: 99_999 }, query: { readOnly: true } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('400 when no params', async () => {
      await getHandler({ params: {}, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('404 when not found by eventId', async () => {
      findEventBySmartsheetIdSuffix.mockResolvedValue(null);
      await getHandler({ params: { eventId: 1 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by regionId', async () => {
      findEventsByRegionId.mockResolvedValue(null);
      await getHandler({ params: { regionId: 1 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by ownerId', async () => {
      findEventsByOwnerId.mockResolvedValue(null);
      await getHandler({ params: { ownerId: 1 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by pocIds', async () => {
      findEventsByPocId.mockResolvedValue(null);
      await getHandler({ params: { pocIds: 1 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when not found by collaboratorId', async () => {
      findEventsByCollaboratorId.mockResolvedValue(null);
      await getHandler({ params: { collaboratorId: 1 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when the user cannot read the event', async () => {
      EventReport.mockImplementation(() => ({
        canRead: () => false,
        isPoc: () => false,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      await getHandler({ params: { eventId: 1 }, query: {} }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('returns 403 when trying to edit a completed event', async () => {
      const completedEvent = {
        ...mockEvent,
        data: {
          status: 'Complete',
        },
      };
      findEventBySmartsheetIdSuffix.mockResolvedValue(completedEvent);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
      }));
      await getHandler({ params: { eventId: 99_999 }, query: {} }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('allows viewing a completed event in read-only mode', async () => {
      const completedEvent = {
        ...mockEvent,
        data: {
          status: 'Complete',
        },
      };
      findEventBySmartsheetIdSuffix.mockResolvedValue(completedEvent);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
      }));
      await getHandler({ params: { eventId: 99_999 }, query: { readOnly: true } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getHandler session filtering', () => {
    it('filters sessions based on user role - owner sees all sessions', async () => {
      const eventWithSessions = {
        ...mockEvent,
        sessionReports: [
          { id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' } },
          { id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' } },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => false,
        isAdmin: () => false,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // Owner sees all sessions
      expect(sentData.sessionReports).toHaveLength(2);
    });

    it('filters sessions for POC based on event organizer type - Regional PD Event', async () => {
      const eventWithSessions = {
        ...mockEvent,
        ownerId: 1,
        pocIds: [99_999],
        data: {
          ...mockEvent.data,
          eventOrganizer: 'Regional PD Event (with National Centers)',
        },
        sessionReports: [
          { id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' } },
          { id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' } },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => true,
        isAdmin: () => false,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // POC sees all sessions for Regional PD Event (with National Centers)
      expect(sentData.sessionReports).toHaveLength(2);
    });

    it('filters sessions for POC based on event organizer type - Regional TTA Hosted Event', async () => {
      const eventWithSessions = {
        ...mockEvent,
        ownerId: 1,
        pocIds: [99_999],
        data: {
          ...mockEvent.data,
          eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
        },
        sessionReports: [
          { id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' } },
          { id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' } },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => true,
        isAdmin: () => false,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // POC sees NO sessions for Regional TTA Hosted Event (no National Centers)
      expect(sentData.sessionReports).toHaveLength(0);
    });

    it('filters sessions for regional user - only complete sessions', async () => {
      const eventWithSessions = {
        ...mockEvent,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        sessionReports: [
          {
            id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' }, approverId: null, submitted: false,
          },
          {
            id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' }, approverId: null, submitted: false,
          },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => false,
        isAdmin: () => false,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // Regional user only sees complete sessions
      expect(sentData.sessionReports).toHaveLength(1);
      expect(sentData.sessionReports[0].data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
    });

    it('filters sessions for approver - only submitted sessions they are assigned to', async () => {
      const eventWithSessions = {
        ...mockEvent,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        sessionReports: [
          {
            id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' }, approverId: 99_999, submitted: true,
          },
          {
            id: 2, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 2' }, approverId: 99_999, submitted: false,
          },
          {
            id: 3, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 3' }, approverId: 5, submitted: true,
          },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => false,
        isAdmin: () => false,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // Approver only sees submitted sessions they are assigned to
      expect(sentData.sessionReports).toHaveLength(1);
      expect(sentData.sessionReports[0].id).toBe(1);
    });

    it('filters sessions for collaborator - sees all sessions', async () => {
      const eventWithSessions = {
        ...mockEvent,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [99_999],
        sessionReports: [
          { id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' } },
          { id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' } },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => false,
        isAdmin: () => false,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // Collaborator sees all sessions
      expect(sentData.sessionReports).toHaveLength(2);
    });

    it('admin sees all sessions regardless of role or status', async () => {
      const eventWithSessions = {
        ...mockEvent,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        sessionReports: [
          { id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' } },
          { id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' } },
          { id: 3, data: { status: TRAINING_REPORT_STATUSES.NOT_STARTED, sessionName: 'Session 3' } },
        ],
      };

      findEventBySmartsheetIdSuffix.mockResolvedValue(eventWithSessions);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => false,
        isAdmin: () => true,
      }));

      await getHandler({ params: { eventId: 99_999 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // Admin sees all sessions
      expect(sentData.sessionReports).toHaveLength(3);
    });

    it('filters sessions in arrays when querying by regionId', async () => {
      const eventsArray = [
        {
          ...mockEvent,
          id: 1,
          ownerId: 1,
          sessionReports: [
            { id: 1, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 1' } },
            { id: 2, data: { status: TRAINING_REPORT_STATUSES.COMPLETE, sessionName: 'Session 2' } },
          ],
        },
        {
          ...mockEvent,
          id: 2,
          ownerId: 1,
          sessionReports: [
            { id: 3, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS, sessionName: 'Session 3' } },
          ],
        },
      ];

      findEventsByRegionId.mockResolvedValue(eventsArray);
      EventReport.mockImplementation(() => ({
        canRead: () => true,
        isPoc: () => false,
        isAdmin: () => false,
      }));

      await getHandler({ params: { regionId: 1 }, query: {}, session: { userId: 99_999 } }, mockResponse);

      const sentData = mockResponse.status.mock.results[0].value.send.mock.calls[0][0];
      // Each event should have filtered sessions (regional user sees only complete)
      expect(sentData).toHaveLength(2);
      expect(sentData[0].sessionReports).toHaveLength(1); // Only complete session
      expect(sentData[1].sessionReports).toHaveLength(0); // No complete sessions
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
      EventReport.mockImplementation(() => ({
        canWriteInRegion: () => true,
      }));
      createEvent.mockResolvedValue(mockEvent);
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
      EventReport.mockImplementation(() => ({
        canEditEvent: () => true,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      updateEvent.mockResolvedValue(mockEvent);
      await updateHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when no body', async () => {
      await updateHandler({ params: { eventId: 99_999 }, body: null }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('owners can update status to complete', async () => {
      EventReport.mockImplementation(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => true,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      updateEvent.mockResolvedValue(mockEvent);
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
      EventReport.mockImplementation(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => false,
      }));
      updateEvent.mockResolvedValue(mockEvent);
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
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
      EventReport.mockImplementation(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => true,
      }));
      updateEvent.mockResolvedValue(mockEvent);
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
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

    it('not owner cannot update status to suspended', async () => {
      EventReport.mockImplementation(() => ({
        canEditEvent: () => true,
        canSuspendOrCompleteEvent: () => false,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      updateEvent.mockResolvedValue(mockEvent);
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
      EventReport.mockImplementation(() => ({
        canDelete: () => true,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id } },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
    it('returns 404 when no event', async () => {
      findEventBySmartsheetIdSuffix.mockResolvedValue(null);
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id } },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when user can\'t delete', async () => {
      EventReport.mockImplementation(() => ({
        canDelete: () => false,
      }));
      findEventBySmartsheetIdSuffix.mockResolvedValue(mockEvent);
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id } },
        mockResponse,
      );
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('handles errors', async () => {
      findEventBySmartsheetIdSuffix.mockRejectedValue(new Error('error'));
      await deleteHandler(
        { session: { userId: 1 }, params: { eventId: mockEvent.id }, query: {} },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getByStatus', () => {
    it('works', async () => {
      EventReport.mockImplementation(() => ({
        isAdmin: () => false,
      }));
      findEventsByStatus.mockResolvedValue([mockEvent]);
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
      EventReport.mockImplementation(() => ({
        isAdmin: () => false,
      }));
      findEventsByStatus.mockRejectedValue(new Error('error'));
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
  describe('getTrainingReportAlertsHandler', () => {
    it('works', async () => {
      EventReport.mockImplementation(() => ({
        isAdmin: () => false,
        user: {
          id: 1,
        },
        canSeeAlerts: () => true,
      }));
      getTrainingReportAlertsForUser.mockResolvedValue({});
      await getTrainingReportAlertsHandler(
        {
          session: { userId: 1 },
        },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
    });
    it('handles auth', async () => {
      EventReport.mockImplementation(() => ({
        isAdmin: () => false,
        user: {
          id: 1,
        },
        canSeeAlerts: () => false,
      }));
      await getTrainingReportAlertsHandler(
        {
          session: { userId: 1 },
        },
        mockResponse,
      );
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('handles errors', async () => {
      EventReport.mockImplementation(() => ({
        isAdmin: () => false,
        user: {
          id: 1,
        },
        canSeeAlerts: () => true,
      }));
      getTrainingReportAlertsForUser.mockRejectedValue(new Error('error'));
      await getTrainingReportAlertsHandler(
        {
          session: { userId: 1 },
        },
        mockResponse,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
