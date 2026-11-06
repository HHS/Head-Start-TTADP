import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';
import ViewTtaRequest from '..';

const URL = '/api/tta-requests/14322';
const REVIEW_URL = '/api/tta-requests/14322/review';

const CREATOR = { id: 1, name: 'Avery Example', fullName: 'Avery Example, GS' };
const REVIEWER = { id: 2, name: 'Jordan Sample', fullName: 'Jordan Sample, TTAC' };

const creatorSubmission = (id, note, createdAt = '2026-06-23T17:00:00.000Z') => ({
  id,
  step: 'creator',
  action: 'submitted',
  note,
  createdAt,
  user: CREATOR,
});

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
  creator: CREATOR,
  reviewer: REVIEWER,
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
    templateName: '(Monitoring) The recipient will develop and implement a QIP/CAP',
    standard: 'Monitoring',
  },
  citations: [
    { citation: '1302.91(e)(1)', findingType: 'ANC' },
    { citation: '1302.91(e)(2)(ii)', findingType: null },
  ],
  notes: [creatorSubmission(1, null)],
};

const renderView = (props = {}, user = CREATOR) => {
  const history = createMemoryHistory({ initialEntries: ['/tta-requests/view/14322'] });
  render(
    <UserContext.Provider value={{ user }}>
      <AppLoadingContext.Provider
        value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}
      >
        <Router history={history}>
          <Route path="/tta-requests/view/:ttaRequestId">
            <ViewTtaRequest {...props} />
          </Route>
        </Router>
      </AppLoadingContext.Provider>
    </UserContext.Provider>
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

    expect(screen.getByText('Creator:').nextElementSibling).toHaveTextContent('Avery Example, GS');
    expect(screen.getByText('Reviewer:').nextElementSibling).toHaveTextContent(
      'Jordan Sample, TTAC'
    );
    expect(screen.getByText('Date Created:').nextElementSibling).toHaveTextContent('06/23/2026');
    expect(screen.getByText('Date submitted:').nextElementSibling).toHaveTextContent('06/23/2026');

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
    // the template name already carries the standard, so it isn't prefixed again
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

  it('shows the creator notes in the notes summary', async () => {
    fetchMock.get(URL, {
      ...SUBMITTED_REQUEST,
      notes: [creatorSubmission(1, 'First line <b>not bold</b>\nSecond line')],
    });
    renderView();

    const heading = await screen.findByRole('heading', { level: 2, name: 'Notes summary' });
    const summary = heading.closest('section');
    expect(within(summary).getByText('Draft TTA Request')).toBeVisible();
    expect(within(summary).getByText('Avery Example, GS')).toBeVisible();
    expect(within(summary).getByText('Creator')).toBeVisible();
    expect(within(summary).getByText('June 23, 2026 • 17:00 UTC')).toBeVisible();
    const notes = within(summary).getByText(/First line/);
    expect(notes.textContent).toBe('First line <b>not bold</b>\nSecond line');
    expect(notes.querySelector('b')).toBeNull();

    // the notes are no longer repeated under the goal and context
    expect(screen.queryByText('Creator notes')).toBeNull();
  });

  it('shows the creator submission even when there are no creator notes', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView();

    const heading = await screen.findByRole('heading', { level: 2, name: 'Notes summary' });
    expect(within(heading.closest('section')).getByText('Draft TTA Request')).toBeVisible();
  });

  it('shows every submission and review in the order they happened', async () => {
    fetchMock.get(URL, {
      ...SUBMITTED_REQUEST,
      notes: [
        creatorSubmission(1, 'Request is for monitoring citations.', '2026-06-23T09:32:00.000Z'),
        {
          id: 2,
          step: 'reviewer',
          action: 'needs_action',
          note: 'Please add the agenda details we discussed.',
          createdAt: '2026-06-23T10:05:00.000Z',
          user: REVIEWER,
        },
        {
          id: 3,
          step: 'reviewer',
          action: 'needs_action',
          note: null,
          createdAt: '2026-06-23T11:00:00.000Z',
          user: REVIEWER,
        },
        creatorSubmission(4, 'Agenda details have been added.', '2026-06-23T12:43:00.000Z'),
      ],
    });
    renderView();

    const heading = await screen.findByRole('heading', { level: 2, name: 'Notes summary' });
    const entries = within(heading.closest('section')).getAllByRole('listitem');
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringMatching(/^Draft TTA Request.*Avery Example, GS.*monitoring citations/),
      expect.stringMatching(/^TTA Request review - needs action.*Jordan Sample, TTAC.*agenda/),
      // a review without a note still shows what the reviewer decided
      expect.stringMatching(/^TTA Request review - needs action.*Jordan Sample, TTAC.*Reviewer$/),
      expect.stringMatching(/^Draft TTA Request.*Agenda details have been added/),
    ]);
  });

  it('lets the reviewer send a submitted request back for changes', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    fetchMock.put(REVIEW_URL, { ...SUBMITTED_REQUEST, status: 'needs_action' });
    const history = renderView({}, REVIEWER);

    expect(await screen.findByRole('heading', { name: 'Review and submit' })).toBeVisible();
    const status = screen.getByLabelText(/choose review status/i);
    expect(
      within(status)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['- Select -', 'Needs action']);

    userEvent.selectOptions(status, 'needs_action');
    userEvent.type(screen.getByLabelText(/add ttac or manager notes/i), 'Add the agenda');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(history.location.pathname).toBe('/tta-requests'));
    expect(JSON.parse(fetchMock.lastOptions(REVIEW_URL).body)).toEqual({
      status: 'needs_action',
      note: 'Add the agenda',
    });
    expect(history.location.state.message).toMatchObject({
      reportId: 14322,
      displayId: 'R14-REQ-14322',
      status: 'needs_action',
    });
  });

  it('requires a review status', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    fetchMock.put(REVIEW_URL, SUBMITTED_REQUEST);
    renderView({}, REVIEWER);

    userEvent.click(await screen.findByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Choose a review status')).toBeVisible();
    expect(fetchMock.called(REVIEW_URL)).toBe(false);
  });

  it('says so when the review cannot be saved', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    fetchMock.put(REVIEW_URL, 500);
    renderView({}, REVIEWER);

    userEvent.selectOptions(await screen.findByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText(/error submitting your review/i)).toBeVisible();
  });

  it('says why the server rejected the review', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    fetchMock.put(REVIEW_URL, { status: 400, body: { error: 'Only the reviewer can review it' } });
    renderView({}, REVIEWER);

    userEvent.selectOptions(await screen.findByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Only the reviewer can review it')).toBeVisible();
    expect(screen.queryByText(/error submitting your review/i)).toBeNull();
  });

  it('does not offer a review to anyone but the reviewer', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView({}, CREATOR);

    await screen.findByRole('heading', { name: 'Notes summary' });
    expect(screen.queryByRole('heading', { name: 'Review and submit' })).toBeNull();
    expect(screen.queryByLabelText(/choose review status/i)).toBeNull();
  });

  it('does not offer a review once the request has been sent back', async () => {
    fetchMock.get(URL, { ...SUBMITTED_REQUEST, status: 'needs_action' });
    renderView({}, REVIEWER);

    await screen.findByRole('heading', { name: 'Notes summary' });
    expect(screen.queryByLabelText(/choose review status/i)).toBeNull();
  });

  it('leaves out the notes summary when the request has not been submitted', async () => {
    fetchMock.get(URL, { ...SUBMITTED_REQUEST, status: 'draft', submittedAt: null, notes: [] });
    renderView();

    await screen.findByRole('heading', { name: 'Goal and context' });
    expect(screen.queryByRole('heading', { name: 'Notes summary' })).toBeNull();
  });

  it('sends the user to the error page when the request cannot load', async () => {
    fetchMock.get(URL, 403);
    const history = renderView();

    await waitFor(() => {
      expect(history.location.pathname).toBe('/something-went-wrong/403');
    });
  });
});
