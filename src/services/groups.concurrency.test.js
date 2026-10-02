import { GROUP_SHARED_WITH } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import { createUser } from '../testUtils';
import { editGroup } from './groups';

const {
  sequelize, Group, GroupCollaborator, Permission, User,
} = db;

describe('groups concurrency', () => {
  let group;
  let user;

  beforeAll(async () => {
    group = await Group.create({ name: 'concurrency test group', isPublic: false });
    user = await createUser();
    // `group()` (called at the end of editGroup) inner-joins through Permission, so the test
    // user needs at least one to be found in the response.
    await Permission.create({ userId: user.id, regionId: 1, scopeId: SCOPES.READ_REPORTS });
  });

  afterEach(async () => {
    await GroupCollaborator.destroy({ where: { groupId: group.id }, force: true });
  });

  afterAll(async () => {
    await Permission.destroy({ where: { userId: user.id }, force: true });
    await Group.destroy({ where: { id: group.id }, force: true });
    await User.destroy({ where: { id: user.id } });
    await sequelize.close();
  });

  it('adding the same co-owner twice concurrently does not throw and creates exactly one row', async () => {
    const data = {
      grants: [],
      coOwners: [user.id],
      individuals: [],
      isPublic: false,
      sharedWith: GROUP_SHARED_WITH.INDIVIDUALS,
      name: 'concurrency test group',
    };

    await expect(
      Promise.all([editGroup(group.id, data), editGroup(group.id, data)])
    ).resolves.not.toThrow();

    const rows = await GroupCollaborator.findAll({
      where: { groupId: group.id, userId: user.id },
    });

    expect(rows.length).toBe(1);
  });
});
