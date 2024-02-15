import faker from '@faker-js/faker';
import { GROUP_COLLABORATORS } from '../constants';
import SCOPES from '../middleware/scopeConstants';
import {
  User,
  Group,
  GroupGrant,
  Permission,
  Recipient,
  GroupCollaborator,
  Grant,
  ValidFor,
  CollaboratorType,
  sequelize,
  Role,
  UserRole,
  Program,
} from '../models';
import {
  groupsByRegion,
  groups,
  group,
  createNewGroup,
  editGroup,
  destroyGroup,
  checkGroupNameAvailable,
  potentialGroupUsers,
  potentialRecipientGrants,
} from './groups';

describe('Groups service', () => {
  let mockUser;
  let mockUserTwo;
  let mockUserThree;
  let mockUserFour;
  let recipient;
  let grantOne;
  let grantTwo;
  let existingGroupToEdit;
  let existingGroupToEditWithCollabs;
  let groupToDelete;
  let publicGroup;
  let groupsToCleanup = [];

  let creatorCollaboratorType;
  let coOwnerCollaboratorType;
  let sharedWithCollaboratorType;

  beforeAll(async () => {
    // Get group collaborator types.
    const groupValidFor = await ValidFor.findOne({
      where: {
        name: 'Groups',
      },
    });

    creatorCollaboratorType = await CollaboratorType.findOne({
      where: {
        name: GROUP_COLLABORATORS.CREATOR,
        validForId: groupValidFor.id,
      },
    });

    coOwnerCollaboratorType = await CollaboratorType.findOne({
      where: {
        name: GROUP_COLLABORATORS.CO_OWNER,
        validForId: groupValidFor.id,
      },
    });

    sharedWithCollaboratorType = await CollaboratorType.findOne({
      where: {
        name: GROUP_COLLABORATORS.SHARED_WITH,
        validForId: groupValidFor.id,
      },
    });

    mockUser = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      hsesUserId: faker.internet.email(),
      hsesUsername: faker.internet.email(),
      lastLogin: new Date(),
    });

    mockUserTwo = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      hsesUserId: faker.internet.email(),
      hsesUsername: faker.internet.email(),
      lastLogin: new Date(),
    });

    mockUserThree = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      hsesUserId: faker.internet.email(),
      hsesUsername: faker.internet.email(),
      lastLogin: new Date(),
    });

    mockUserFour = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      hsesUserId: faker.internet.email(),
      hsesUsername: faker.internet.email(),
      lastLogin: new Date(),
    });

    await Permission.create({
      regionId: 1,
      userId: mockUser.id,
      scopeId: SCOPES.READ_REPORTS,
    });

    await Permission.create({
      regionId: 1,
      userId: mockUserTwo.id,
      scopeId: SCOPES.READ_REPORTS,
    });

    await Permission.create({
      regionId: 1,
      userId: mockUserThree.id,
      scopeId: SCOPES.READ_REPORTS,
    });

    await Permission.create({
      regionId: 1,
      userId: mockUserFour.id,
      scopeId: SCOPES.READ_REPORTS,
    });

    recipient = await Recipient.create({
      id: faker.datatype.number(),
      name: faker.name.firstName(),
    });

    // create a first grant
    grantOne = await Grant.create({
      id: faker.datatype.number(),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    });

    // create a second grant
    grantTwo = await Grant.create({
      id: faker.datatype.number(),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    });

    // create a group to edit
    existingGroupToEdit = await Group.create({
      name: 'Group 1',
      // userId: mockUser.id,
      isPublic: false,
    });

    // Create GroupCollaborator.
    await GroupCollaborator.create({
      userId: mockUser.id,
      groupId: existingGroupToEdit.id,
      collaboratorTypeId: creatorCollaboratorType.id,
    });

    // add the first grant to the group
    await GroupGrant.create({
      groupId: existingGroupToEdit.id,
      grantId: grantOne.id,
    });

    // create a group to edit with collaborators.
    existingGroupToEditWithCollabs = await Group.create({
      name: 'Group 1 with collaborators',
      // userId: mockUser.id,
      isPublic: false,
    });

    // Create collaborators for existingGroupToEditWithCollabs.
    await GroupCollaborator.create({
      userId: mockUser.id,
      groupId: existingGroupToEditWithCollabs.id,
      collaboratorTypeId: creatorCollaboratorType.id, // Creator.
    });

    await GroupCollaborator.create({
      userId: mockUserTwo.id,
      groupId: existingGroupToEditWithCollabs.id,
      collaboratorTypeId: coOwnerCollaboratorType.id, // Co-Owner.
    });

    await GroupCollaborator.create({
      userId: mockUserThree.id,
      groupId: existingGroupToEditWithCollabs.id,
      collaboratorTypeId: sharedWithCollaboratorType.id, // SharedWith.
    });

    await GroupCollaborator.create({
      userId: mockUserFour.id,
      groupId: existingGroupToEditWithCollabs.id,
      collaboratorTypeId: sharedWithCollaboratorType.id, // SharedWith.
    });

    // add the first grant to the group
    await GroupGrant.create({
      groupId: existingGroupToEditWithCollabs.id,
      grantId: grantOne.id,
    });

    // create a group to delete
    groupToDelete = await Group.create({
      name: 'Group 2',
      // userId: mockUser.id,
      isPublic: false,
    });

    // Create GroupCollaborator.
    await GroupCollaborator.create({
      userId: mockUser.id,
      groupId: groupToDelete.id,
      collaboratorTypeId: creatorCollaboratorType.id,
    });

    // add the second grant to the group
    await GroupGrant.create({
      groupId: groupToDelete.id,
      grantId: grantTwo.id,
    });

    // create a public group
    publicGroup = await Group.create({
      name: 'Public Group',
      // userId: mockUserTwo.id,
      isPublic: true,
    });

    // Create GroupCollaborator.
    await GroupCollaborator.create({
      userId: mockUserTwo.id,
      groupId: publicGroup.id,
      collaboratorTypeId: creatorCollaboratorType.id,
    });

    groupsToCleanup = [
      existingGroupToEdit,
      groupToDelete,
      publicGroup,
      existingGroupToEditWithCollabs,
    ];

    await GroupGrant.create({
      groupId: publicGroup.id,
      grantId: grantTwo.id,
    });
  });

  afterAll(async () => {
    await GroupCollaborator.destroy({
      where: {
        groupId: groupsToCleanup.map((g) => g.id),
      },
    });

    await GroupGrant.destroy({
      where: {
        grantId: [grantOne.id, grantTwo.id],
      },
    });

    await Group.destroy({
      where: {
        id: groupsToCleanup.map((g) => g.id),
      },
    });

    await Grant.destroy({
      where: {
        id: [grantOne.id, grantTwo.id],
      },
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await Permission.destroy({
      where: {
        userId: [mockUser.id, mockUserTwo.id, mockUserThree.id, mockUserFour.id],
      },
    });

    await User.destroy({
      where: {
        id: [
          mockUser.id,
          mockUserTwo.id,
          mockUserThree.id,
          mockUserFour.id,
        ],
      },
    });

    await sequelize.close();
  });

  describe('groups', () => {
    it('returns a list of groups', async () => {
      const result = await groups(mockUser.id, [1]);
      expect(result).toHaveLength(4);

      const groupNames = result.map((gr) => gr.name);
      expect(groupNames).toContain('Group 1');
      expect(groupNames).toContain('Group 2');
      expect(groupNames).toContain('Public Group');
      expect(groupNames).toContain('Group 1 with collaborators');
    });

    it('returns a list of groups by region', async () => {
      const result = await groupsByRegion(1, mockUser.id);
      expect(result).toHaveLength(4);

      const groupNames = result.map((gr) => gr.name);
      expect(groupNames).toContain('Group 1');
      expect(groupNames).toContain('Group 2');
      expect(groupNames).toContain('Public Group');
      expect(groupNames).toContain('Group 1 with collaborators');
    });
  });

  describe('group', () => {
    it('returns a group', async () => {
      const result = await group(existingGroupToEdit.id);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('grants');
      expect(result.grants).toHaveLength(1);
    });
  });

  describe('createNewGroup', () => {
    it('creates a new group', async () => {
      const result = await createNewGroup({
        name: 'Group 3',
        grants: [grantOne.id, grantTwo.id],
        userId: mockUser.id,
        isPublic: false,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Group 3');
      expect(result.isPublic).toBe(false);
      expect(result).toHaveProperty('grants');
      expect(result.grants).toHaveLength(2);

      groupsToCleanup.push(result);
    });

    it('creates a new group with shared users and co owners', async () => {
      const result = await createNewGroup({
        name: 'Group with collaborators',
        grants: [grantOne.id, grantTwo.id],
        userId: mockUser.id,
        isPublic: false,
        shareWiths: [mockUserTwo.id, mockUserThree.id],
        coOwners: [mockUserFour.id],
      });

      groupsToCleanup.push(result);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Group with collaborators');
      expect(result.isPublic).toBe(false);
      expect(result).toHaveProperty('grants');
      expect(result.grants).toHaveLength(2);

      expect(result.groupCollaborators).toHaveLength(4);
      const creatorCollab = result.groupCollaborators.find((gc) => gc.collaboratorType.name === 'Creator');
      expect(creatorCollab).toBeDefined();
      expect(creatorCollab.userId).toBe(mockUser.id);

      const sharedWithCollab = result.groupCollaborators.filter(
        (gc) => gc.collaboratorType.name === 'SharedWith',
      );
      expect(sharedWithCollab).toHaveLength(2);
      const sharedWithsharedWithCollabIds = sharedWithCollab.map((sw) => sw.userId);
      expect(sharedWithsharedWithCollabIds).toContain(mockUserTwo.id);
      expect(sharedWithsharedWithCollabIds).toContain(mockUserThree.id);

      const coOwnersCollab = result.groupCollaborators.filter(
        (gc) => gc.collaboratorType.name === 'Co-Owner',
      );
      expect(coOwnersCollab).toHaveLength(1);
      const coOwnersCollabIds = coOwnersCollab.map((co) => co.userId);
      expect(coOwnersCollabIds).toContain(mockUserFour.id);

      // Assert result.creator is mockUser.
      expect(result.creator.id).toBe(mockUser.id);
      expect(result.creator.name).toBe(mockUser.name);
    });
  });

  describe('editGroup', () => {
    it('edits existing group', async () => {
      const result = await editGroup(existingGroupToEdit.id, {
        name: 'Group 1 Edited',
        grants: [grantTwo.id],
        userId: mockUser.id,
        isPublic: true,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Group 1 Edited');
      expect(result.isPublic).toBe(true);

      const currentGroupGrants = await GroupGrant.findAll({
        where: {
          groupId: existingGroupToEdit.id,
        },
      });

      expect(currentGroupGrants).toHaveLength(1);
      expect(currentGroupGrants[0].grantId).toBe(grantTwo.id);
    });

    it('edits existing group with shared users and co owners', async () => {
      let result = await editGroup(existingGroupToEditWithCollabs.id, {
        name: 'Group 1 with collaborators EDITED',
        grants: [grantTwo.id],
        userId: mockUser.id,
        isPublic: false,
        shareWiths: [mockUserTwo.id],
        coOwners: [mockUserThree.id, mockUserFour.id],
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Group 1 with collaborators EDITED');
      expect(result.isPublic).toBe(false);

      // Assert result.creator is mockUser.
      expect(result.creator.id).toBe(mockUser.id);
      expect(result.creator.name).toBe(mockUser.name);

      // Assert result.groupCollaborators.
      expect(result.groupCollaborators).toHaveLength(4);
      const creatorCollab = result.groupCollaborators.find((gc) => gc.collaboratorType.name === 'Creator');
      expect(creatorCollab).toBeDefined();
      expect(creatorCollab.userId).toBe(mockUser.id);

      const sharedWithCollab = result.groupCollaborators.filter(
        (gc) => gc.collaboratorType.name === 'SharedWith',
      );
      expect(sharedWithCollab).toHaveLength(1);
      const sharedWithsharedWithCollabIds = sharedWithCollab.map((sw) => sw.userId);
      expect(sharedWithsharedWithCollabIds).toContain(mockUserTwo.id);

      const coOwnersCollab = result.groupCollaborators.filter(
        (gc) => gc.collaboratorType.name === 'Co-Owner',
      );
      expect(coOwnersCollab).toHaveLength(2);
      const coOwnersCollabIds = coOwnersCollab.map((co) => co.userId);
      expect(coOwnersCollabIds).toContain(mockUserThree.id);
      expect(coOwnersCollabIds).toContain(mockUserFour.id);

      // Assert the group grants.
      const currentGroupGrants = await GroupGrant.findAll({
        where: {
          groupId: existingGroupToEditWithCollabs.id,
        },
      });

      expect(currentGroupGrants).toHaveLength(1);
      expect(currentGroupGrants[0].grantId).toBe(grantTwo.id);

      // Remove existing collaborators.
      result = await editGroup(existingGroupToEditWithCollabs.id, {
        name: 'Group 1 with collaborators EDITED',
        grants: [grantTwo.id],
        userId: mockUser.id,
        isPublic: false,
        shareWiths: [],
        coOwners: [],
      });

      // Assert result.groupCollaborators.
      expect(result.groupCollaborators).toHaveLength(1);
      const creatorCollabAfterEdit = result.groupCollaborators.find((gc) => gc.collaboratorType.name === 'Creator');
      expect(creatorCollabAfterEdit).toBeDefined();
      expect(creatorCollabAfterEdit.userId).toBe(mockUser.id);
    });
  });

  describe('destroyGroup', () => {
    it('deletes a group', async () => {
      const result = await destroyGroup(groupToDelete.id);
      expect(result).toBe(1);

      const currentGroupGrants = await GroupGrant.findAll({
        where: {
          groupId: groupToDelete.id,
        },
      });

      expect(currentGroupGrants).toHaveLength(0);

      // Assert the group is deleted.
      const currentGroup = await Group.findByPk(groupToDelete.id);
      expect(currentGroup).toBeNull();

      // Assert the groupCollaborators are deleted.
      const currentGroupCollaborators = await GroupCollaborator.findAll({
        where: {
          groupId: groupToDelete.id,
        },
      });

      expect(currentGroupCollaborators).toHaveLength(0);

      // Assert the group grants are deleted.
      const currentGroupGrantsAfterDelete = await GroupGrant.findAll({
        where: {
          groupId: groupToDelete.id,
        },
      });
      expect(currentGroupGrantsAfterDelete).toHaveLength(0);
    });
  });

  describe('getGroups', () => {
    let recipientIds;
    let grantIds;
    let groupIds;
    let groupUser;
    beforeAll(async () => {
      // Create a user.
      groupUser = await User.create({
        id: faker.datatype.number(),
        homeRegionId: 1,
        name: 'user1474265161',
        hsesUsername: 'user1474265161',
        hsesUserId: 'user1474265161',
        lastLogin: new Date(),
      });

      await Permission.create({
        regionId: 1,
        userId: groupUser.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      // Create a recipient 1.
      const recipientOne = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      // Create a recipient 2.
      const recipientTwo = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      // Create a recipient 3.
      const recipientThree = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      // Set the recipient ids.
      recipientIds = [recipientOne.id, recipientTwo.id, recipientThree.id];

      // Create a grant for region 1.
      const g1 = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientOne.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      // Create a second grant for region 1.
      const g2 = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientTwo.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
      });

      // Create a third grant for region 2.
      const g3 = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientThree.id,
        regionId: 2,
        startDate: new Date(),
        endDate: new Date(),
      });

      // Set the grant ids.
      grantIds = [g1.id, g2.id, g3.id];

      // Create a public group for the user.
      const publicGroupRegion1 = await Group.create({
        name: 'Public Group Region 1',
        // userId: groupUser.id,
        isPublic: true,
      });

      const publicGroupRegion1Collaborator = await GroupCollaborator.create({
        userId: groupUser.id,
        groupId: publicGroupRegion1.id,
        collaboratorTypeId: creatorCollaboratorType.id,
      });

      // Create a private group for the user.
      const privateGroupRegion1 = await Group.create({
        name: 'Private Group Region 1',
        // userId: groupUser.id,
        isPublic: false,
      });

      // Create a private CollaboratorGroup for the user.
      const privateGroupRegion1Collaborator = await GroupCollaborator.create({
        userId: groupUser.id,
        groupId: privateGroupRegion1.id,
        collaboratorTypeId: creatorCollaboratorType.id,
      });

      // Create a public group for region 2.
      const publicGroupRegion2 = await Group.create({
        name: 'Public Group Region 2',
        // userId: groupUser.id,
        isPublic: true,
      });

      // Create a public CollaboratorGroup for the user.
      const publicGroupRegion2Collaborator = await GroupCollaborator.create({
        userId: groupUser.id,
        groupId: publicGroupRegion2.id,
        collaboratorTypeId: creatorCollaboratorType.id,
      });

      // Set the group ids.
      groupIds = [
        publicGroupRegion1.id,
        privateGroupRegion1.id,
        publicGroupRegion2.id,
      ];

      // Add the grants to the groups.
      await GroupGrant.create({
        groupId: publicGroupRegion1.id,
        grantId: g1.id,
      });

      await GroupGrant.create({
        groupId: privateGroupRegion1.id,
        grantId: g2.id,
      });

      await GroupGrant.create({
        groupId: publicGroupRegion2.id,
        grantId: g3.id,
      });
    });

    afterAll(async () => {
      // Destroy the GroupCollaborator records.
      await GroupCollaborator.destroy({
        where: {
          groupId: groupIds,
        },
      });
      // Destroy the GroupGrant records.
      await GroupGrant.destroy({
        where: {
          groupId: groupIds,
        },
      });
      // Destroy the Group records.
      await Group.destroy({
        where: {
          id: groupIds,
        },
        force: true,
      });
      // Destroy the Grant records.
      await Grant.destroy({
        where: {
          id: grantIds,
        },
      });
      // Destroy the Recipient records.
      await Recipient.destroy({
        where: {
          id: recipientIds,
        },
      });
      // Destroy the User permissions.
      await Permission.destroy({
        where: {
          userId: groupUser.id,
        },
      });
      // Destroy the User record.
      await User.destroy({
        where: {
          id: groupUser.id,
        },
      });
    });

    it('get a public and private user groups for report region', async () => {
      const result = await groupsByRegion(1, groupUser.id);

      // From result get all the groups with ids in groupIds.
      const groupsToCheck = result.filter((g) => groupIds.includes(g.id));
      expect(groupsToCheck).toHaveLength(2);

      // Find the Group with the name 'Public Group Region 1'.
      const publicGroupRegion1 = groupsToCheck.find((g) => g.name === 'Public Group Region 1');
      expect(publicGroupRegion1).toBeDefined();

      // Find the Group with the name 'Private Group Region 1'.
      const privateGroupRegion1 = groupsToCheck.find((g) => g.name === 'Private Group Region 1');
      expect(privateGroupRegion1).toBeDefined();
    });

    it('get a public user groups for report region', async () => {
      const result = await groupsByRegion(1, faker.datatype.number());

      // From result get all the groups with ids in groupIds.
      const groupsToCheck = result.filter((g) => groupIds.includes(g.id));
      expect(groupsToCheck).toHaveLength(1);

      // Find the Group with the name 'Public Group Region 1'.
      const publicGroupRegion1 = groupsToCheck.find((g) => g.name === 'Public Group Region 1');
      expect(publicGroupRegion1).toBeDefined();
    });
  });

  describe('checkGroupNameAvailable', () => {
    let existingGroup;
    beforeAll(async () => {
      // Create a group.
      existingGroup = await Group.create({
        id: faker.datatype.number(),
        name: 'This group name is taken',
        isPublic: false,
      });
    });

    afterAll(async () => {
      // Destroy the group.
      await Group.destroy({
        where: {
          id: existingGroup.id,
        },
      });
    });

    it('the group name is in use', async () => {
      const result = await checkGroupNameAvailable('This GROUP NAME IS taken');
      expect(result).toBe(false);
    });

    it('the group name is not in use', async () => {
      const result = await checkGroupNameAvailable('This group name is available');
      expect(result).toBe(true);
    });
  });

  describe('potentialGroupUsers', () => {
    let creatorUser;
    let potentialCoOwner1;
    let potentialCoOwner2;
    let invalidCoowner;
    let invalidCoownerPermissions;
    let savedGroup;

    let usersToCleanup = [];

    beforeAll(async () => {
      // Get a role.
      const role = await Role.findOne({
        where: {
          name: 'CO',
        },
      });

      // Create saved group.Group.create(
      savedGroup = await Group.create({
        id: faker.datatype.number(),
        name: 'This is a saved group with an ID',
        isPublic: false,
      });

      // Creator users.
      creatorUser = await User.create({
        // name: faker.name.findName(),
        name: 'TEST creator',
        email: faker.internet.email(),
        password: faker.internet.password(),
        hsesUserId: faker.internet.email(),
        hsesUsername: faker.internet.email(),
        lastLogin: new Date(),
      });

      // Add user role for creator.
      await UserRole.create({
        userId: creatorUser.id,
        roleId: role.id,
      });

      // Add REGION 1 permissions for creator.
      await Permission.create({
        regionId: 1,
        userId: creatorUser.id,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        regionId: 1,
        userId: creatorUser.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      // Add REGION 2 permissions for creator.
      await Permission.create({
        regionId: 2,
        userId: creatorUser.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      // Creator creator GroupCollaborator.
      await GroupCollaborator.create({
        userId: creatorUser.id,
        groupId: savedGroup.id,
        collaboratorTypeId: creatorCollaboratorType.id,
      });

      // Potential co-owners.
      potentialCoOwner1 = await User.create({
        // name: faker.name.findName(),
        name: 'TEST potentialCoOwner1',
        email: faker.internet.email(),
        password: faker.internet.password(),
        hsesUserId: faker.internet.email(),
        hsesUsername: faker.internet.email(),
        lastLogin: new Date(),
      });

      // Add role for potentialCoOwner1.
      await UserRole.create({
        userId: potentialCoOwner1.id,
        roleId: role.id,
      });

      // Add REGION 1 permissions for Potential co-owner.
      await Permission.create({
        regionId: 1,
        userId: potentialCoOwner1.id,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        regionId: 1,
        userId: potentialCoOwner1.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      // Add REGION 2 permissions for Potential co-owner.
      await Permission.create({
        regionId: 2,
        userId: potentialCoOwner1.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      potentialCoOwner2 = await User.create({
        name: 'TEST potentialCoOwner2',
        // name: faker.name.findName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        hsesUserId: faker.internet.email(),
        hsesUsername: faker.internet.email(),
        lastLogin: new Date(),
      });

      // Add role for potentialCoOwner2.
      await UserRole.create({
        userId: potentialCoOwner2.id,
        roleId: role.id,
      });

      // Add REGION 1 permissions for Potential co-owner 2.
      await Permission.create({
        regionId: 1,
        userId: potentialCoOwner2.id,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        regionId: 1,
        userId: potentialCoOwner2.id,
        scopeId: SCOPES.APPROVE_REPORTS,
      });

      // Add REGION 2 permissions for Potential co-owner 2.
      await Permission.create({
        regionId: 2,
        userId: potentialCoOwner2.id,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      });

      // Invalid co-owner.
      invalidCoowner = await User.create({
        name: 'TEST invalidCoowner',
        // name: faker.name.findName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        hsesUserId: faker.internet.email(),
        hsesUsername: faker.internet.email(),
        lastLogin: new Date(),
      });

      // Add role for invalidCoowner.
      await UserRole.create({
        userId: invalidCoowner.id,
        roleId: role.id,
      });

      // Add REGION 1 permissions for Invalid co-owner 2.
      await Permission.create({
        regionId: 1,
        userId: invalidCoowner.id,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        regionId: 1,
        userId: invalidCoowner.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      // Invalid co-owner permissions.
      invalidCoownerPermissions = await User.create({
        name: 'TEST invalidCoowner permissions',
        // name: faker.name.findName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        hsesUserId: faker.internet.email(),
        hsesUsername: faker.internet.email(),
        lastLogin: new Date(),
      });

      // Add role for invalidCoowner permissions.
      await UserRole.create({
        userId: invalidCoownerPermissions.id,
        roleId: role.id,
      });

      // Add REGION 1 permissions for Invalid permission co-owner.
      await Permission.create({
        regionId: 1,
        userId: invalidCoownerPermissions.id,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        regionId: 1,
        userId: invalidCoownerPermissions.id,
        scopeId: SCOPES.READ_TRAINING_REPORTS,
      });

      await Permission.create({
        regionId: 2,
        userId: invalidCoownerPermissions.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      usersToCleanup = [
        creatorUser.id,
        potentialCoOwner1.id,
        potentialCoOwner2.id,
        invalidCoowner.id,
        invalidCoownerPermissions.id,
      ];
    });

    afterAll(async () => {
      // Destroy the group.
      await Group.destroy({
        where: {
          id: savedGroup.id,
        },
      });

      // Destroy the GroupCollaborator records.
      await GroupCollaborator.destroy({
        where: {
          groupId: savedGroup.id,
        },
      });

      // Destroy the User permissions.
      await Permission.destroy({
        where: {
          userId: usersToCleanup,
        },
      });

      // Destroy the User roles.
      await UserRole.destroy({
        where: {
          userId: usersToCleanup,
        },
      });

      // Destroy the User records.
      await User.destroy({
        where: {
          id: usersToCleanup,
        },
      });
    });
    it('get potential co-owners for saved group', async () => {
      const result = await potentialGroupUsers(savedGroup.id);
      expect(result).toHaveLength(2);
      const potentialCoOwnerIds = result.map((co) => co.userId);
      expect(potentialCoOwnerIds).toContain(potentialCoOwner1.id);
      expect(potentialCoOwnerIds).toContain(potentialCoOwner2.id);
    });

    it('get potential co-owners without having a saved group', async () => {
      const result = await potentialGroupUsers(null, creatorUser.id);
      expect(result).toHaveLength(2);
      const potentialCoOwnerIds = result.map((co) => co.userId);
      expect(potentialCoOwnerIds).toContain(potentialCoOwner1.id);
      expect(potentialCoOwnerIds).toContain(potentialCoOwner2.id);
    });
  });

  describe('potentialGroupRecipients', () => {
    let creatorUser;
    let savedGroup;

    let grantForGroupOne;
    let grantForGroupTwo;
    let grantForGroupThree;
    let grantForGroupFour;

    let recipientOne;
    let recipientTwo;
    let recipientThree;
    let recipientFour;
    let programOne;
    let programTwo;
    let programThree;
    let programFour;
    const recipientIdsToClean = [];

    let usersToCleanup = [];

    const dummyProgram = {
      startYear: '2020',
      startDate: '2020-09-01',
      endDate: '2020-09-02',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeAll(async () => {
      // Get a role.
      const role = await Role.findOne({
        where: {
          name: 'CO',
        },
      });

      // Create saved group.Group.create(
      savedGroup = await Group.create({
        id: faker.datatype.number(),
        name: 'This is a saved group with an ID',
        isPublic: false,
      });

      // Creator users.
      creatorUser = await User.create({
        // name: faker.name.findName(),
        name: 'TEST creator',
        email: faker.internet.email(),
        password: faker.internet.password(),
        hsesUserId: faker.internet.email(),
        hsesUsername: faker.internet.email(),
        lastLogin: new Date(),
      });

      // Add user role for creator.
      await UserRole.create({
        userId: creatorUser.id,
        roleId: role.id,
      });

      // Add REGION 1 permissions for creator.
      await Permission.create({
        regionId: 1,
        userId: creatorUser.id,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        regionId: 1,
        userId: creatorUser.id,
        scopeId: SCOPES.READ_REPORTS,
      });

      // Add REGION 2 permissions for creator.
      await Permission.create({
        regionId: 2,
        userId: creatorUser.id,
        scopeId: SCOPES.READ_TRAINING_REPORTS,
      });

      // Add REGION 3 permissions for creator.
      await Permission.create({
        regionId: 3,
        userId: creatorUser.id,
        scopeId: SCOPES.APPROVE_REPORTS,
      });

      // Creator creator GroupCollaborator.
      await GroupCollaborator.create({
        userId: creatorUser.id,
        groupId: savedGroup.id,
        collaboratorTypeId: creatorCollaboratorType.id,
      });

      usersToCleanup = [
        creatorUser.id,
      ];

      // Create recipients.
      recipientOne = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      recipientTwo = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      recipientThree = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      recipientFour = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      recipientIdsToClean.push(recipientOne.id);
      recipientIdsToClean.push(recipientTwo.id);
      recipientIdsToClean.push(recipientThree.id);
      recipientIdsToClean.push(recipientFour.id);

      // Create grants.
      grantForGroupOne = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientOne.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      });

      grantForGroupTwo = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientTwo.id,
        regionId: 2,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      });

      grantForGroupThree = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientThree.id,
        regionId: 3,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      });

      // Linked to GrantGroup (should be excluded).
      grantForGroupFour = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipientFour.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      });

      // Create GroupGrant (should be excluded).
      await GroupGrant.create({
        groupId: savedGroup.id,
        grantId: grantForGroupFour.id,
      });

      // Create a programs.
      programOne = await Program.create({
        ...dummyProgram,
        id: faker.datatype.number(),
        name: faker.name.findName(),
        grantId: grantForGroupOne.id,
        programType: 'EHS',
      });

      programTwo = await Program.create({
        ...dummyProgram,
        id: faker.datatype.number(),
        name: faker.name.findName(),
        grantId: grantForGroupTwo.id,
        programType: 'EHS',
      });

      programThree = await Program.create({
        ...dummyProgram,
        id: faker.datatype.number(),
        name: faker.name.findName(),
        grantId: grantForGroupThree.id,
        programType: 'EHS',
      });

      programFour = await Program.create({
        ...dummyProgram,
        id: faker.datatype.number(),
        name: faker.name.findName(),
        grantId: grantForGroupFour.id,
        programType: 'EHS',
      });
    });

    afterAll(async () => {
      // Destroy the programs.
      await Program.destroy({
        where: {
          id: [programOne.id, programTwo.id, programThree.id, programFour.id],
        },
      });

      // Destroy the group grant.
      await GroupGrant.destroy({
        where: {
          groupId: savedGroup.id,
        },
      });

      // Destroy the group.
      await Group.destroy({
        where: {
          id: savedGroup.id,
        },
      });

      // Destroy the GroupCollaborator records.
      await GroupCollaborator.destroy({
        where: {
          groupId: savedGroup.id,
        },
      });

      // Destroy the User permissions.
      await Permission.destroy({
        where: {
          userId: usersToCleanup,
        },
      });

      // Destroy the User roles.
      await UserRole.destroy({
        where: {
          userId: usersToCleanup,
        },
      });

      // Destroy Grants.
      await Grant.destroy({
        where: {
          recipientId: recipientIdsToClean,
        },
      });

      // Destroy the Recipient records.
      await Recipient.destroy({
        where: {
          id: recipientIdsToClean,
        },
      });

      // Destroy the User records.
      await User.destroy({
        where: {
          id: usersToCleanup,
        },
      });
    });
    it('get potential recipients for saved group', async () => {
      const result = await potentialRecipientGrants({
        groupId: savedGroup.id, userId: creatorUser.id,
      });
      const grantsToCheck = result.filter((g) => [
        grantForGroupOne.id,
        grantForGroupTwo.id,
        grantForGroupThree.id,
      ].includes(g.grantId));

      expect(grantsToCheck).toHaveLength(2);
      const grantIds = grantsToCheck.map((g) => g.grantId);
      expect(grantIds).toContain(grantForGroupOne.id);
      expect(grantIds).toContain(grantForGroupThree.id);
    });
    it('get potential recipients without having a saved group', async () => {
      const result = await potentialRecipientGrants({
        groupId: null, userId: creatorUser.id,
      });
      const grantsToCheck = result.filter((g) => [
        grantForGroupOne.id,
        grantForGroupTwo.id,
        grantForGroupThree.id,
      ].includes(g.grantId));

      expect(grantsToCheck).toHaveLength(2);
      const grantIds = grantsToCheck.map((g) => g.grantId);
      expect(grantIds).toContain(grantForGroupOne.id);
      expect(grantIds).toContain(grantForGroupThree.id);
    });
  });
});
