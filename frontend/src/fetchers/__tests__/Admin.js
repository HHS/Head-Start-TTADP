import join from 'url-join';
import fetchMock from 'fetch-mock';

import {
  getUsers,
  updateUser,
  getRecipients,
  getFeatures,
  getRedisInfo,
  flushRedis,
  deleteNationalCenter,
  createNationalCenter,
  updateNationalCenter,
  getCuratedTemplates,
  getCreatorsByRegion,
  getGroupsByRegion,
  createMultiRecipientGoalsFromAdmin,
  closeMultiRecipientGoalsFromAdmin,
  updateLegacyUsers,
  importCsv,
} from '../Admin';

describe('Admin', () => {
  afterEach(() => fetchMock.restore());

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

  describe('importCsv', () => {
    it('calls the import path passed in', async () => {
      const response = { name: 'training-reports' };
      fetchMock.post(join('/', 'api', 'admin', 'training-reports'), response);
      const importResponse = await importCsv('training-reports', {});
      expect(importResponse).toEqual(response);
    });
  });

  describe('getRecipients', () => {
    it('gets recipients', async () => {
      fetchMock.get(join('/', 'api', 'admin', 'recipients'), recipients);
      const fetchedRecipients = await getRecipients();
      expect(fetchedRecipients).toEqual(recipients);
    });
  });

  describe('getRedisInfo', () => {
    it('gets redis info', async () => {
      const info = { info: 'info' };
      fetchMock.get(join('/', 'api', 'admin', 'redis', 'info'), info);
      const fetchedInfo = await getRedisInfo();
      expect(fetchedInfo).toEqual(info);
    });
  });

  describe('flushRedis', () => {
    it('flushes redis', async () => {
      const res = { flushed: true };
      fetchMock.post(join('/', 'api', 'admin', 'redis', 'flush'), res);
      const flushed = await flushRedis();
      expect(flushed).toEqual(res);
    });
  });

  describe('goals', () => {
    it('getCuratedTemplates', async () => {
      const res = { templates: [] };
      fetchMock.get(join('/', 'api', 'admin', 'goals', 'curated-templates'), res);
      const templates = await getCuratedTemplates();
      expect(templates).toEqual(res);
    });
  });

  describe('groups', () => {
    it('getGroupsByRegion', async () => {
      const res = { groups: [] };
      fetchMock.get(join('/', 'api', 'admin', 'groups', 'region', '1'), res);
      const groups = await getGroupsByRegion(1);
      expect(groups).toEqual(res);
    });
  });

  describe('getCreatorsByRegion', () => {
    it('gets creators by region', async () => {
      const res = { creators: [] };
      fetchMock.get(join('/', 'api', 'admin', 'users', 'creators', 'region', '1'), res);
      const creators = await getCreatorsByRegion(1);
      expect(creators).toEqual(res);
    });
  });

  describe('createMultiRecipientGoalsFromAdmin', () => {
    it('creates goals', async () => {
      const res = { created: true };
      fetchMock.post(join('/', 'api', 'admin', 'goals'), res);
      const created = await createMultiRecipientGoalsFromAdmin({});
      expect(created).toEqual(res);
    });
  });

  describe('closeMultiRecipientGoalsFromAdmin', () => {
    it('closes goals', async () => {
      const res = { closed: true };
      fetchMock.put(join('/', 'api', 'admin', 'goals', 'close'), res);
      const created = await closeMultiRecipientGoalsFromAdmin({});
      expect(created).toEqual(res);
    });
  });

  describe('legacyReports', () => {
    it('updateLegacyUsers', async () => {
      const res = { updated: true };
      fetchMock.put(join('/', 'api', 'admin', 'legacy-reports', '1', 'users'), res);
      const updated = await updateLegacyUsers(1, {});
      expect(updated).toEqual(res);
    });
  });

  describe('nationalCenters', () => {
    describe('createNationalCenter', () => {
      it('creates a national center', async () => {
        const res = { created: true };
        fetchMock.post(join('/', 'api', 'admin', 'national-center'), res);
        const created = await createNationalCenter({});
        expect(created).toEqual(res);
      });
    });

    describe('updateNationalCenter', () => {
      it('updates a national center', async () => {
        const res = { updated: true };
        fetchMock.put(join('/', 'api', 'admin', 'national-center', '1'), res);
        const updated = await updateNationalCenter(1, {});
        expect(updated).toEqual(res);
      });
    });

    describe('deleteNationalCenter', () => {
      it('deletes a national center', async () => {
        const res = { deleted: true };
        fetchMock.delete(join('/', 'api', 'admin', 'national-center', '1'), res);
        const deleted = await deleteNationalCenter(1);
        expect(deleted).toEqual(res);
      });
    });
  });
});
