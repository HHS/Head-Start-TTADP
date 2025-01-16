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
      currentUserId.mockReturnValue(userId);
    });
    it('should return 200 and the groups', async () => {
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      groups.mockReturnValue(groupsResponse);
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
      currentUserId.mockReturnValue(userId);
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
      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => true,
      }));
      group.mockReturnValue(groupResponse);
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
      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => false,
      }));
      group.mockReturnValue(groupResponse);
      await getGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      currentUserId.mockReturnValue(userId);
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
        .mockReturnValue(userId);
    });
    it('should return 200 and the group', async () => {
      const groupResponse = { id: 1, name: 'Group 1' };
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);

      GroupPolicy.mockImplementation(() => ({
        canAddToGroup: () => true,
      }));
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      createNewGroup.mockReturnValue(groupResponse);
      await createGroup(req, res);
      expect(checkGroupNameAvailable).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('uses default value for co-owners', async () => {
      const groupResponse = { id: 1, name: 'Group 1' };
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);

      GroupPolicy.mockImplementation(() => ({
        canAddToGroup: () => true,
      }));

      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      createNewGroup.mockReturnValue(groupResponse);
      await createGroup({
        body: {
          name: 'Group 1',
          coOwners: [],
        },
      }, res);
      expect(checkGroupNameAvailable).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('used individuals from request body', async () => {
      const groupResponse = { id: 1, name: 'Group 1' };
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);

      GroupPolicy.mockImplementation(() => ({
        canAddToGroup: () => true,
        canUseGroup: () => true,
      }));
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      createNewGroup.mockReturnValue(groupResponse);
      await createGroup({
        body: {
          name: 'Group 1',
          coOwners: [2],
          individuals: [1],
        },
      }, res);
      expect(checkGroupNameAvailable).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 with an error if the group already exists', async () => {
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      GroupPolicy.mockImplementation(() => ({
        canAddToGroup: () => true,
      }));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(false));
      await createGroup(req, res);
      expect(statusJson).toHaveBeenCalledWith({
        message: 'This group name already exists, please use a different name',
        error: 'new-group-name',
      });
    });

    it('should return FORBIDDEN if permissions bad', async () => {
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      GroupPolicy.mockImplementation(() => ({
        canAddToGroup: () => false,
      }));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(false));
      await createGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return ACCEPTED if co-owner permissions bad', async () => {
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      GroupPolicy.mockImplementation((userData) => ({
        canAddToGroup: () => {
          if (userData.id === 1) return true;
          return false;
        },
      }));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      await createGroup({
        body: {
          name: 'Group 1',
          coOwners: [2],
        },
        session: {
          user: {
            id: 1,
          },
        },
      }, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.ACCEPTED);
    });

    it('should return ACCEPTED if individuals permissions bad', async () => {
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      GroupPolicy.mockImplementation((userData) => ({
        canUseGroup: () => false,
        canAddToGroup: () => {
          if (userData.id === 1) return true;
          return false;
        },
      }));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      await createGroup({
        body: {
          name: 'Group 1',
          coOwners: [],
          individuals: [2],
        },
        session: {
          user: {
            id: 1,
          },
        },
      }, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.ACCEPTED);
    });

    it('should return 500 if there is an error', async () => {
      Grant.findAll.mockReturnValue([{
        id: 1,
        regionId: 1,
        recipientId: 1,
        status: 'Active',
      }]);
      GroupPolicy.mockImplementation(() => ({
        canAddToGroup: () => true,
      }));
      potentialRecipientGrants.mockReturnValue([{ grantId: 1 }]);
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
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
    afterEach(() => jest.clearAllMocks());
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
      currentUserId.mockReturnValue(userId);
    });
    it('should return 200 and the group', async () => {
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);

      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      groups.mockReturnValue(groupsResponse);
      await updateGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 and the group with default req params', async () => {
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);

      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      groups.mockReturnValue(groupsResponse);
      await updateGroup({
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
        },
      }, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 and the group with populated req params', async () => {
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);

      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      groups.mockReturnValue(groupsResponse);
      await updateGroup({
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
          coOwners: [2],
          individuals: [3],
        },
        session: {
          user: {
            id: 1,
          },
        },
      }, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return ACCEPTED if coowners lack permissions', async () => {
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);

      GroupPolicy.mockImplementation((userData) => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => {
          if (userData.id === 1) return true;
          return false;
        },
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      groups.mockReturnValue(groupsResponse);
      await updateGroup({
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
          coOwners: [2],
          individuals: [3],
        },
        session: {
          user: {
            id: 1,
          },
        },
      }, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.ACCEPTED);
    });

    it('should return ACCEPTED if individuals lack permissions', async () => {
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);

      GroupPolicy.mockImplementation((userData) => ({
        canUseGroup: () => false,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      groups.mockReturnValue(groupsResponse);
      await updateGroup({
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
          coOwners: [],
          individuals: [3],
        },
        session: {
          user: {
            id: 1,
          },
        },
      }, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.ACCEPTED);
    });

    it('should return 200 with an error message if the group already exists', async () => {
      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group Old', userId: 1 }, { id: 2, name: 'Group 1', userId: 1 }]);
      const groupResponse = { id: 1, name: 'Group 1' };
      editGroup.mockReturnValue(groupResponse);
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(false));
      const json = jest.fn();
      await updateGroup({
        params: {
          groupId: 1,
        },
        body: {
          name: 'Group 1',
          coOwners: [],
          individuals: [],
        },
        session: {
          user: {
            id: 1,
          },
        },
      }, {
        json,
        sendStatus: jest.fn(),
        status: jest.fn(() => ({ json })),
      });
      expect(json).toHaveBeenCalledWith({
        message: 'This group name already exists, please use a different name',
        error: 'new-group-name',
      });
    });

    it('should return 403 if the user does not own the group', async () => {
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => false,
      }));
      const groupResponse = { id: 1, name: 'Group 1', userId: 2 };
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 2 }]);
      editGroup.mockReturnValue(groupResponse);
      await updateGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      GroupPolicy.mockImplementation(() => ({
        canUseGroup: () => true,
        canEditGroup: () => true,
        canAddToGroup: () => true,
      }));
      const groupsResponse = [{ id: 1, name: 'Group 1' }];
      checkGroupNameAvailable.mockReturnValue(Promise.resolve(true));
      groups.mockReturnValue(groupsResponse);
      Group.findAll.mockReturnValue([{ id: 1, name: 'Group 1', userId: 1 }]);
      Grant.findAll.mockReturnValue([
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
      currentUserId.mockReturnValue(userId);
    });
    it('should return 200 and the group', async () => {
      GroupPolicy.mockImplementation(() => ({
        ownsGroup: () => true,
      }));
      group.mockReturnValue({
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
      destroyGroup.mockReturnValue(groupResponse);
      await deleteGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(groupResponse);
    });

    it('should return 200 if the group no longer exists', async () => {
      group.mockReturnValue(null);
      await deleteGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(httpCodes.OK);
    });

    it('should return 403 if the user does not own the group', async () => {
      // Group.findOne.mockReturnValue({ id: 1, name: 'Group 1', userId: 2 });
      group.mockReturnValue({
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
      GroupPolicy.mockImplementation(() => ({
        ownsGroup: () => false,
      }));
      await deleteGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return 500 if there is an error', async () => {
      GroupPolicy.mockImplementation(() => ({
        ownsGroup: () => true,
      }));
      group.mockReturnValue({
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
      currentUserId.mockReturnValue(userId);
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
      potentialGroupUsers.mockReturnValue(potentialCoOwnersResponse);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => true,
      }));

      group.mockReturnValue(mockGroup);
      await getEligibleUsersForGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(potentialCoOwnersResponse);
    });

    it('handles newGroup', async () => {
      req = {
        params: {
          groupId: 'new',
        },
        body: {
        },
      };

      // Mock return value once for potentialCoOwners().
      const potentialCoOwnersResponse = [{ id: 1, name: 'User 1' }];
      potentialGroupUsers.mockReturnValue(potentialCoOwnersResponse);

      // Mock group policy.
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => true,
      }));

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
      potentialGroupUsers.mockReturnValue(potentialCoOwnersResponse);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => false,
      }));

      group.mockReturnValue(mockGroup);
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
      group.mockReturnValue(mockGroup);

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
      currentUserId.mockReturnValue(userId);
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
      potentialRecipientGrants.mockReturnValue(resGrants);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => true,
      }));

      group.mockReturnValue(mockGroup);
      await getEligibleRecipientGrantsForGroup(req, res);
      expect(res.json).toHaveBeenCalledWith(resGrants);
    });

    it('should return 200 and the recipients for a new group', async () => {
      req = {
        params: {
          groupId: 'new',
        },
        body: {
        },
      };

      const resGrants = [{ id: 1, name: 'Grant 1' }];
      potentialRecipientGrants.mockReturnValue(resGrants);

      // Mock group policy.
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => true,
      }));

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
      potentialGroupUsers.mockReturnValue(resGrants);

      // Mock return group.
      const mockGroup = {
        groupCollaborators: [{
          user: { id: userId },
          collaboratorType: { name: GROUP_COLLABORATORS.CREATOR },
        }],
      };

      // Mock group policy.
      GroupPolicy.mockImplementation(() => ({
        canEditGroup: () => false,
      }));

      group.mockReturnValue(mockGroup);
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
      group.mockReturnValue(mockGroup);

      // Mock return error for potentialCoOwners().
      potentialRecipientGrants.mockRejectedValue(new Error('Error'));

      destroyGroup.mockRejectedValue(new Error('Error'));
      await getEligibleRecipientGrantsForGroup(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
