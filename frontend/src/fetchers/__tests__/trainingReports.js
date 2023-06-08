import fetchMock from 'fetch-mock';
import { getEventsByStatus } from '../trainingReports';
import { EVENT_STATUS } from '../../pages/TrainingReports/constants';

describe('training reports fetcher', () => {
  beforeEach(() => fetchMock.reset());

  it('fetches events by status', async () => {
    fetchMock.get(`/api/events/${EVENT_STATUS.NOT_STARTED}`, []);
    await getEventsByStatus(EVENT_STATUS.NOT_STARTED);
    expect(fetchMock.called()).toBeTruthy();
  });
});
