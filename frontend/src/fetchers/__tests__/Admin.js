import join from 'url-join';
import fetchMock from 'fetch-mock';

import {
  getUsers, updateUser, getCDIGrants, getRecipients, assignCDIGrant, getFeatures,
} from '../Admin';

describe('Admin', () => {
  afterEach(() => fetchMock.restore());

  const grants = [
    {
      id: 1,
    },
  ];

  const recipients = [
    {
      id: 1,
    },
  ];

  describe('getUsers', () => {
    it('grabs all users', async () => {
      const users = [
        {
          id: 1,
        },
        {
          id: 2,
        },
      ];
      fetchMock.get(join('api', 'admin', 'users'), users);
      const fetchedUsers = await getUsers();
      expect(fetchedUsers).toEqual(users);
    });
  });

  it('fetches features', async () => {
    const res = ['grantee_record_page'];
    fetchMock.get(join('api', 'admin', 'users', 'features'), res);
    const features = await getFeatures();
    expect(features).toEqual(res);
  });

  describe('updateUser', () => {
    it('calls update and returns the user', async () => {
      const user = { id: 1 };
      fetchMock.put(join('api', 'admin', 'users', '1'), user);
      const fetchedUser = await updateUser(1, {});
      expect(fetchedUser).toEqual(user);
    });
  });

  describe('getCDIGrants', () => {
    it('can get only unassigned CDI grants', async () => {
      fetchMock.get(join('/', 'api', 'admin', 'grants', 'cdi?unassigned=true&active=true'), grants);
      const fetchedGrants = await getCDIGrants();
      expect(fetchedGrants).toEqual(grants);
    });

    it('gets CDI grants', async () => {
      fetchMock.get(join('/', 'api', 'admin', 'grants', 'cdi?unassigned=false&active=true'), grants);
      const fetchedGrants = await getCDIGrants(false);
      expect(fetchedGrants).toEqual(grants);
    });
  });

  describe('getRecipients', () => {
    it('gets recipients', async () => {
      fetchMock.get(join('/', 'api', 'admin', 'recipients'), recipients);
      const fetchedRecipients = await getRecipients();
      expect(fetchedRecipients).toEqual(recipients);
    });
  });

  describe('assignCDIGrant', () => {
    it('calls update and returns the grant', async () => {
      fetchMock.put(join('/', 'api', 'admin', 'grants', 'cdi', '1'), grants[0]);
      const updatedGrant = await assignCDIGrant(1, 2, 3);
      expect(updatedGrant).toEqual(grants[0]);
    });
  });
});
