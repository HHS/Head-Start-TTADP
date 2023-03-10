import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  fetchGroup, fetchGroups, createGroup, updateGroup, deleteGroup,
} from '../groups';

const groupsUrl = join('/', 'api', 'groups');

describe('groups fetcher', () => {
  afterEach(() => fetchMock.reset());
  it('fetchGroups', async () => {
    fetchMock.get(groupsUrl, [{ id: 1, name: 'Group 1' }]);
    const groups = await fetchGroups();

    expect(groups).toEqual([{ id: 1, name: 'Group 1' }]);
  });
  it('fetchGroup', async () => {
    fetchMock.get(join(groupsUrl, String(1)), { id: 1, name: 'Group 1' });
    const group = await fetchGroup(1);

    expect(group).toEqual({ id: 1, name: 'Group 1' });
  });

  it('createGroup', async () => {
    fetchMock.post(groupsUrl, { id: 1, name: 'Group 1' });
    const group = await createGroup({ name: 'Group 1' });

    expect(group).toEqual({ id: 1, name: 'Group 1' });
  });
  it('updateGroup', async () => {
    fetchMock.put(join(groupsUrl, '1'), { id: 1, name: 'Group 1' });
    const group = await updateGroup({ id: 1, name: 'Group 1' });

    expect(group).toEqual({ id: 1, name: 'Group 1' });
  });
  it('deleteGroup', async () => {
    fetchMock.delete(join(groupsUrl, '1'), { id: 1, name: 'Group 1' });
    const group = await deleteGroup(1);

    expect(group).toEqual({ id: 1, name: 'Group 1' });
  });
});
