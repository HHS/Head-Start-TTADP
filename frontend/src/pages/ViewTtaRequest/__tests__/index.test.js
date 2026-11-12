import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';
import ViewTtaRequest from '..';

const URL = '/api/tta-requests/14322';
const REVIEW_URL = '/api/tta-requests/14322/review';
const STAFF_URL = '/api/tta-requests/region/14/assignable-staff';
const APPROVERS_URL = '/api/tta-requests/region/14/approvers';

const CREATOR = {
  id: 1,
  name: 'Avery Example',
  fullName: 'Avery Example, GS',
  roles: [{ name: 'GS' }],
};
const REVIEWER = {
  id: 2,
  name: 'Jordan Sample',
  fullName: 'Jordan Sample, TTAC',
  permissions: [{ regionId: 14, scopeId: SCOPE_IDS.REVIEW_TTA_REQUESTS }],
};

const STAFF = [
  { id: 2, name: 'Jordan Sample', fullName: 'Jordan Sample, TTAC' },
  { id: 7, name: 'Monica Geller', fullName: 'Monica Geller, ECS' },
  { id: 8, name: 'Phoebe Buffay', fullName: 'Phoebe Buffay, HS' },
  { id: 9, name: 'Joey Tribbiani', fullName: 'Joey Tribbiani, FES' },
  { id: 10, name: 'Ross Geller', fullName: 'Ross Geller, GS' },
  { id: 11, name: 'Gunther Central', fullName: 'Gunther Central, SS' },
];

const APPROVERS = [
  { id: 20, name: 'Rachel Green', isBackup: false },
  { id: 21, name: 'Chandler Bing', isBackup: true },
];

// the reviewer's form loads who they can assign and send the request to
const mockReviewerFetches = (request = SUBMITTED_REQUEST) => {
  fetchMock.get(URL, request);
  fetchMock.get(STAFF_URL, STAFF);
  fetchMock.get(APPROVERS_URL, APPROVERS);
};

const assignStaff = async (...names) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop
    await selectEvent.select(await screen.findByLabelText(/assign staff/i), name);
  }
};

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

  it('shows the reviewer the summary heading and who is asking for the review', async () => {
    mockReviewerFetches();
    renderView({}, REVIEWER);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'TTA Request summary' })
    ).toBeVisible();
    expect(screen.getByText(/indicates required field/i)).toBeVisible();
    expect(
      screen.getByText(/Avery Example \(GS\) is asking for a review of this TTA request/)
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit request' })).toBeVisible();
  });

  it('leaves out the share and print buttons for the reviewer', async () => {
    mockReviewerFetches();
    renderView({}, REVIEWER);

    await screen.findByRole('heading', { name: 'Review and submit' });
    expect(screen.queryByRole('button', { name: 'Print to PDF' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy URL Link' })).toBeNull();
  });

  it('still offers printing to anyone else', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView({}, CREATOR);

    expect(await screen.findByRole('button', { name: 'Print to PDF' })).toBeVisible();
  });

  describe('when the reviewer edits the request', () => {
    const GRANT = { ...SUBMITTED_REQUEST.grants[0], status: 'Active' };
    const OTHER_GRANT = {
      id: 6,
      regionId: 14,
      status: 'Active',
      numberWithProgramTypes: '14CH5678 - HS',
      name: 'Sample Recipient Agency - 14CH5678 - HS',
    };
    // the request's recipient has another grant to choose; the other recipient isn't offered
    const RECIPIENTS = [
      { id: 3, name: 'Sample Recipient Agency', grants: [GRANT, OTHER_GRANT] },
      { id: 30, name: 'Another Recipient', grants: [] },
    ];
    const OTHER_GOAL = { id: 9, name: 'The recipient will improve health services' };
    // a request without citations to load
    const REQUEST = {
      ...SUBMITTED_REQUEST,
      grants: [GRANT],
      goalTemplate: { id: 9, templateName: OTHER_GOAL.name, standard: 'Health' },
      citations: [],
    };

    const startEditing = async () => {
      mockReviewerFetches(REQUEST);
      fetchMock.get('/api/recipient/user/tta-requests', RECIPIENTS);
      fetchMock.get('begin:/api/goal-templates', [OTHER_GOAL]);
      fetchMock.get('begin:/api/feeds/item', '');
      const history = renderView({}, REVIEWER);
      userEvent.click(await screen.findByRole('button', { name: 'Edit request' }));
      await screen.findByRole('checkbox', { name: `Select grant ${GRANT.name}` });
      return history;
    };

    it("edits the details in place, offering the recipient's grants but not another recipient", async () => {
      const history = await startEditing();

      expect(history.location.pathname).toBe('/tta-requests/view/14322');
      expect(screen.queryByRole('button', { name: 'Edit request' })).toBeNull();
      expect(screen.queryByLabelText(/^recipient\s*\*?$/i)).toBeNull();
      expect(screen.getByLabelText(/who originated this request/i)).toBeVisible();
      expect(screen.getByLabelText('Yes')).toBeChecked();
      expect(screen.queryByText('Another Recipient')).toBeNull();
      expect(screen.getByRole('checkbox', { name: `Select grant ${GRANT.name}` })).toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: `Select grant ${OTHER_GRANT.name}` })
      ).not.toBeChecked();
    });

    it('clears the goal when the grants change', async () => {
      await startEditing();
      expect(await screen.findByText(OTHER_GOAL.name)).toBeVisible();

      userEvent.click(screen.getByRole('checkbox', { name: `Select grant ${OTHER_GRANT.name}` }));

      await waitFor(() => expect(screen.queryByText(OTHER_GOAL.name)).toBeNull());
    });

    it('keeps the review as it was filled in, then saves both together', async () => {
      fetchMock.put(URL, REQUEST);
      fetchMock.put(REVIEW_URL, { ...REQUEST, status: 'needs_action' });
      mockReviewerFetches(REQUEST);
      fetchMock.get('/api/recipient/user/tta-requests', RECIPIENTS);
      fetchMock.get('begin:/api/goal-templates', [OTHER_GOAL]);
      fetchMock.get('begin:/api/feeds/item', '');
      const history = renderView({}, REVIEWER);

      // the review first, then the details
      await assignStaff('Monica Geller, ECS');
      userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
      userEvent.type(screen.getByLabelText(/add ttac or manager notes/i), 'Add the agenda');
      userEvent.click(screen.getByRole('button', { name: 'Edit request' }));
      userEvent.click(await screen.findByLabelText('No'));
      // a second grant, which leaves the goal to be chosen again
      userEvent.click(
        await screen.findByRole('checkbox', { name: `Select grant ${OTHER_GRANT.name}` })
      );
      await selectEvent.select(screen.getByLabelText(/select goal/i), OTHER_GOAL.name);

      expect(screen.getByText('Monica Geller, ECS')).toBeVisible();
      expect(screen.getByLabelText(/choose review status/i)).toHaveValue('needs_action');
      expect(screen.getByLabelText(/add ttac or manager notes/i)).toHaveValue('Add the agenda');

      userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(history.location.pathname).toBe('/tta-requests'));
      const details = JSON.parse(fetchMock.lastOptions(URL, { method: 'PUT' }).body);
      expect(details).toMatchObject({ recipientAware: false, grantIds: [4, 6], goalTemplateId: 9 });
      expect(details).not.toHaveProperty('recipientId');
      expect(details).not.toHaveProperty('reviewerId');
      expect(details).not.toHaveProperty('creatorNotes');
      expect(JSON.parse(fetchMock.lastOptions(REVIEW_URL).body)).toEqual({
        status: 'needs_action',
        note: 'Add the agenda',
        assignedStaffIds: [7],
      });
    });

    it('keeps everything filled in when the details cannot be saved', async () => {
      fetchMock.put(URL, 500);
      await startEditing();

      await assignStaff('Monica Geller, ECS');
      userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
      userEvent.click(screen.getByLabelText('No'));
      userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      expect(await screen.findByText(/error submitting your review/i)).toBeVisible();
      expect(fetchMock.called(REVIEW_URL)).toBe(false);
      expect(screen.getByLabelText('No')).toBeChecked();
      expect(screen.getByText('Monica Geller, ECS')).toBeVisible();
    });
  });

  it('lays out the assignment above the review, with the notes between', async () => {
    mockReviewerFetches();
    renderView({}, REVIEWER);

    const assignment = await screen.findByRole('heading', { name: 'TTA assignment' });
    const review = screen.getByRole('heading', { name: 'Review and submit' });
    const notes = screen.getByRole('heading', { name: 'Notes summary' });
    const status = screen.getByLabelText(/choose review status/i);
    const following = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;

    expect(following(assignment, review)).toBeTruthy();
    expect(following(review, screen.getByText('Date submitted'))).toBeTruthy();
    expect(following(screen.getByText('Date submitted'), notes)).toBeTruthy();
    expect(following(notes, status)).toBeTruthy();
    expect(following(status, screen.getByLabelText(/add ttac or manager notes/i))).toBeTruthy();
  });

  it('lets the reviewer assign staff and send a submitted request back for changes', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, { ...SUBMITTED_REQUEST, status: 'needs_action' });
    const history = renderView({}, REVIEWER);

    expect(await screen.findByRole('heading', { name: 'Review and submit' })).toBeVisible();
    const status = screen.getByLabelText(/choose review status/i);
    expect(
      within(status)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['- Select -', 'Needs action', 'Send to COR for approval']);

    // the reviewer can assign themselves
    await assignStaff('Jordan Sample, TTAC', 'Monica Geller, ECS');
    userEvent.selectOptions(status, 'needs_action');
    expect(screen.queryByLabelText(/approving cor/i)).toBeNull();
    userEvent.type(screen.getByLabelText(/add ttac or manager notes/i), 'Add the agenda');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(history.location.pathname).toBe('/tta-requests'));
    expect(JSON.parse(fetchMock.lastOptions(REVIEW_URL).body)).toEqual({
      status: 'needs_action',
      note: 'Add the agenda',
      assignedStaffIds: [2, 7],
    });
    // nothing was edited, so only the review is saved
    expect(fetchMock.called(URL, { method: 'PUT' })).toBe(false);
    expect(history.location.state.message).toMatchObject({
      reportId: 14322,
      displayId: 'R14-REQ-14322',
      status: 'needs_action',
    });
  });

  it('lets the reviewer send the request to an approving COR', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, { ...SUBMITTED_REQUEST, status: 'awaiting_approval' });
    const history = renderView({}, REVIEWER);

    await assignStaff('Monica Geller, ECS');
    userEvent.selectOptions(await screen.findByLabelText(/choose review status/i), 'approved');

    const approver = await screen.findByLabelText(/approving cor/i);
    selectEvent.openMenu(approver);
    // the primary COR comes first, and the backups say so
    expect(screen.getByText('Rachel Green')).toBeVisible();
    expect(screen.getByText('Chandler Bing (backup)')).toBeVisible();
    await selectEvent.select(approver, 'Chandler Bing (backup)');
    userEvent.type(
      screen.getByLabelText(/add ttac or manager notes/i),
      'Adding Chandler because you are out'
    );
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(history.location.pathname).toBe('/tta-requests'));
    expect(JSON.parse(fetchMock.lastOptions(REVIEW_URL).body)).toEqual({
      status: 'approved',
      note: 'Adding Chandler because you are out',
      assignedStaffIds: [7],
      approverId: 21,
    });
    expect(history.location.state.message).toMatchObject({ status: 'awaiting_approval' });
  });

  it('requires an approving COR when sending the request to one', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, SUBMITTED_REQUEST);
    renderView({}, REVIEWER);

    await assignStaff('Monica Geller, ECS');
    userEvent.selectOptions(await screen.findByLabelText(/choose review status/i), 'approved');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Select an approving COR')).toBeVisible();
    expect(fetchMock.called(REVIEW_URL)).toBe(false);
  });

  it('requires a review status', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, SUBMITTED_REQUEST);
    renderView({}, REVIEWER);

    userEvent.click(await screen.findByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Choose a review status')).toBeVisible();
    expect(screen.queryByText('Select at least one staff member')).toBeNull();
    expect(fetchMock.called(REVIEW_URL)).toBe(false);
  });

  it('requires assigned staff to send the request to the COR', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, SUBMITTED_REQUEST);
    renderView({}, REVIEWER);

    userEvent.selectOptions(await screen.findByLabelText(/choose review status/i), 'approved');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Select at least one staff member')).toBeVisible();
    expect(fetchMock.called(REVIEW_URL)).toBe(false);

    // sending it back for changes instead doesn't need staff, so the error goes
    userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
    await waitFor(() => expect(screen.queryByText('Select at least one staff member')).toBeNull());
  });

  it('sends the request back for changes without assigned staff', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, SUBMITTED_REQUEST);
    renderView({}, REVIEWER);

    userEvent.selectOptions(await screen.findByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(fetchMock.called(REVIEW_URL)).toBe(true));
    expect(JSON.parse(fetchMock.lastOptions(REVIEW_URL).body)).toEqual({
      status: 'needs_action',
      note: '',
      assignedStaffIds: [],
    });
  });

  it('allows no more than five assigned staff', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, SUBMITTED_REQUEST);
    renderView({}, REVIEWER);

    await screen.findByRole('heading', { name: 'TTA assignment' });
    await assignStaff(...STAFF.map(({ fullName }) => fullName));
    userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Select 5 or fewer staff members')).toBeVisible();
    expect(fetchMock.called(REVIEW_URL)).toBe(false);
  });

  it('starts with the staff assigned on an earlier review', async () => {
    mockReviewerFetches({ ...SUBMITTED_REQUEST, assignedStaff: [STAFF[1]] });
    fetchMock.put(REVIEW_URL, { ...SUBMITTED_REQUEST, status: 'needs_action' });
    renderView({}, REVIEWER);

    expect(await screen.findByText('Monica Geller, ECS')).toBeVisible();
    userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(fetchMock.called(REVIEW_URL)).toBe(true));
    expect(JSON.parse(fetchMock.lastOptions(REVIEW_URL).body).assignedStaffIds).toEqual([7]);
  });

  it('says so when the review cannot be saved', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, 500);
    renderView({}, REVIEWER);

    await screen.findByRole('heading', { name: 'TTA assignment' });
    await assignStaff('Monica Geller, ECS');
    userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText(/error submitting your review/i)).toBeVisible();
  });

  it('says why the server rejected the review', async () => {
    mockReviewerFetches();
    fetchMock.put(REVIEW_URL, { status: 400, body: { error: 'Only the reviewer can review it' } });
    renderView({}, REVIEWER);

    await screen.findByRole('heading', { name: 'TTA assignment' });
    await assignStaff('Monica Geller, ECS');
    userEvent.selectOptions(screen.getByLabelText(/choose review status/i), 'needs_action');
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Only the reviewer can review it')).toBeVisible();
    expect(screen.queryByText(/error submitting your review/i)).toBeNull();
  });

  it('shows the assigned staff once the request has been reviewed', async () => {
    fetchMock.get(URL, {
      ...SUBMITTED_REQUEST,
      status: 'awaiting_approval',
      assignedStaff: [STAFF[1], STAFF[2]],
    });
    renderView({}, CREATOR);

    const assignment = await screen.findByRole('heading', { name: 'TTA assignment' });
    const specialist = screen.getByText('Assigned specialist');
    expect(specialist).toBeVisible();
    expect(screen.getByText('Monica Geller, ECS')).toBeVisible();
    expect(screen.getByText('Phoebe Buffay, HS')).toBeVisible();

    const review = screen.getByRole('heading', { name: 'Review and submit' });
    const dateSubmitted = screen.getByText('Date submitted');
    expect(dateSubmitted.nextElementSibling).toHaveTextContent('06/23/2026');

    const notes = screen.getByRole('heading', { name: 'Notes summary' });
    const following = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(following(assignment, specialist)).toBeTruthy();
    expect(following(specialist, review)).toBeTruthy();
    expect(following(review, dateSubmitted)).toBeTruthy();
    expect(following(dateSubmitted, notes)).toBeTruthy();

    expect(screen.queryByLabelText(/choose review status/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit request' })).toBeNull();
  });

  it('shows the assigned staff but not the review once the request has been sent back', async () => {
    fetchMock.get(URL, {
      ...SUBMITTED_REQUEST,
      status: 'needs_action',
      assignedStaff: [STAFF[1]],
    });
    renderView({}, CREATOR);

    expect(await screen.findByRole('heading', { name: 'TTA assignment' })).toBeVisible();
    expect(screen.getByText('Monica Geller, ECS')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Review and submit' })).toBeNull();
  });

  it('does not offer a review to anyone but the reviewer', async () => {
    fetchMock.get(URL, SUBMITTED_REQUEST);
    renderView({}, CREATOR);

    await screen.findByRole('heading', { name: 'Notes summary' });
    expect(screen.queryByRole('heading', { name: 'Review and submit' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'TTA assignment' })).toBeNull();
    expect(screen.queryByLabelText(/choose review status/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit request' })).toBeNull();
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
