import fetchMock from 'fetch-mock';
import join from 'url-join';
import { getNotifications } from '../notifications';

const feedUrl = join('/', 'api', 'feeds');

describe('notifications fetcher', () => {
  afterEach(() => fetchMock.reset());
  it('getNotifications', async () => {
    const whatsNewUrl = join(feedUrl, 'whats-new');
    const response = '<html><some-weird-xml-tag attr="guid" /></html>';
    fetchMock.get(whatsNewUrl, response);
    const results = await getNotifications();
    expect(results).toEqual(response);
  });
});
