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
  creator: { id: 1, name: 'Avery Example', fullName: 'Avery Example, GS' },
  reviewer: { id: 2, name: 'Jordan Sample', fullName: 'Jordan Sample, TTAC' },
  recipient: { id: 3, name: 'Sample Recipient Agency' },
  grants: [
    {
      id: 4,
      regionId: 14,
      numberWithProgramTypes: '14HP1234 - EHS',
      name: 'Sample Recipient Agency - 14HP1234 - EHS',
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

const renderView = (props = {}) => {
  const history = createMemoryHistory({ initialEntries: ['/tta-requests/view/14322'] });
  render(
    <AppLoadingContext.Provider
      value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}
    >
      <Router history={history}>
        <Route path="/tta-requests/view/:ttaRequestId">
          <ViewTtaRequest {...props} />
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

  it('goes back to the list it was opened from', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView({ backLinkTo: '/recipient-tta-records/3/region/14/tta-request' });

    expect(await screen.findByRole('link', { name: /back to tta requests/i })).toHaveAttribute(
      'href',
      '/recipient-tta-records/3/region/14/tta-request'
    );
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

    expect(screen.getByText('Creator:').parentElement).toHaveTextContent('Avery Example, GS');
    expect(screen.getByText('Reviewer:').parentElement).toHaveTextContent('Jordan Sample, TTAC');
    expect(screen.getByText('Date Created:').parentElement).toHaveTextContent('06/23/2026');
    expect(screen.getByText('Date submitted:').parentElement).toHaveTextContent('06/23/2026');

    expect(screen.getByRole('heading', { name: 'Who is the request for?' })).toBeVisible();
    const grant = screen.getByText('Sample Recipient Agency - 14HP1234 - EHS');
    expect(grant).toBeVisible();
    // the grants are not bulleted
    expect(grant.closest('li')).toBeNull();
    expect(screen.getByText('Yes')).toBeVisible();
    expect(screen.getByText('TTA Staff')).toBeVisible();

    expect(screen.getByRole('heading', { name: 'Goal and context' })).toBeVisible();
    const context = screen.getByText('Lorem ipsum dolor sit amet');
    expect(context).toBeVisible();
    const goal = screen.getByText(
      '(Monitoring) The recipient will develop and implement a QIP/CAP'
    );
    expect(goal).toBeVisible();
    // the goal comes before the background or context
    expect(goal.compareDocumentPosition(context) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const citation = screen.getByText('ANC - 1302.91(e)(1)');
    expect(citation).toBeVisible();
    // the citations are bulleted
    expect(citation.closest('ul')).toHaveClass('usa-list');
    expect(screen.getByText('1302.91(e)(2)(ii)')).toBeVisible();
  });

  it('leaves out the citations when there are none', async () => {
    fetchMock.get(URL, { ...SUBMITTED_REQUEST, citations: [] });
    renderView();

    await screen.findByRole('heading', { name: 'Goal and context' });
    expect(screen.queryByText('Citations addressed')).toBeNull();
  });

  it('shows the creator notes as plain text with their line breaks', async () => {
    fetchMock.get(URL, {
      ...SUBMITTED_REQUEST,
      creatorNotes: 'First line <b>not bold</b>\nSecond line',
    });
    renderView();

    expect(await screen.findByText('Creator notes')).toBeVisible();
    const notes = screen.getByText(/First line/);
    expect(notes.textContent).toBe('First line <b>not bold</b>\nSecond line');
    expect(notes.querySelector('b')).toBeNull();
    expect(notes).toHaveClass('ttahub-view-tta-request--creator-notes');
  });

  it('leaves out the creator notes when there are none', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView();

    await screen.findByRole('heading', { name: 'Goal and context' });
    expect(screen.queryByText('Creator notes')).toBeNull();
  });

  it('shows the goal without a standard prefix when the goal has no standard', async () => {
    fetchMock.get(URL, {
      ...SUBMITTED_REQUEST,
      goalTemplate: { ...SUBMITTED_REQUEST.goalTemplate, standard: null },
    });
    renderView();

    expect(
      await screen.findByText('The recipient will develop and implement a QIP/CAP')
    ).toBeVisible();
  });

  it('sends the user to the error page when the request cannot load', async () => {
    fetchMock.get(URL, 403);
    const history = renderView();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/something-went-wrong/403');
    });
  });
});
