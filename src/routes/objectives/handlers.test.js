import { INTERNAL_SERVER_ERROR, FORBIDDEN } from 'http-codes';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';
import { createObjectivesForOtherEntity } from './handlers';
import { createNewObjectivesForOtherEntity } from '../../services/objectives';
import { currentUserId } from '../../services/currentUser';

jest.mock('../../services/objectives', () => ({
  createNewObjectivesForOtherEntity: jest.fn(),
}));

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

describe('objectives handlers', () => {
  describe('createObjectivesForOtherEntity', () => {
    it('handles success', async () => {
      const req = {
        body: {
          otherEntityIds: [1, 2, 3],
          regionId: 1,
        },
        session: {
          user: {
            id: 1,
          },
        },
      };
      const res = {
        json: jest.fn(),

        sendStatus: jest.fn(),
      };

      userById.mockReturnValue({
        id: 1,
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      currentUserId.mockReturnValue(1);

      createNewObjectivesForOtherEntity.mockReturnValue([1, 2, 3]);
      await createObjectivesForOtherEntity(req, res);
      expect(res.json).toHaveBeenCalledWith([1, 2, 3]);
    });

    describe('error states', () => {
      it('returns FORBIDDEN if the user can\'t write in region', async () => {
        const req = {
          body: {
            otherEntityIds: [1, 2, 3],
            regionId: 1,
          },
          session: {
            user: {
              id: 1,
            },
          },
        };
        const res = {
          json: jest.fn(),
          status: jest.fn(),
          sendStatus: jest.fn(),
        };

        userById.mockReturnValue({
          id: 1,
          permissions: [{
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          }],
        });

        currentUserId.mockReturnValue(1);

        createNewObjectivesForOtherEntity.mockReturnValue([1, 2, 3]);
        await createObjectivesForOtherEntity(req, res);
        expect(res.sendStatus).toHaveBeenCalledWith(FORBIDDEN);
      });

      it('returns null if there were no other entity ids passed in', async () => {
        const req = {
          body: {
            regionId: 1,
          },
          session: {
            user: {
              id: 1,
            },
          },
        };
        const res = {
          json: jest.fn(),
          status: jest.fn(),
          sendStatus: jest.fn(),
        };

        userById.mockReturnValue({
          id: 1,
          permissions: [{
            regionId: 1,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          }],
        });

        currentUserId.mockReturnValue(1);

        createNewObjectivesForOtherEntity.mockReturnValue([1, 2, 3]);
        await createObjectivesForOtherEntity(req, res);
        expect(res.json).toHaveBeenCalledWith(null);
      });

      it('returns null if something other than an array of numbers was passed in', async () => {
        const req = {
          body: {
            otherEntityIds: 'foo',
            regionId: 1,
          },
          session: {
            user: {
              id: 1,
            },
          },
        };
        const res = {
          json: jest.fn(),
          status: jest.fn(),
          sendStatus: jest.fn(),
        };

        userById.mockReturnValue({
          id: 1,
          permissions: [{
            regionId: 1,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          }],
        });

        currentUserId.mockReturnValue(1);

        createNewObjectivesForOtherEntity.mockReturnValue([1, 2, 3]);
        await createObjectivesForOtherEntity(req, res);
        expect(res.json).toHaveBeenCalledWith(null);
      });

      it('returns 500 if there was an error', async () => {
        const req = {
          body: {
            otherEntityIds: [1, 2, 3],
            regionId: 1,
          },
          session: {
            user: {
              id: 1,
            },
          },
        };
        const res = {
          json: jest.fn(),
          status: jest.fn(() => ({
            end: jest.fn(),
          })),
          sendStatus: jest.fn(),
        };

        userById.mockReturnValue({
          id: 1,
          permissions: [{
            regionId: 1,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          }],
        });

        currentUserId.mockReturnValue(1);

        createNewObjectivesForOtherEntity.mockImplementation(() => {
          throw new Error('error');
        });
        await createObjectivesForOtherEntity(req, res);
        expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
      });
    });
  });
});
