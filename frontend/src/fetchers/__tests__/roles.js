import fetchMock from 'fetch-mock';
import { getRoles, getSpecialistRoles } from '../roles';

describe('roles fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('fetches roles', async () => {
    fetchMock.get('/api/role', []);
    await getRoles();

    expect(fetchMock.called()).toBeTruthy();
  });

  it('fetches specialist roles', async () => {
    fetchMock.get('/api/role/specialists', []);
    await getSpecialistRoles();

    expect(fetchMock.called()).toBeTruthy();
  });
});
