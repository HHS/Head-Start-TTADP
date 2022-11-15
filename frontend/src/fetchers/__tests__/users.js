import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getStateCodes, requestVerificationEmail } from '../users';

const usersUrl = join('/', 'api', 'users');

describe('users fetcher', () => {
  beforeEach(() => fetchMock.reset());
  it('calls the correct states code url', async () => {
    const url = join(usersUrl, 'stateCodes');
    fetchMock.getOnce(url, ['CT', 'ME']);
    const res = await getStateCodes();
    expect(res.length).toBe(2);
  });

  it('calls /api/users/send-verification-email', async () => {
    fetchMock.postOnce(
      join('/', 'api', 'users', 'send-verification-email'),
      { status: 200 },
    );
    const res = await requestVerificationEmail();
    expect(res.status).toBe(200);
  });
});
