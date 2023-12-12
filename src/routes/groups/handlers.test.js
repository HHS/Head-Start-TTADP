import httpCodes from 'http-codes';
import { Group, Grant } from '../../models';
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
import { GROUP_COLLABORATORS } from '../../constants';

jest.mock('../../models', () => ({
  Group: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Grant: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../services/users', () => ({
  userById: jest.fn(() => ({
    permissions: [
      {
        regionId: 1,
      },
    ],
  })),
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
      currentUserId.mockReturnValueOnce(userId);
      groups.mockReturnValueOnce(usersGroups);
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
      currentUserId.mockReturnValueOnce(userId);
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
      const groupResponse = { id: 1, name: 'Group 1', userId };
      currentUserId.mockReturnValueOnce(userId);
      group.mockReturnValueOnce(groupResponse);
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
      currentUserId.mockReturnValueOnce(userId);
      group.mockReturnValueOnce(groupResponse);
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
      currentUserId.mockReturnValueOnce(userId);
      group.mockRejectedValueOnce(new Error('Error'));
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
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      Grant.findAll.mockReturnValueOnce([
        { regionId: 1 },
      ]);
      currentUserId.mockReturnValueOnce(userId);
      createNewGroup.mockReturnValueOnce(groupResponse);
      await createGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 with an error if the group already exists', async () => {
      const req = {
        body: {
          name: 'Group 1',
        },
      };

      const statusJson = jest.fn();
      const res = {
        json: jest.fn(),
        status: jest.fn(() => ({
          json: statusJson,
        })),
        sendStatus: jest.fn(),
      };

      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      Grant.findAll.mockReturnValueOnce([
        { regionId: 1 },
      ]);
      Group.findOne.mockReturnValueOnce(groupResponse);
      currentUserId.mockReturnValueOnce(userId);
      createNewGroup.mockReturnValue(groupResponse);
      await createGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({
        message: 'This group name already exists, please use a different name',
        error: 'new-group-name',
      });
    });

    it('should return 500 if there is an error', async () => {
      const req = {
        body: {
          name: 'Group 1',
        },
      };
      const statusJson = jest.fn();
      const res = {
        json: jest.fn(),
        status: jest.fn(() => ({
          json: statusJson,
        })),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      Grant.findAll.mockReturnValueOnce([
        { regionId: 1 },
      ]);
      Group.findOne.mockReturnValueOnce(null);
      currentUserId.mockReturnValueOnce(userId);
      createNewGroup.mockRejectedValue(new Error('Error'));
      await createGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({ message: 'There was an error saving your group' });
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
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
        sendStatus: jest.fn(),
      };

      Group.findAll.mockReturnValueOnce([{ id: 1, name: 'Group 1', userId: 1 }]);
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      currentUserId.mockReturnValueOnce(userId);
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 with an error message if the group already exists', async () => {
      const req = {
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
        },
      };
      const statusJson = jest.fn();
      const res = {
        json: jest.fn(),
        status: jest.fn(() => ({
          json: statusJson,
        })),
        sendStatus: jest.fn(),
      };

      Group.findAll.mockReturnValue([{ id: 1, name: 'Group Old', userId: 1 }, { id: 2, name: 'Group 1', userId: 1 }]);
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1' };
      currentUserId.mockReturnValueOnce(userId);
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({
        message: 'This group name already exists, please use a different name',
        error: 'new-group-name',
      });
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
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 2 }]);
      currentUserId.mockReturnValueOnce(userId);
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
        status: jest.fn(() => ({
          json: jest.fn(),
        })),
        sendStatus: jest.fn(),
      };
      const userId = 1;
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      Grant.findAll.mockReturnValueOnce([
        { regionId: 1 },
      ]);
      currentUserId.mockReturnValueOnce(userId);
      editGroup.mockRejectedValue(new Error('Error'));
      await updateGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('deleteGroup', () => {
    let req;
    let res;
    const userId = 1;
    beforeEach(() => {
      req = {
        params: {
          groupId: 1,
        },
      };
      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn(() => ({ json: jest.fn() })),
      };
      currentUserId.mockReturnValueOnce(userId);
    });
    it('should return 200 and the group', async () => {
      // Group.findOne.mockReturnValueOnce({ id: 1, name: 'Group 1', userId: 1 });
      group.mockReturnValueOnce({
        id: 1,
        name: '',
        grants: [],
        groupCollaborators: [{
          id: 1,
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
          user: { id: 1, name: '' },
        }],
        isPublic: false,
      });
      const groupResponse = 1;
      destroyGroup.mockReturnValueOnce(groupResponse);
      await deleteGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 if the group no longer exists', async () => {
      // Group.findOne.mockReturnValueOnce(null);
      group.mockReturnValueOnce(null);
      const groupResponse = 1;
      destroyGroup.mockReturnValueOnce(groupResponse);
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.OK);
    });

    it('should return 403 if the user does not own the group', async () => {
      // Group.findOne.mockReturnValueOnce({ id: 1, name: 'Group 1', userId: 2 });
      group.mockReturnValueOnce({
        id: 1,
        name: '',
        grants: [],
        groupCollaborators: [{
          id: 1,
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
          user: { id: 2, name: '' },
        }],
        isPublic: false,
      });
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      destroyGroup.mockReturnValueOnce(groupResponse);
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      group.mockReturnValueOnce({
        id: 1,
        name: '',
        grants: [],
        groupCollaborators: [{
          id: 1,
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
          user: { id: 1, name: '' },
        }],
        isPublic: false,
      });
      destroyGroup.mockReturnValueOnce(new Error('Error'));
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
