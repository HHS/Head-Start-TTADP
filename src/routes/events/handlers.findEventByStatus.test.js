import faker from '@faker-js/faker';
import { TRAINING_REPORT_STATUSES, SCOPE_IDS } from '@ttahub/common';
import db from '../../models';
import {
  getByStatus,
} from './handlers';
import {
  createEvent,
  destroyEvent,
} from '../../services/event';
import { createSession } from '../../services/sessionReports';

jest.mock('bull');

const { User, Permission } = db;

const newEvent = ({
  ownerId,
  pocIds = [],
  collaboratorIds = [],
  regionId = 1,
  status = null,
  data,
}) => ({
  ownerId,
  pocIds,
  collaboratorIds,
  regionId,
  data: {
    status,
    eventId: `R${regionId.toString().padStart(2, '0')}-PD-${faker.datatype.number({ min: 1000, max: 9999 })}`,
    ...data,
  },
});

const newSession = ({
  eventId = null,
  data = {},
}) => {
  if (!eventId) {
    throw new Error('eventId is required');
  }

  return {
    eventId,
    data,
  };
};

const createUser = async ({
  write = false,
  read = false,
  poc = false,
  regionId = 1,
}) => {
  const permissions = [];

  const currentUserId = faker.datatype.number({ min: 48_000 });

  if (write) {
    permissions.push({ scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS, regionId });
  }

  if (read) {
    permissions.push({ scopeId: SCOPE_IDS.READ_REPORTS, regionId });
  }

  if (poc) {
    permissions.push({ scopeId: SCOPE_IDS.POC_TRAINING_REPORTS, regionId });
  }

  const u = await User.create({ id: currentUserId, hsesUsername: faker.datatype.string() });

  await Promise.all(permissions.map((p) => Permission.create({
    userId: u.id,
    ...p,
  })));

  return u;
};

let owner;
let collaborator;
let poc;
let otherWrite;
let otherRead;
let otherPoc;
let seesNone;

const mockSend = jest.fn();

const mockResponse = {
  send: jest.fn(),
  status: jest.fn(() => ({
    send: mockSend,
    end: jest.fn(),
  })),
  sendStatus: jest.fn(),
};

describe('findEventByStatus', () => {
  beforeEach(() => {
    mockResponse.status.mockClear();
    mockResponse.send.mockClear();
    mockSend.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    owner = await createUser({ write: true });
    collaborator = await createUser({ write: true });
    poc = await createUser({ poc: true });
    otherWrite = await createUser({ write: true });
    otherPoc = await createUser({ poc: true });
    otherRead = await createUser({ read: true });
    seesNone = await createUser({});
  });

  afterAll((async () => {
    await Permission.destroy({
      where: {
        userId: [
          owner.id,
          collaborator.id,
          poc.id,
          otherPoc.id,
          otherRead.id,
          otherWrite.id,
          seesNone.id,
        ],
      },
    });

    await User.destroy({
      where: {
        id: [
          owner.id,
          collaborator.id,
          poc.id,
          otherWrite.id,
          otherRead.id,
          otherPoc.id,
          seesNone.id,
        ],
      },
    });
    await db.sequelize.close();
  }));
  describe('when status is NOT_STARTED', () => {
    let e;
    let e2;

    beforeAll(async () => {
      const firstId = `R01-PD-${faker.datatype.number({ min: 1000, max: 2000 })}`;
      const secondId = `R01-PD-${faker.datatype.number({ min: 2000, max: 3000 })}`;
      e = await createEvent(newEvent({
        ownerId: owner.id,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
        pocIds: [poc.id],
        collaboratorIds: [collaborator.id],
        data: { title: 'A', eventId: firstId },
      }));
      e2 = await createEvent(newEvent({
        ownerId: otherWrite.id,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
        data: { title: 'B', eventId: secondId },
      }));
    });

    afterAll(async () => {
      // this should destroy events and sessions
      await destroyEvent(e.id);
      await destroyEvent(e2.id);
    });

    it('owner', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: owner.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Owner should see their own event
      expect(ids).toContain(e.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });

    it('collab', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: collaborator.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Owner should see their own event
      expect(ids).toContain(e.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });

    it('poc', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: poc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // POC should see events where they're listed as POC
      expect(ids).toContain(e.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });

    it('otherWrite', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: otherWrite.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherWrite should see their own event (e2), not e
      expect(ids).toContain(e2.id);
      expect(ids).not.toContain(e.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });

    it('otherRead', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: otherRead.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherRead should not see test events (not owner/collab/poc)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });

    it('otherPoc', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: otherPoc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherPoc should not see test events (not poc for these events)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });

    it('seesNone', async () => {
      await getByStatus({
        params: {
          status: 'not-started',
        },
        session: {
          userId: seesNone.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // seesNone should not see test events (no permissions)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.NOT_STARTED);
      });
    });
  });

  describe('when status is IN_PROGRESS', () => {
    let e;
    let e2;

    beforeAll(async () => {
      const firstId = `R01-PD-${faker.datatype.number({ min: 1000, max: 2000 })}`;
      const secondId = `R01-PD-${faker.datatype.number({ min: 2000, max: 3000 })}`;
      e = await createEvent(newEvent({
        ownerId: owner.id,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        pocIds: [poc.id],
        collaboratorIds: [collaborator.id],
        data: { title: 'A', eventId: firstId },
      }));
      e2 = await createEvent(newEvent({
        ownerId: otherWrite.id,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        data: { title: 'B', eventId: secondId },
      }));

      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.COMPLETE } },
      ));
      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS } },
      ));
    });

    afterAll(async () => {
      // this should destroy events and sessions
      await destroyEvent(e.id);
      await destroyEvent(e2.id);
    });

    it('owner', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: owner.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Owner should see only their own event (e), not e2 (regional access only)
      expect(ids).toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });

      // Owner sees all sessions for their event (e)
      const ownerEvent = data.find((d) => d.id === e.id);
      expect(ownerEvent.sessionReports.length).toBe(2);
    });

    it('collab', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: collaborator.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Collaborator should see only their event (e), not e2 (regional access only)
      expect(ids).toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });

      // Collaborator sees all sessions for their event (e)
      const collabEvent = data.find((d) => d.id === e.id);
      expect(collabEvent.sessionReports.length).toBe(2);
    });

    it('poc', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: poc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // POC should see only their event (e), not e2 (regional access only)
      expect(ids).toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });

      // POC sees all sessions for their event (e)
      const pocEvent = data.find((d) => d.id === e.id);
      expect(pocEvent.sessionReports.length).toBe(2);
    });

    it('otherWrite', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: otherWrite.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherWrite should see only their own event (e2), not e (no direct role)
      expect(ids).not.toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });

      // otherWrite sees all sessions for their own event (e2)
      const ownEvent = data.find((d) => d.id === e2.id);
      expect(ownEvent.sessionReports.length).toBe(0);
    });

    it('otherRead', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: otherRead.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherRead should not see test events (regional access only, no direct role)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });
    });

    it('otherPoc', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: otherPoc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherPoc should not see test events (regional access only, no direct role)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });
    });

    it('seesNone', async () => {
      await getByStatus({
        params: {
          status: 'in-progress',
        },
        session: {
          userId: seesNone.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // seesNone should not see test events (no regional permissions)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
      });
    });
  });

  describe('when status is COMPLETE', () => {
    let e;
    let e2;

    beforeAll(async () => {
      const firstId = `R01-PD-${faker.datatype.number({ min: 1000, max: 2000 })}`;
      const secondId = `R01-PD-${faker.datatype.number({ min: 2000, max: 3000 })}`;
      e = await createEvent(newEvent({
        ownerId: owner.id,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        pocIds: [poc.id],
        collaboratorIds: [collaborator.id],
        data: { title: 'A', eventId: firstId },
      }));
      e2 = await createEvent(newEvent({
        ownerId: otherWrite.id,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        data: { title: 'B', eventId: secondId },
      }));

      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.COMPLETE } },
      ));
      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.COMPLETE } },
      ));

      await e.update({
        data: {
          ...e.data,
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        },
      });

      await e2.update({
        data: {
          ...e.data,
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        },
      });
    });

    afterAll(async () => {
      // this should destroy events and sessions
      await destroyEvent(e.id);
      await destroyEvent(e2.id);
    });

    it('owner', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: owner.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Owner should see both test events
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });

      // Owner sees all sessions for their event
      const ownerEvent = data.find((d) => d.id === e.id);
      expect(ownerEvent.sessionReports.length).toBe(2);
    });

    it('collab', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: collaborator.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Collaborator should see both test events
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });

      // Collaborator sees all sessions for their event
      const collabEvent = data.find((d) => d.id === e.id);
      expect(collabEvent.sessionReports.length).toBe(2);
    });

    it('poc', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: poc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // POC should see both test events
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });

      // POC sees all sessions for their event
      const pocEvent = data.find((d) => d.id === e.id);
      expect(pocEvent.sessionReports.length).toBe(2);
    });

    it('otherWrite', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: otherWrite.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherWrite should see both test events (regional permissions)
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });

      // For COMPLETE status, all users see all sessions
      const event1 = data.find((d) => d.id === e.id);
      expect(event1.sessionReports.length).toBe(2);
    });

    it('otherRead', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: otherRead.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherRead should see both test events (regional permissions)
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });

      // For COMPLETE status, all users see all sessions
      const event1 = data.find((d) => d.id === e.id);
      expect(event1.sessionReports.length).toBe(2);
    });

    it('otherPoc', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: otherPoc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherPoc should see both test events (regional permissions)
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });

      // For COMPLETE status, all users see all sessions
      const event1 = data.find((d) => d.id === e.id);
      expect(event1.sessionReports.length).toBe(2);
    });

    it('seesNone', async () => {
      await getByStatus({
        params: {
          status: 'complete',
        },
        session: {
          userId: seesNone.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // seesNone should not see test events (no regional permissions)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.COMPLETE);
      });
    });
  });

  describe('when status is SUSPENDED', () => {
    let e;
    let e2;

    beforeAll(async () => {
      const firstId = `R01-PD-${faker.datatype.number({ min: 1000, max: 2000 })}`;
      const secondId = `R01-PD-${faker.datatype.number({ min: 2000, max: 3000 })}`;
      e = await createEvent(newEvent({
        ownerId: owner.id,
        status: TRAINING_REPORT_STATUSES.SUSPENDED,
        pocIds: [poc.id],
        collaboratorIds: [collaborator.id],
        data: { title: 'A', eventId: firstId },
      }));
      e2 = await createEvent(newEvent({
        ownerId: otherWrite.id,
        status: TRAINING_REPORT_STATUSES.SUSPENDED,
        data: { title: 'B', eventId: secondId },
      }));

      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.COMPLETE } },
      ));
      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS } },
      ));
    });

    afterAll(async () => {
      // this should destroy events and sessions
      await destroyEvent(e.id);
      await destroyEvent(e2.id);
    });

    it('owner', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: owner.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Owner should see both test events
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });

      // Owner sees all sessions for their event
      const ownerEvent = data.find((d) => d.id === e.id);
      expect(ownerEvent.sessionReports.length).toBe(2);
    });

    it('collab', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: collaborator.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // Collaborator should see both test events
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });

      // Collaborator sees all sessions for their event
      const collabEvent = data.find((d) => d.id === e.id);
      expect(collabEvent.sessionReports.length).toBe(2);
    });

    it('poc', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: poc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // POC should see both test events
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });

      // POC sees all sessions for their event
      const pocEvent = data.find((d) => d.id === e.id);
      expect(pocEvent.sessionReports.length).toBe(2);
    });

    it('otherWrite', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: otherWrite.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherWrite should see both test events (regional permissions)
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });

      // For SUSPENDED status, all users see all sessions
      const event1 = data.find((d) => d.id === e.id);
      expect(event1.sessionReports.length).toBe(2);
    });

    it('otherRead', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: otherRead.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherRead should see both test events (regional permissions)
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });

      // For SUSPENDED status, all users see all sessions
      const event1 = data.find((d) => d.id === e.id);
      expect(event1.sessionReports.length).toBe(2);
    });

    it('otherPoc', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: otherPoc.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // otherPoc should see both test events (regional permissions)
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });

      // For SUSPENDED status, all users see all sessions
      const event1 = data.find((d) => d.id === e.id);
      expect(event1.sessionReports.length).toBe(2);
    });

    it('seesNone', async () => {
      await getByStatus({
        params: {
          status: 'suspended',
        },
        session: {
          userId: seesNone.id,
        },
        query: {},
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const data = mockSend.mock.calls[0][0];
      const ids = data.map((d) => d.id);

      // seesNone should not see test events (no regional permissions)
      expect(ids).not.toContain(e.id);
      expect(ids).not.toContain(e2.id);

      // Verify all returned events have the correct status
      data.forEach((event) => {
        expect(event.data.status).toBe(TRAINING_REPORT_STATUSES.SUSPENDED);
      });
    });
  });
});
