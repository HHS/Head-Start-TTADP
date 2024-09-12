import httpCodes from 'http-codes';
import { Group, Grant } from '../../models';
import {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getEligibleUsersForGroup,
  getEligibleRecipientGrantsForGroup,
} from './handlers';
import { currentUserId } from '../../services/currentUser';
import {
  groups,
  group,
  createNewGroup,
  editGroup,
  destroyGroup,
  checkGroupNameAvailable,
  potentialRecipientGrants,
  potentialGroupUsers,
} from '../../services/groups';
import { GROUP_COLLABORATORS } from '../../constants';
import GroupPolicy from '../../policies/group';

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

jest.mock('../../policies/group');

jest.mock('../../services/users', () => ({
  userById: jest.fn((id) => ({
    id,
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
  checkGroupNameAvailable: jest.fn(),
  potentialRecipientGrants: jest.fn(),
  potentialGroupUsers: jest.fn(),
}));

describe('Groups Handlers', () => {
  describe('getGroups', () => {
    let req;
    let res;
    const userId = 1;
    beforeEach(() => {
      req = {
        params: {},
      };
      res = {
        json: jest.fn(),
        status: jest.fn(),
        sendStatus: jest.fn(),
      };
      currentUserId.mockReturnValueOnce(userId);
    });
    it('should return 200 and the groups', async () => {
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      groups.mockReturnValueOnce(groupsResponse);
      await getGroups(req, res);
      expect(res.json).toHaveBeenCalledWith(groupsResponse);
    });
    it('should return 500 if there is an error', async () => {
      groups.mockRejectedValueOnce(new Error('Error'));
      await getGroups(req, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getGroup', () => {
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
      const groupResponse = {
        id: 1,
        name: 'Group 1',
        groupCollaborators: [{
          id: 1,
          user: { id: userId, name: '' },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };
      GroupPolicy.mockImplementationOnce(() => ({
        canUseGroup: () => true,
      }));
      group.mockReturnValueOnce(groupResponse);
      await getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 403 if the user does not own the group', async () => {
      const groupResponse = {
        id: 1,
        name: 'Group 1',
        groupCollaborators: [{
          id: 1,
          user: { id: 2, name: '' },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };
      group.mockReturnValueOnce(groupResponse);
      await getGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      currentUserId.mockReturnValueOnce(userId);
      group.mockRejectedValueOnce(new Error('Error'));
      await getGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createGroup', () => {
    let req;
    let res;
    const statusJson = jest.fn();
    const userId = 1;
    beforeEach(() => {
      req = {
        body: {
          name: 'Group 1',
          coOwners: [2],
        },
      };
      res = {
        json: jest.fn(),
        status: jest.fn(() => ({
          json: statusJson,
        })),
        sendStatus: jest.fn(),
      };
      currentUserId
        .mockReturnValueOnce(userId);
    });
    it('should return 200 and the group', async () => {
      const groupResponse = { id: 1, name: 'Group 1' };
      Grant.findAll.mockReturnValueOnce([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);

      // The below mock is called twice.
      GroupPolicy.mockImplementationOnce(() => ({
        canAddToGroup: () => true,
      }));
      GroupPolicy.mockImplementationOnce(() => ({
        canAddToGroup: () => true,
      }));
      checkGroupNameAvailable.mockReturnValueOnce(Promise.resolve(true));
      potentialRecipientGrants.mockReturnValueOnce([{ grantId: 1 }]);
      createNewGroup.mockReturnValueOnce(groupResponse);
      await createGroup(req, res);
      expect(checkGroupNameAvailable).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 with an error if the group already exists', async () => {
      Grant.findAll.mockReturnValueOnce([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      // The below mock is called twice.
      GroupPolicy.mockImplementationOnce(() => ({
        canAddToGroup: () => true,
      }));
      GroupPolicy.mockImplementationOnce(() => ({
        canAddToGroup: () => true,
      }));
      potentialRecipientGrants.mockReturnValueOnce([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValueOnce(Promise.resolve(false));
      await createGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({
        message: 'This group name already exists, please use a different name',
        error: 'new-group-name',
      });
    });

    it('should return 500 if there is an error', async () => {
      Grant.findAll.mockReturnValueOnce([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      // The below mock is called twice.
      GroupPolicy.mockImplementationOnce(() => ({
        canAddToGroup: () => true,
      }));
      GroupPolicy.mockImplementationOnce(() => ({
        canAddToGroup: () => true,
      }));
      potentialRecipientGrants.mockReturnValueOnce([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValueOnce(Promise.resolve(true));
      createNewGroup.mockRejectedValue(new Error('Error'));
      await createGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({ message: 'There was an error saving your group' });
    });
  });

  describe('updateGroup', () => {
    let req;
    let res;
    const statusJson = jest.fn();
    const userId = 1;
    beforeEach(() => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
          coOwners: [],
          individuals: [],
        },
      };
      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn(() => ({ json: statusJson })),
      };
      currentUserId.mockReturnValueOnce(userId);
    });
    it('should return 200 and the group', async () => {
      Group.findAll.mockReturnValueOnce([{ id: 1, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);

      GroupPolicy.mockImplementationOnce(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValueOnce(Promise.resolve(true));
      groups.mockReturnValueOnce(groupsResponse);
      await updateGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 with an error message if the group already exists', async () => {
      GroupPolicy.mockImplementationOnce(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group Old', userId: 1 }, { id: 2, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({
        message: 'This group name already exists, please use a different name',
        error: 'new-group-name',
      });
    });

    it('should return 403 if the user does not own the group', async () => {
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 2 }]);
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      GroupPolicy.mockImplementationOnce(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValueOnce(Promise.resolve(true));
      groups.mockReturnValueOnce(groupsResponse);
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      Grant.findAll.mockReturnValueOnce([
        { regionId: 1 },
      ]);
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
      GroupPolicy.mockImplementationOnce(() => ({
        ownsGroup: () => true,
      }));
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
      group.mockReturnValueOnce(null);
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
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      GroupPolicy.mockImplementationOnce(() => ({
        ownsGroup: () => true,
      }));
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
      destroyGroup.mockRejectedValue(new Error('Error'));
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getEligibleUsersForGroup', () => {
    let req;
    let res;
    const statusJson = jest.fn();
    const userId = 1;
    beforeEach(() => {
      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn(() => ({ json: statusJson })),
      };
      currentUserId.mockReturnValueOnce(userId);
    });
    it('should return 200 and the users', async () => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
        },
      };

      // Mock return value once for potentialCoOwners().
      const potentialCoOwnersResponse = [{ id: 1, name: 'User 1' }];
      potentialGroupUsers.mockReturnValueOnce(potentialCoOwnersResponse);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementationOnce(() => ({
        canEditGroup: () => true,
      }));

      group.mockReturnValueOnce(mockGroup);
      await getEligibleUsersForGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(potentialCoOwnersResponse);
    });

    it('should return 403 forbidden', async () => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
        },
      };

      // Mock return value once for potentialCoOwners().
      const potentialCoOwnersResponse = [{ id: 1, name: 'User 1' }];
      potentialGroupUsers.mockReturnValueOnce(potentialCoOwnersResponse);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementationOnce(() => ({
        canEditGroup: () => false,
      }));

      group.mockReturnValueOnce(mockGroup);
      await getEligibleUsersForGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return handle 500 error', async () => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
        },
      };

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };
      group.mockReturnValueOnce(mockGroup);

      // Mock return error for potentialCoOwners().
      potentialGroupUsers.mockRejectedValue(new Error('Error'));

      destroyGroup.mockRejectedValue(new Error('Error'));
      await getEligibleUsersForGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('getEligibleRecipientGrantsForGroup', () => {
    let req;
    let res;
    const statusJson = jest.fn();
    const userId = 1;
    beforeEach(() => {
      res = {
        json: jest.fn(),
        sendStatus: jest.fn(),
        status: jest.fn(() => ({ json: statusJson })),
      };
      currentUserId.mockReturnValueOnce(userId);
    });
    it('should return 200 and the recipients', async () => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
        },
      };

      const resGrants = [{ id: 1, name: 'Grant 1' }];
      potentialRecipientGrants.mockReturnValueOnce(resGrants);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementationOnce(() => ({
        canEditGroup: () => true,
      }));

      group.mockReturnValueOnce(mockGroup);
      await getEligibleRecipientGrantsForGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(resGrants);
    });

    it('should return 403 forbidden', async () => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
        },
      };

      // Mock return value once for potentialCoOwners().
      const resGrants = [{ id: 1, name: 'Grant 1' }];
      potentialGroupUsers.mockReturnValueOnce(resGrants);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementationOnce(() => ({
        canEditGroup: () => false,
      }));

      group.mockReturnValueOnce(mockGroup);
      await getEligibleRecipientGrantsForGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return handle 500 error', async () => {
      req = {
        params: {
          groupId: 1,
        },
        body: {
        },
      };

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };
      group.mockReturnValueOnce(mockGroup);

      // Mock return error for potentialCoOwners().
      potentialRecipientGrants.mockRejectedValue(new Error('Error'));

      destroyGroup.mockRejectedValue(new Error('Error'));
      await getEligibleRecipientGrantsForGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
