import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';

import Diag from '../diag';

const defaultBaseUrl =
  '/api/admin/requestErrors?filter=%7B%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D';
const encodedSearch = (filter, displayedFilters = {}) =>
  `?filter=${encodeURIComponent(JSON.stringify(filter))}&displayedFilters=${encodeURIComponent(JSON.stringify(displayedFilters))}`;

describe('Diag', () => {
  let history;

  afterEach(() => {
    fetchMock.restore();
    window.location.hash = '';
  });

  beforeEach(() => {
    history = createMemoryHistory();
    fetchMock.get(defaultBaseUrl, [
      {
        id: '4',
        operation: 'OPERATION',
        uri: 'http://smarthub',
        method: 'POST',
        requestBody: { foo: 'bar' },
        responseBody: { error: { foo: 'encountered problems' } },
        responseCode: '400',
        createdAt: '2021-07-01T14:37:04.730Z',
        updatedAt: '2021-07-01T14:37:04.730Z',
      },
    ]);
  });

  const RenderDiag = () => (
    <Router history={history}>
      <Diag />
    </Router>
  );

  it('renders the main view', async () => {
    render(<RenderDiag />);
    expect((await screen.findAllByText('Monitoring Citations')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Grant Delivered Reviews')).length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: /request errors/i })).toBeInTheDocument();
  });

  it('uses hash route search params when rendering a monitoring diagnostic resource list', async () => {
    const citationListRequest = /\/api\/admin\/citations\?/;
    window.location.hash = `#/citations${encodedSearch({ reviewName: 'Hash review' }, { reviewName: true })}`;
    fetchMock.get(citationListRequest, {
      body: [
        {
          id: 1,
          reviewName: 'Hash review',
        },
      ],
      headers: {
        'Content-Range': 'citations */1',
      },
    });

    render(<RenderDiag />);

    await screen.findByRole('heading', { name: /monitoring citations/i });
    await waitFor(() => expect(fetchMock.called(citationListRequest)).toBe(true));

    const [requestedUrl] = fetchMock.lastCall(citationListRequest);
    const requestedSearch = new URL(requestedUrl, 'http://localhost').searchParams;

    expect(JSON.parse(requestedSearch.get('filter'))).toMatchObject({
      reviewName: 'Hash review',
    });
    expect(JSON.parse(requestedSearch.get('sort'))).toEqual([
      'latest_report_delivery_date',
      'DESC',
    ]);
  });
});
