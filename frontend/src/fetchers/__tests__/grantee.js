import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getGrantee } from '../grantee';

const granteeUrl = join('/', 'api', 'grantee');

describe('grantee fetcher', () => {
  beforeEach(() => fetchMock.reset());
  it('test that it retrieves a grantee', async () => {
    const url = join(granteeUrl, '1', '?region=1');
    fetchMock.getOnce(url, { name: 'Tim Johnson the Grantee' });
    const res = await getGrantee(1, 1);
    expect(res.name).toBe('Tim Johnson the Grantee');
  });
  it('tests that it requires a int for grantee id', async () => {
    await expect(async () => {
      await getGrantee('tim');
    }).rejects.toEqual(Error('Error: Grantee ID must be a number'));
  });
});
