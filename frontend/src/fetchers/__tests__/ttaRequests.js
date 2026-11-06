import fetchMock from 'fetch-mock';
import {
  getTtaRequest,
  getTtaRequestReviewers,
  getTtaRequestsByRecipient,
  reviewTtaRequest,
  saveTtaRequest,
  submitTtaRequest,
} from '../ttaRequests';

describe('TTA requests fetcher', () => {
  afterEach(() => fetchMock.restore());

  it('fetches a request', async () => {
    fetchMock.get('/api/tta-requests/42', { id: 42 });
    expect(await getTtaRequest(42)).toEqual({ id: 42 });
  });

  it("fetches a region's reviewers", async () => {
    fetchMock.get('/api/tta-requests/region/14/reviewers', [{ id: 6 }]);
    expect(await getTtaRequestReviewers(14)).toEqual([{ id: 6 }]);
  });

  it("fetches a recipient's requests in a region", async () => {
    fetchMock.get('/api/tta-requests/region/14/recipient/3', { count: 0, rows: [] });
    expect(await getTtaRequestsByRecipient(14, 3)).toEqual({ count: 0, rows: [] });
  });

  it('saves a request', async () => {
    fetchMock.put('/api/tta-requests/42', { id: 42 });
    await saveTtaRequest(42, { context: 'x' });
    expect(JSON.parse(fetchMock.lastOptions().body)).toEqual({ context: 'x' });
  });

  it('submits a request for review', async () => {
    fetchMock.put('/api/tta-requests/42/submit', { id: 42, status: 'submitted' });
    expect(await submitTtaRequest(42, { reviewerId: 6 })).toEqual({ id: 42, status: 'submitted' });
    expect(JSON.parse(fetchMock.lastOptions().body)).toEqual({ reviewerId: 6 });
  });

  it("sends the reviewer's review", async () => {
    const review = { status: 'needs_action', note: 'Add the agenda' };
    fetchMock.put('/api/tta-requests/42/review', { id: 42, status: 'needs_action' });

    const reviewed = await reviewTtaRequest(42, review);

    expect(reviewed).toEqual({ id: 42, status: 'needs_action' });
    expect(fetchMock.lastCall()[0]).toBe('/api/tta-requests/42/review');
    expect(fetchMock.lastOptions().method).toBe('PUT');
    expect(JSON.parse(fetchMock.lastOptions().body)).toEqual(review);
  });
});
