import faker from '@faker-js/faker';
import SCOPES from '../middleware/scopeConstants';
import {
  User,
  Group,
  GroupGrant,
  Permission,
  Recipient,
  Grant,
  sequelize,
} from '../models';
import {
  groupsByRegion,
  groups,
  group,
  createNewGroup,
  editGroup,
  destroyGroup,
} from './groups';

describe('Groups service', () => {
  let mockUser;
  let mockUserTwo;
  let recipient;
  let grantOne;
  let grantTwo;
  let existingGroupToEdit;
  let groupToDelete;
  let publicGroup;

  beforeAll(async () => {
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
      userId: mockUser.id,
      isPublic: false,
    });

    // add the first grant to the group
    await GroupGrant.create({
      groupId: existingGroupToEdit.id,
      grantId: grantOne.id,
    });

    // create a group to delete
    groupToDelete = await Group.create({
      name: 'Group 2',
      userId: mockUser.id,
      isPublic: false,
    });

    // add the second grant to the group
    await GroupGrant.create({
      groupId: groupToDelete.id,
      grantId: grantTwo.id,
    });

    // create a public group
    publicGroup = await Group.create({
      name: 'Public Group',
      userId: mockUserTwo.id,
      isPublic: true,
    });

    await GroupGrant.create({
      groupId: publicGroup.id,
      grantId: grantTwo.id,
    });
  });

  afterAll(async () => {
    await GroupGrant.destroy({
      where: {
        grantId: [grantOne.id, grantTwo.id],
      },
    });

    await Group.destroy({
      where: {
        userId: [mockUser.id, mockUserTwo.id],
      },
    });

    await Grant.destroy({
      where: {
        id: [grantOne.id, grantTwo.id],
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await Permission.destroy({
      where: {
        userId: [mockUser.id, mockUserTwo.id],
      },
    });

    await User.destroy({
      where: {
        id: [mockUser.id, mockUserTwo.id],
      },
    });

    await sequelize.close();
  });

  describe('groups', () => {
    it('returns a list of groups', async () => {
      const result = await groups(mockUser.id, [1]);
      expect(result).toHaveLength(3);

      const groupNames = result.map((gr) => gr.name);
      expect(groupNames).toContain('Group 1');
      expect(groupNames).toContain('Group 2');
      expect(groupNames).toContain('Public Group');
    });

    it('returns a list of groups by region', async () => {
      const result = await groupsByRegion(1);
      expect(result).toHaveLength(3);

      const groupNames = result.map((gr) => gr.name);
      expect(groupNames).toContain('Group 1');
      expect(groupNames).toContain('Group 2');
      expect(groupNames).toContain('Public Group');
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

      let currentGroupGrants = await GroupGrant.findAll({
        where: {
          groupId: existingGroupToEdit.id,
        },
      });

      expect(currentGroupGrants).toHaveLength(1);
      expect(currentGroupGrants[0].grantId).toBe(grantTwo.id);

      // we run again to make sure that the group grants are not duplicated
      const result2 = await editGroup(existingGroupToEdit.id, {
        name: 'Group 1 Edited',
        grants: [grantTwo.id],
        userId: mockUser.id,
        isPublic: true,
      });

      expect(result2).toHaveProperty('id');
      expect(result2).toHaveProperty('name');
      expect(result2.name).toBe('Group 1 Edited');
      expect(result2.isPublic).toBe(true);

      currentGroupGrants = await GroupGrant.findAll({
        where: {
          groupId: existingGroupToEdit.id,
        },
      });

      expect(currentGroupGrants).toHaveLength(1);
      expect(currentGroupGrants[0].grantId).toBe(grantTwo.id);
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
        userId: groupUser.id,
        isPublic: true,
      });

      // Create a private group for the user.
      const privateGroupRegion1 = await Group.create({
        name: 'Private Group Region 1',
        userId: groupUser.id,
        isPublic: false,
      });

      // Create a public group for region 2.
      const publicGroupRegion2 = await Group.create({
        name: 'Public Group Region 2',
        userId: groupUser.id,
        isPublic: true,
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
      });

      // Destroy the Grant records.
      await Grant.destroy({
        where: {
          id: grantIds,
        },
        individualHooks: true,
      });

      // Destroy the Recipient records.
      await Recipient.destroy({
        where: {
          id: recipientIds,
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
});
