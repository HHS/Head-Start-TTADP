import fetchMock from 'fetch-mock';
import { updateObjectiveStatus } from '../objective';
import { OBJECTIVE_STATUS } from '../../Constants';

describe('objectives fetcher', () => {
  afterEach(() => {
    fetchMock.restore();
  });
  it('should call the updateObjectiveStatus endpoint', async () => {
    const ids = [1, 2, 3];
    const regionId = 1;
    const status = OBJECTIVE_STATUS.IN_PROGRESS;
    const closeSuspendContext = '';
    const closeSuspendReason = '';
    fetchMock.put('/api/objectives/status', { success: true });
    const data = await updateObjectiveStatus(ids, regionId, status);
    expect(fetchMock.lastUrl()).toBe('/api/objectives/status');
    expect(fetchMock.lastOptions()).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({
        ids,
        regionId,
        status,
        closeSuspendReason,
        closeSuspendContext,
      }),
    });

    expect(data).toEqual({ success: true });
  });
});
