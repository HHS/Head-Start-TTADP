import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import ViewTtaRequest from '..';

const URL = '/api/tta-requests/14322';

const SUBMITTED_REQUEST = {
  id: 14322,
  displayId: 'R14-REQ-14322',
  regionId: 14,
  status: 'submitted',
  recipientAware: true,
  originator: 'TTA Staff',
  context: '<p>Lorem ipsum dolor sit amet</p>',
  creatorNotes: '',
  // midday UTC, so the dates read the same in every US time zone
  createdAt: '2026-06-23T16:00:00.000Z',
  submittedAt: '2026-06-23T17:00:00.000Z',
  creator: { id: 1, name: 'Annika Lewis' },
  reviewer: { id: 2, name: 'Monica Geller' },
  recipient: { id: 3, name: 'Children and Families First' },
  grants: [
    {
      id: 4,
      regionId: 14,
      numberWithProgramTypes: '14HP1234 - EHS',
      name: 'Children and Families First - 14HP1234 - EHS',
    },
  ],
  goalTemplate: {
    id: 5,
    templateName: 'The recipient will develop and implement a QIP/CAP',
    standard: 'Monitoring',
  },
  citations: [
    { citation: '1302.91(e)(1)', findingType: 'ANC' },
    { citation: '1302.91(e)(2)(ii)', findingType: null },
  ],
};

const renderView = () => {
  const history = createMemoryHistory({ initialEntries: ['/tta-requests/view/14322'] });
  render(
    <AppLoadingContext.Provider
      value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}
    >
      <Router history={history}>
        <Route path="/tta-requests/view/:ttaRequestId">
          <ViewTtaRequest />
        </Route>
      </Router>
    </AppLoadingContext.Provider>
  );
  return history;
};

describe('ViewTtaRequest', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('shows the submitted request', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'TTA Request R14-REQ-14322' })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /back to tta requests/i })).toHaveAttribute(
      'href',
      '/tta-requests'
    );

    expect(screen.getByText('Creator:').parentElement).toHaveTextContent('Annika Lewis');
    expect(screen.getByText('Reviewer:').parentElement).toHaveTextContent('Monica Geller');
    expect(screen.getByText('Date created:').parentElement).toHaveTextContent('06/23/2026');
    expect(screen.getByText('Date submitted:').parentElement).toHaveTextContent('06/23/2026');

    expect(screen.getByRole('heading', { name: 'Who is the request for?' })).toBeVisible();
    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
    expect(screen.getByText('Yes')).toBeVisible();
    expect(screen.getByText('TTA Staff')).toBeVisible();

    expect(screen.getByRole('heading', { name: 'Goal and context' })).toBeVisible();
    expect(screen.getByText('Lorem ipsum dolor sit amet')).toBeVisible();
    expect(screen.getByText('The recipient will develop and implement a QIP/CAP')).toBeVisible();
    expect(screen.getByText('ANC - 1302.91(e)(1)')).toBeVisible();
    expect(screen.getByText('1302.91(e)(2)(ii)')).toBeVisible();
  });

  it('leaves out the citations when there are none', async () => {
    fetchMock.get(URL, { ...SUBMITTED_REQUEST, citations: [] });
    renderView();

    await screen.findByRole('heading', { name: 'Goal and context' });
    expect(screen.queryByText('Citations addressed')).toBeNull();
  });

  it('sends the user to the error page when the request cannot load', async () => {
    fetchMock.get(URL, 403);
    const history = renderView();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/something-went-wrong/403');
    });
  });
});
