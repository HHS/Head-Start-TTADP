import join from 'url-join';
import fetchMock from 'fetch-mock';

import { fetchUser, fetchLogout } from '../Auth';

describe('Auth', () => {
  afterEach(() => fetchMock.restore());

  describe('user', () => {
    it('grabs user info', async () => {
      const apiUser = { userId: 1, role: 'ROLE', name: 'name' };
      fetchMock.get(join('api', 'user'), { ...apiUser });
      const fetchedIser = await fetchUser();
      expect(fetchedIser).toEqual(apiUser);
    });

    it('throws for a 401', async () => {
      fetchMock.get(join('api', 'user'), 401);
      await expect(fetchUser()).rejects.toThrow(Error);
    });
  });

  describe('logout', () => {
    it('does not throw if successful', async () => {
      fetchMock.get(join('api', 'logout'), 200);
      await expect(fetchLogout()).resolves.not.toThrow();
    });

    it('does not throw if not successful', async () => {
      fetchMock.get(join('api', 'logout'), 401);
      await expect(fetchLogout()).resolves.not.toThrow(Error);
    });
  });
});
