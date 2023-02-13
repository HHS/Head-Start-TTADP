import httpCodes from 'http-codes';
import { Group } from '../../models';
import {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
} from './handlers';
import { currentUserId } from '../../services/currentUser';
import {
  groups, group, createNewGroup, editGroup, destroyGroup,
} from '../../services/groups';

jest.mock('../../models', () => ({
  Group: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../services/groups', () => ({
  groups: jest.fn(),
  group: jest.fn(),
  createNewGroup: jest.fn(),
  editGroup: jest.fn(),
  destroyGroup: jest.fn(),
}));

describe('Groups Handlers', () => {
  describe('getGroups', () => {
    it('should return 200 and the groups', async () => {
      const req = {
        params: {},
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      const usersGroups = [{ id: 1, name: 'Group 1' }];
      currentUserId.mockReturnValue(userId);
      groups.mockReturnValue(usersGroups);
      await getGroups(req, res);
      expect(res.json).toHaveBeenCalledWith(usersGroups);
    });
    it('should return 500 if there is an error', async () => {
      const req = {
        params: {},
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
      };
      const userId = 1;
      currentUserId.mockReturnValue(userId);
      groups.mockRejectedValue(new Error('Error'));
      await getGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getGroup', () => {
    it('should return 200 and the group', async () => {
      const req = {
        params: {
          groupId: 1,
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
      };
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      currentUserId.mockReturnValue(userId);
      group.mockReturnValue(groupResponse);
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 403 if the user does not own the group', async () => {
      const req = {
        params: {
          groupId: 1,
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      currentUserId.mockReturnValue(userId);
      group.mockReturnValue(groupResponse);
      await getGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      const req = {
        params: {
          groupId: 1,
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      currentUserId.mockReturnValue(userId);
      group.mockRejectedValue(new Error('Error'));
      await getGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createGroup', () => {
    it('should return 200 and the group', async () => {
      const req = {
        body: {
          name: 'Group 1',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
      };
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      currentUserId.mockReturnValue(userId);
      createNewGroup.mockReturnValue(groupResponse);
      await createGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });
    it('should return 500 if there is an error', async () => {
      const req = {
        body: {
          name: 'Group 1',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      currentUserId.mockReturnValue(userId);
      createNewGroup.mockRejectedValue(new Error('Error'));
      await createGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateGroup', () => {
    it('should return 200 and the group', async () => {
      const req = {
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };

      Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 1 });

      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      currentUserId.mockReturnValue(userId);
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 403 if the user does not own the group', async () => {
      const req = {
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 2 });
      currentUserId.mockReturnValue(userId);
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      const req = {
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 1 });
      currentUserId.mockReturnValue(userId);
      editGroup.mockRejectedValue(new Error('Error'));
      await updateGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('deleteGroup', () => {
    it('should return 200 and the group', async () => {
      const req = {
        params: {
          groupId: 1,
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn(),
      };
      Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 1 });
      const userId = 1;
      const groupResponse = 1;
      currentUserId.mockReturnValue(userId);
      destroyGroup.mockReturnValue(groupResponse);
      await deleteGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 403 if the user does not own the group', async () => {
      const req = {
        params: {
          groupId: 1,
        },
      };
      const res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
      };
      Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 2 });
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      currentUserId.mockReturnValue(userId);
      destroyGroup.mockReturnValue(groupResponse);
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      const req = {
        params: {
          groupId: 1,
        },
      };
      const res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
      };
      Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 1 });
      const userId = 1;
      currentUserId.mockReturnValue(userId);
      destroyGroup.mockRejectedValue(new Error('Error'));
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
