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
  groups,
  group,
  createNewGroup,
  editGroup,
  destroyGroup,
} from './groups';

describe('Groups service', () => {
  let mockUser;
  let recipient;
  let grantOne;
  let grantTwo;
  let existingGroupToEdit;
  let groupToDelete;

  beforeAll(async () => {
    mockUser = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      hsesUserId: faker.internet.email(),
      hsesUsername: faker.internet.email(),
    });

    await Permission.create({
      regionId: 1,
      userId: mockUser.id,
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
    });

    // create a second grant
    grantTwo = await Grant.create({
      id: faker.datatype.number(),
      number: faker.datatype.string(),
      recipientId: recipient.id,
      regionId: 1,
    });

    // create a group to edit
    existingGroupToEdit = await Group.create({
      name: 'Group 1',
      userId: mockUser.id,
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
    });

    // add the second grant to the group
    await GroupGrant.create({
      groupId: groupToDelete.id,
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
        userId: mockUser.id,
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
        userId: mockUser.id,
      },
    });

    await User.destroy({
      where: {
        id: mockUser.id,
      },
    });

    await sequelize.close();
  });

  describe('groups', () => {
    it('returns a list of groups', async () => {
      const result = await groups(mockUser.id);
      expect(result).toHaveLength(2);
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
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Group 3');
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
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('Group 1 Edited');

      const currentGroupGrants = await GroupGrant.findAll({
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
});
