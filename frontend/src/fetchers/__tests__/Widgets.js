import join from 'url-join';
import fetchMock from 'fetch-mock';
import fetchWidget from '../Widgets';

describe('fetchWidget', () => {
  it('fetches with the right params', async () => {
    const widgetId = 'test';
    const query = '&region.in[]=1';
    const widgetUrl = join('/', 'api', 'widgets', `${widgetId}?${query}`);
    fetchMock.get(widgetUrl, {});
    await fetchWidget(widgetId, query);
    expect(fetchMock.called()).toBeTruthy();
  });
});
