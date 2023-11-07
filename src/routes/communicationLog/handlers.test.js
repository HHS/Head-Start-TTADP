// import httpCodes from 'http-codes';
import {
  logById,
//   logsByRecipientAndScopes,
//   deleteLog,
//   updateLog,
//   createLog,
} from '../../services/communicationLog';
// import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import {
  communicationLogById,
//   communicationLogsByRecipientId,
//   updateLogById,
//   deleteLogById,
//   createLogByRecipientId,
} from './handlers';
import SCOPES from '../../middleware/scopeConstants';

jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../services/communicationLog');

describe('communicationLog handlers', () => {
  const REGION_ID = 15;

  //   const authorizedToCreate = {
  //     id: 1,
  //     permissions: [
  //       {
  //         regionId: REGION_ID,
  //         scope: SCOPES.READ_WRITE_REPORTS,
  //       },
  //     ],
  //   };

  const authorizedToReadOnly = {
    id: 2,
    permissions: [
      {
        regionId: REGION_ID,
        scope: SCOPES.READ_REPORTS,
      },
    ],
  };

  //   const unauthorized = {
  //     id: 3,
  //     permissions: [],
  //   };

  //   const admin = {
  //     id: 4,
  //     permissions: [
  //       {
  //         regionId: 12,
  //         scope: SCOPES.ADMIN,
  //       },
  //     ],
  //   };

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      send: jest.fn(),
      end: jest.fn(),
    })),
  };

  afterEach(async () => {
    jest.resetAllMocks();
  });

  describe('communicationLogById', () => {
    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logById.mockImplementation(() => Promise.resolve({ id: 1 }));
      await communicationLogById(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ id: 1 });
    });

    // it('unauthorized', async () => {

    // });

    // it('error', async () => {

    // });
  });
});
