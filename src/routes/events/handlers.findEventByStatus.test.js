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

const { User, Permission } = db;

const newEvent = ({
  ownerId = 1,
  pocIds = [1],
  collaboratorIds = [],
  regionId = 1,
  status = TRAINING_REPORT_STATUSES.NOT_STARTED,
}) => ({
  ownerId,
  pocIds,
  collaboratorIds,
  regionId,
  data: {
    status,
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

let currentUserId = 49_999;
const userIds = [];

const createUser = async ({
  write = false,
  read = false,
  poc = false,
  regionId = 1,
}) => {
  const permissions = [];

  currentUserId += 1;
  userIds.push(currentUserId);

  if (write) {
    permissions.push({ scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS, regionId });
  }

  if (read) {
    permissions.push({ scopeId: SCOPE_IDS.READ_TRAINING_REPORTS, regionId });
  }

  if (poc) {
    permissions.push({ scopeId: SCOPE_IDS.POC_TRAINING_REPORTS, regionId });
  }

  await User.create({ id: currentUserId, hsesUsername: faker.datatype.string() });

  return Promise.all(permissions.map((p) => Permission.create({
    userId: currentUserId,
    ...p,
  })));
};

// /**
//  *

//     case TRS.IN_PROGRESS:
//       /**
//        * In progress events
//        * You see all of them with regional permissions
//        * but you may not see all sessions
//        *
//        */

//       return events.map((event) => {
//         // if you are owner, collaborator or poc, you see all sessions
//         if (event.ownerId === userId) {
//           return event;
//         }

//         if (event.collaboratorIds.includes(userId)) {
//           return event;
//         }

//         if (event.pocIds && event.pocIds.includes(userId)) {
//           return event;
//         }

//         // otherwise, you only see sessions that are "complete"
//         const e = event;
//         e.sessionReports = e.sessionReports.filter((session) =>
// session.data.status === TRS.COMPLETE);

//         return e;
//       });
//     case TRS.COMPLETE:
//     case TRS.SUSPENDED:
//       // everyone with regional permissions can see all sessions
//       return events;
//     default:
//       return [];
//   }
//  */

let owner;
let collaborator;
let poc;
let otherPerson;
let seesNone;

const mockResponse = {
  send: jest.fn(),
  status: jest.fn(() => ({
    send: jest.fn(),
    end: jest.fn(),
  })),
  sendStatus: jest.fn(),
};

describe('findEventByStatus', () => {
  beforeEach(() => {
    mockResponse.status.mockClear();
    mockResponse.send.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    owner = await createUser({ write: true });
    collaborator = await createUser({ write: true });
    poc = await createUser({ poc: true });
    otherPerson = await createUser({ write: true });
    seesNone = await createUser({});
  });

  afterAll((async () => {
    await User.destroy({
      where: {
        id: [
          owner.id,
          collaborator.id,
          poc.id,
          otherPerson.id,
          seesNone.id,
        ],
      },
    });
    await db.sequelize.close();
  }));
  describe('when status is null', () => {
    it('owner', async () => {
      const e = await createEvent(newEvent({ ownerId: owner.id }));
      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.COMPLETE } },
      ));
      await createSession(newSession(
        { eventId: e.id, data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS } },
      ));

      const e2 = await createEvent(newEvent({ ownerId: otherPerson.id }));

      await getByStatus({
        params: {
          status: null,
        },
        user: owner,
      }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.status.end).toHaveBeenCalledWith([e, e2]);

      // this should destroy events and sessions
      await destroyEvent(e.id);
      await destroyEvent(e2.id);
    });
    //  *   switch (status) {
    //     case TRS.NOT_STARTED:
    //     case null:
    //       /**
    //        * Not started events
    //        * You see them if
    //        * - You are the POC, owner, or collaborator
    //        */
    //       return events.filter((event) => {
    //         // pocIds is nullable
    //         if (event.pocIds && event.pocIds.includes(userId)) {
    //           return true;
    //         }

    //         if (event.collaboratorIds.includes(userId)) {
    //           return true;
    //         }

    //         if (event.ownerId === userId) {
    //           return true;
    //         }

    //         return false;
    //       });
  });
});
