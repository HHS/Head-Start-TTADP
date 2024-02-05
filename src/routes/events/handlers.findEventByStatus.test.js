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

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(e.id);
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

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(e.id);
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

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(e.id);
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

      expect(data.length).toBe(1);
      expect(data[0].id).toBe(e2.id);
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

      expect(data.length).toBe(0);
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

      expect(data.length).toBe(0);
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

      expect(data.length).toBe(0);
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
      expect(data.length).toBe(2);
      const ids = data.map((d) => d.id);
      expect(ids).toContain(e.id);
      expect(ids).toContain(e2.id);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
      expect(data[1].sessionReports.length).toBe(0);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(1);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(1);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(1);
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

      expect(data.length).toBe(0);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(2);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(2);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(2);
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

      expect(data.length).toBe(0);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[0].sessionReports.length).toBe(2);
      expect(data[1].id).toBe(e2.id);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(2);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(2);
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

      expect(data.length).toBe(2);
      expect(data[0].id).toBe(e.id);
      expect(data[1].id).toBe(e2.id);
      expect(data[0].sessionReports.length).toBe(2);
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

      expect(data.length).toBe(0);
    });
  });
});
