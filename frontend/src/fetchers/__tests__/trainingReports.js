import join from 'url-join';
import fetchMock from 'fetch-mock';
import { getEventsByStatus } from '../trainingReports';
import { EVENT_STATUS } from '../../pages/TrainingReports/constants';

describe('training reports fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('fetches events by status', async () => {
    const eventUrl2 = join('/', 'api', 'events', EVENT_STATUS.NOT_STARTED);
    fetchMock.get(eventUrl2, []);
    await getEventsByStatus(EVENT_STATUS.NOT_STARTED, '');
    expect(fetchMock.called()).toBeTruthy();
  });
});
