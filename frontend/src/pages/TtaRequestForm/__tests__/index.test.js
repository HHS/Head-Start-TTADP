import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import selectEvent from 'react-select-event';
import AppLoadingContext from '../../../AppLoadingContext';
import { shouldUpdateFormData } from '../../../utils/formRichTextEditorHelper';
import { AUTOSAVE_INTERVAL, NO_REGION_ERROR, SAVE_ERROR, SUBMIT_ERROR } from '../constants';
import TtaRequestForm from '../index';

// eslint-disable-next-line react/prop-types
// the real guard looks for the cursor in a react-draft-wysiwyg editor, which the mocked
// rich editor below doesn't render, so tests say directly whether the cursor is in one
jest.mock('../../../utils/formRichTextEditorHelper', () => ({
  shouldUpdateFormData: jest.fn(() => true),
}));

jest.mock('focus-trap-react', () => ({ children }) => <>{children}</>);

jest.mock(
  '../../../components/RichEditor',
  () =>
    function MockRichEditor({ ariaLabel, value, onChange }) {
      return (
        <textarea
          aria-label={ariaLabel}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    }
);

const GRANT_ONE = {
  id: 1,
  regionId: 14,
  status: 'Active',
  numberWithProgramTypes: '14HP1234 - EHS',
  name: 'Children and Families First - 14HP1234 - EHS',
};

const GRANT_TWO = {
  id: 2,
  regionId: 14,
  status: 'Active',
  numberWithProgramTypes: '14CH5678 - HS',
  name: 'Children and Families First - 14CH5678 - HS',
};

const RECIPIENT = {
  id: 10,
  name: 'Children and Families First',
  grants: [GRANT_ONE],
};

const MULTI_GRANT_RECIPIENT = { ...RECIPIENT, grants: [GRANT_ONE, GRANT_TWO] };

const MONITORING_GOAL = {
  id: 1,
  name: '(Monitoring) The recipient will develop and implement a QIP/CAP',
  standard: 'Monitoring',
};

const OTHER_GOAL = {
  id: 2,
  name: 'The recipient will improve health services',
  standard: 'Health',
};

const CITATIONS = [
  {
    standardId: 100,
    citation: '1302.91(e)(1)',
    grants: [
      {
        grantId: 1,
        findingType: 'Area of Noncompliance',
        name: 'ANC - 1302.91(e)(1) - Monitoring and Implementing Quality Ed',
        citation: '1302.91(e)(1)',
      },
    ],
  },
];

const APPROVERS = [
  { id: 5, name: 'Rachel Green' },
  { id: 6, name: 'Ross Geller' },
];

const mockFetches = () => {
  fetchMock.get('begin:/api/goal-templates', [MONITORING_GOAL, OTHER_GOAL]);
  fetchMock.get('begin:/api/citations/region', CITATIONS);
  fetchMock.get('begin:/api/activity-reports/approvers', APPROVERS);
  fetchMock.get('begin:/api/feeds/item', '');
};

const BACK_LINK = '/recipient-tta-records/10/region/14/tta-request';

const mockSetIsAppLoading = jest.fn();
const mockSetAppLoadingText = jest.fn();

const renderWithAppLoading = (ui) =>
  render(
    <AppLoadingContext.Provider
      value={{
        isAppLoading: false,
        setIsAppLoading: mockSetIsAppLoading,
        setAppLoadingText: mockSetAppLoadingText,
      }}
    >
      {ui}
    </AppLoadingContext.Provider>
  );

const renderForm = (props = {}, history = createMemoryHistory()) =>
  renderWithAppLoading(
    <Router history={history}>
      <TtaRequestForm backLinkTo={BACK_LINK} {...props} />
    </Router>
  );

// rendered the way the routes do, so the form can read the request id
const renderFormAt = (path, props = {}) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  renderWithAppLoading(
    <Router history={history}>
      <Route path="/tta-requests/:ttaRequestId(new|[0-9]*)">
        <TtaRequestForm backLinkTo="/tta-requests" {...props} />
      </Route>
    </Router>
  );
  return history;
};

const SAVED_REQUEST = {
  id: 42,
  displayId: 'R14-REQ-42',
  regionId: 14,
  status: 'draft',
  recipientAware: false,
  originator: 'Regional Office',
  context: '<p>Saved context</p>',
  creatorNotes: 'Saved notes',
  recipient: { id: RECIPIENT.id, name: RECIPIENT.name },
  grants: [GRANT_ONE],
  goalTemplate: { id: OTHER_GOAL.id, templateName: OTHER_GOAL.name, standard: 'Health' },
  citations: [],
  reviewer: { id: 6, name: 'Ross Geller' },
};

describe('TtaRequestForm', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
    shouldUpdateFormData.mockImplementation(() => true);
  });

  beforeEach(() => {
    mockFetches();
  });

  it('renders the heading and required field note', () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    expect(
      screen.getByRole('heading', { name: 'Training and Technical Assistance (TTA) Request' })
    ).toBeVisible();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to TTA Requests' })).toHaveAttribute(
      'href',
      BACK_LINK
    );
    expect(screen.getByRole('heading', { name: 'TTA Request summary' })).toBeVisible();
    expect(screen.getByText(/indicates required field/i)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Who is the request for?' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Goal and context' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Submit for review' })).toBeVisible();
  });

  it('lists only the one grant when the recipient is already selected', () => {
    renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });

    // the recipient came from their TTA records, and the grant already names them
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.queryByText('Children and Families First')).toBeNull();

    // one grant means nothing to choose between, so it is shown rather than offered
    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('lets the user check several grants when the recipient has more than one', () => {
    renderForm({ recipient: MULTI_GRANT_RECIPIENT, regionId: 14 });

    const first = screen.getByRole('checkbox', {
      name: 'Select grant Children and Families First - 14HP1234 - EHS',
    });
    const second = screen.getByRole('checkbox', {
      name: 'Select grant Children and Families First - 14CH5678 - HS',
    });

    userEvent.click(first);
    expect(first).toBeChecked();

    userEvent.click(second);
    expect(first).toBeChecked();
    expect(second).toBeChecked();

    // and they can be taken back off again
    userEvent.click(first);
    expect(first).not.toBeChecked();
  });

  it('asks for a recipient when none was supplied, and its grants follow', async () => {
    renderForm({ recipientOptions: [MULTI_GRANT_RECIPIENT] });

    expect(screen.queryByRole('checkbox')).toBeNull();

    await selectEvent.select(screen.getByLabelText(/recipient/i), 'Children and Families First');

    expect(
      await screen.findByRole('checkbox', {
        name: 'Select grant Children and Families First - 14HP1234 - EHS',
      })
    ).toBeVisible();
  });

  it('takes the region from the chosen grant when it was not given one', async () => {
    renderForm({ recipientOptions: [RECIPIENT] });

    expect(fetchMock.called('begin:/api/activity-reports/approvers')).toBe(false);

    await selectEvent.select(screen.getByLabelText(/recipient/i), 'Children and Families First');

    // the grant is in region 14, so that is whose approvers and goals are offered
    await waitFor(() => {
      expect(fetchMock.called('begin:/api/activity-reports/approvers?region=14')).toBe(true);
    });
    expect(fetchMock.called('begin:/api/goal-templates')).toBe(true);
  });

  it('surfaces every required field when an empty form is submitted', async () => {
    renderForm({ recipientOptions: [RECIPIENT] });

    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Select a recipient')).toBeVisible();
    expect(await screen.findByText('Select one')).toBeVisible();
    expect(await screen.findByText('Select who originated this request')).toBeVisible();
    expect(await screen.findByText('Select a goal')).toBeVisible();
    expect(await screen.findByText('Select a reviewing TTAC or manager')).toBeVisible();
  });

  it('asks for a grant when the recipient has several and none are checked', async () => {
    renderForm({ recipient: MULTI_GRANT_RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Select a recipient grant')).toBeVisible();

    userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Select grant Children and Families First - 14HP1234 - EHS',
      })
    );

    await waitFor(() => {
      expect(screen.queryByText('Select a recipient grant')).toBeNull();
    });
  });

  it('shows citations only for the monitoring goal', async () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    expect(screen.queryByText('Citations being addressed')).toBeNull();

    await selectEvent.select(screen.getByLabelText(/select goal/i), MONITORING_GOAL.name);

    expect(await screen.findByText('Citations being addressed')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Get help choosing citations' })).toBeVisible();

    await selectEvent.select(screen.getByLabelText(/select goal/i), OTHER_GOAL.name);

    await waitFor(() => {
      expect(screen.queryByText('Citations being addressed')).toBeNull();
    });
  });

  it('drops a goal chosen for a grant that is no longer selected', async () => {
    renderForm({ recipient: MULTI_GRANT_RECIPIENT, regionId: 14 });

    userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Select grant Children and Families First - 14HP1234 - EHS',
      })
    );
    await selectEvent.select(screen.getByLabelText(/select goal/i), OTHER_GOAL.name);
    expect(screen.getByText(OTHER_GOAL.name)).toBeVisible();

    userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Select grant Children and Families First - 14CH5678 - HS',
      })
    );

    await waitFor(() => {
      expect(screen.queryByText(OTHER_GOAL.name)).toBeNull();
    });
  });

  it('opens the goal help drawer', async () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Get help selecting a goal' }));

    expect(await screen.findByRole('heading', { name: 'Goal guidance' })).toBeVisible();
    // the same goal guidance the other goal drawers in the app show
    expect(fetchMock.called('/api/feeds/item?tag=ttahub-ohs-standard-goals')).toBe(true);
  });

  it('says the draft was saved, as the activity report does, without validating', async () => {
    fetchMock.post('/api/tta-requests', { ...SAVED_REQUEST, id: 1 });
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText(/^Draft saved on \d{2}\/\d{2}\/\d{4} at /)).toBeVisible();
    // saving by hand isn't an autosave
    expect(screen.queryByText(/autosaved on:/i)).toBeNull();
    expect(screen.queryByText('Select a goal')).toBeNull();
  });

  it('creates the draft on its first save, then saves changes to it', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/42', SAVED_REQUEST);
    // as RecipientTtaRequestForm renders it
    renderFormAt('/tta-requests/new', {
      recipient: RECIPIENT,
      recipientOptions: [RECIPIENT],
      regionId: 14,
    });

    userEvent.click(screen.getByRole('radio', { name: 'No' }));
    userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');
    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    // the URL moves onto the new id without the router reloading the form
    await waitFor(() => {
      expect(window.location.pathname).toBe('/tta-requests/42');
    });
    expect(JSON.parse(fetchMock.lastOptions('/api/tta-requests').body)).toEqual({
      regionId: 14,
      recipientId: RECIPIENT.id,
      grantIds: [GRANT_ONE.id],
      recipientAware: false,
      originator: null,
      goalTemplateId: null,
      citations: [],
      context: '',
      creatorNotes: 'A note',
      reviewerId: null,
    });
    // what was just saved is already on screen, so the new id isn't loaded over it
    expect(fetchMock.called('/api/tta-requests/42', { method: 'GET' })).toBe(false);

    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(true);
    });
    expect(fetchMock.calls('/api/tta-requests', { method: 'POST' })).toHaveLength(1);
  });

  it('fills the form from a saved draft', async () => {
    fetchMock.get('/api/tta-requests/42', SAVED_REQUEST);
    renderFormAt('/tta-requests/42', {
      recipient: RECIPIENT,
      recipientOptions: [RECIPIENT],
      regionId: 14,
    });

    expect(await screen.findByDisplayValue('Saved notes')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    expect(screen.getByText('Regional Office')).toBeVisible();
    expect(screen.getByText(OTHER_GOAL.name)).toBeVisible();
    expect(screen.getByText('Ross Geller')).toBeVisible();
  });

  it('saves to the draft in the route after moving from one draft to another', async () => {
    fetchMock.get('/api/tta-requests/42', SAVED_REQUEST);
    fetchMock.get('/api/tta-requests/43', {
      ...SAVED_REQUEST,
      id: 43,
      displayId: 'R14-REQ-43',
      creatorNotes: 'Other notes',
    });
    fetchMock.put('/api/tta-requests/42', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/43', { ...SAVED_REQUEST, id: 43 });
    const history = renderFormAt('/tta-requests/42', {
      recipient: RECIPIENT,
      recipientOptions: [RECIPIENT],
      regionId: 14,
    });
    expect(await screen.findByDisplayValue('Saved notes')).toBeVisible();

    act(() => {
      history.push('/tta-requests/43');
    });
    const notes = await screen.findByDisplayValue('Other notes');
    userEvent.type(notes, ' edited');
    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(fetchMock.called('/api/tta-requests/43', { method: 'PUT' })).toBe(true);
    });
    expect(JSON.parse(fetchMock.lastOptions('/api/tta-requests/43').body).creatorNotes).toBe(
      'Other notes edited'
    );
    expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(false);
  });

  it('starts a blank request after moving from a draft to a new one', async () => {
    fetchMock.get('/api/tta-requests/42', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/42', SAVED_REQUEST);
    fetchMock.post('/api/tta-requests', { ...SAVED_REQUEST, id: 44 });
    const history = renderFormAt('/tta-requests/42', {
      recipient: RECIPIENT,
      recipientOptions: [RECIPIENT],
      regionId: 14,
    });
    expect(await screen.findByDisplayValue('Saved notes')).toBeVisible();

    act(() => {
      history.push('/tta-requests/new');
    });
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Saved notes')).toBeNull();
    });
    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(fetchMock.called('/api/tta-requests', { method: 'POST' })).toBe(true);
    });
    expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(false);
  });

  it('shows no form to save over a draft that failed to load', async () => {
    fetchMock.get('/api/tta-requests/42', 500);
    renderFormAt('/tta-requests/42', {
      recipient: RECIPIENT,
      recipientOptions: [RECIPIENT],
      regionId: 14,
    });

    expect(await screen.findByText('Unable to load the TTA request.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
  });

  it.each(['/tta-requests/0', '/tta-requests/00'])(
    'treats %s as a request that cannot load, not a new one',
    async (path) => {
      renderFormAt(path, {
        recipient: RECIPIENT,
        recipientOptions: [RECIPIENT],
        regionId: 14,
      });

      expect(await screen.findByText('Unable to load the TTA request.')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
      expect(fetchMock.called('begin:/api/tta-requests')).toBe(false);
    }
  );

  it('autosaves a loaded draft only once something has changed', async () => {
    fetchMock.get('/api/tta-requests/42', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/42', SAVED_REQUEST);
    jest.useFakeTimers();
    try {
      renderFormAt('/tta-requests/42', {
        recipient: RECIPIENT,
        recipientOptions: [RECIPIENT],
        regionId: 14,
      });
      expect(await screen.findByDisplayValue('Saved notes')).toBeVisible();

      await act(async () => {
        jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
      });
      expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(false);

      userEvent.type(screen.getByLabelText(/add creator notes/i), ' and more');

      await act(async () => {
        jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
      });
      await waitFor(() => {
        expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(true);
      });
      expect(
        JSON.parse(fetchMock.lastOptions('/api/tta-requests/42', { method: 'PUT' }).body)
          .creatorNotes
      ).toBe('Saved notes and more');
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the loading overlay while a draft is saved by hand', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText(/draft saved on/i)).toBeVisible();
    expect(mockSetAppLoadingText).toHaveBeenCalledWith('Saving');
    expect(mockSetIsAppLoading).toHaveBeenLastCalledWith(false);
  });

  it('disables Save draft while an autosave is running', async () => {
    let finishCreate;
    fetchMock.post(
      '/api/tta-requests',
      new Promise((resolve) => {
        finishCreate = () => resolve(SAVED_REQUEST);
      })
    );
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, regionId: 14 });
      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');

      await act(async () => {
        jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
      });
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();

      await act(async () => {
        finishCreate();
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
      });
      // an autosave doesn't cover the page
      expect(mockSetAppLoadingText).not.toHaveBeenCalledWith('Saving');
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps a saved draft's own region over the one in the link", async () => {
    fetchMock.get('/api/tta-requests/42', SAVED_REQUEST);
    renderFormAt('/tta-requests/42', {
      recipient: RECIPIENT,
      recipientOptions: [RECIPIENT],
      regionId: 3,
    });

    expect(await screen.findByDisplayValue('Saved notes')).toBeVisible();
    await waitFor(() => {
      expect(fetchMock.called('/api/activity-reports/approvers?region=14')).toBe(true);
    });
  });

  it('says when a draft cannot be saved', async () => {
    fetchMock.post('/api/tta-requests', 500);
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText(SAVE_ERROR)).toBeVisible();
    expect(screen.queryByText(/draft saved on/i)).toBeNull();
  });

  it('asks for a grant before saving a request with no region', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    renderForm({ recipientOptions: [MULTI_GRANT_RECIPIENT] });

    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText(NO_REGION_ERROR)).toBeVisible();
    expect(fetchMock.called('/api/tta-requests')).toBe(false);
  });

  it('saves itself on an interval once something has been entered', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, regionId: 14 });

      expect(screen.queryByText(/autosaved on:/i)).toBeNull();

      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');

      await act(async () => {
        jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
      });

      expect(await screen.findByText(/autosaved on:/i)).toBeVisible();
      // the draft saved message is for saving by hand
      expect(screen.queryByText(/draft saved on/i)).toBeNull();
      expect(fetchMock.called('/api/tta-requests')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  // the server's copy of a draft saved with this creator note, as the save endpoints return it
  const savedWithNote = (creatorNotes) => ({
    ...SAVED_REQUEST,
    recipientAware: null,
    originator: null,
    context: '',
    creatorNotes,
    grants: [GRANT_ONE],
    goalTemplate: null,
    reviewer: null,
  });

  const advanceAutosave = () =>
    act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
    });

  const saveCalls = () =>
    fetchMock.calls('/api/tta-requests').length + fetchMock.calls('/api/tta-requests/42').length;

  it('does not autosave again until something changes after a save', async () => {
    fetchMock.post('/api/tta-requests', savedWithNote('A note'));
    fetchMock.put('/api/tta-requests/42', savedWithNote('A note, edited'));
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });
      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');

      await advanceAutosave();
      await waitFor(() => expect(saveCalls()).toBe(1));

      // the form now matches what was saved, so there is nothing to send
      await advanceAutosave();
      expect(saveCalls()).toBe(1);
      expect(screen.getByLabelText(/add creator notes/i)).toHaveValue('A note');

      userEvent.type(screen.getByLabelText(/add creator notes/i), ', edited');
      await advanceAutosave();
      await waitFor(() => expect(saveCalls()).toBe(2));
      expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not autosave a draft that was just saved by hand and left unchanged', async () => {
    fetchMock.post('/api/tta-requests', savedWithNote('A note'));
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });
      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');
      userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      await waitFor(() => expect(saveCalls()).toBe(1));

      await advanceAutosave();
      expect(saveCalls()).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('leaves the form alone after an autosave while the cursor is in the rich text editor', async () => {
    shouldUpdateFormData.mockImplementation((isAutoSave) => !isAutoSave);
    fetchMock.post('/api/tta-requests', savedWithNote('A note'));
    fetchMock.put('/api/tta-requests/42', savedWithNote('A note'));
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });
      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');

      await advanceAutosave();
      await waitFor(() => expect(saveCalls()).toBe(1));

      // nothing was reset, so the form still counts as changed and saves again
      await advanceAutosave();
      await waitFor(() => expect(saveCalls()).toBe(2));
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps what was typed while an autosave was in flight', async () => {
    let finishCreate;
    fetchMock.post(
      '/api/tta-requests',
      new Promise((resolve) => {
        finishCreate = () => resolve(savedWithNote('A note'));
      })
    );
    fetchMock.put('/api/tta-requests/42', savedWithNote('A note, edited'));
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });
      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');

      await advanceAutosave();
      userEvent.type(screen.getByLabelText(/add creator notes/i), ', edited');
      await act(async () => {
        finishCreate();
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
      });
      expect(screen.getByLabelText(/add creator notes/i)).toHaveValue('A note, edited');

      // still unsaved, so the next tick saves it - to the draft the first save created
      await advanceAutosave();
      await waitFor(() => {
        expect(fetchMock.called('/api/tta-requests/42', { method: 'PUT' })).toBe(true);
      });
      expect(fetchMock.calls('/api/tta-requests')).toHaveLength(1);
      expect(
        JSON.parse(fetchMock.lastOptions('/api/tta-requests/42', { method: 'PUT' }).body)
          .creatorNotes
      ).toBe('A note, edited');
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps Save draft disabled when an autosave outlasts the next tick', async () => {
    let finishCreate;
    fetchMock.post(
      '/api/tta-requests',
      new Promise((resolve) => {
        finishCreate = () => resolve(savedWithNote('A note'));
      })
    );
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });
      userEvent.type(screen.getByLabelText(/add creator notes/i), 'A note');

      await advanceAutosave();
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();

      // this tick skips saving, and mustn't release the lock the first save holds
      await advanceAutosave();
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();

      await act(async () => {
        finishCreate();
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
      });
      expect(saveCalls()).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not create a draft on the interval when nothing has been entered', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, regionId: 14 });

      await act(async () => {
        jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
      });

      expect(fetchMock.called('/api/tta-requests')).toBe(false);
      expect(screen.queryByText(/autosaved on:/i)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  const fillCompleteRequest = async () => {
    userEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await selectEvent.select(screen.getByLabelText(/who originated this request/i), 'TTA Staff');
    await selectEvent.select(screen.getByLabelText(/select goal/i), OTHER_GOAL.name);
    userEvent.type(
      screen.getByLabelText('Provide background or context for this request'),
      'Some context'
    );
    await selectEvent.select(screen.getByLabelText(/reviewing ttac or manager/i), 'Rachel Green');
  };

  it('creates, submits and returns to the list with a message once a request is submitted', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/42/submit', { ...SAVED_REQUEST, status: 'submitted' });
    const history = createMemoryHistory();
    renderForm({ recipient: RECIPIENT, regionId: 14 }, history);

    await fillCompleteRequest();
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe(BACK_LINK);
    });
    expect(history.location.state.message).toEqual({
      reportId: 42,
      displayId: 'R14-REQ-42',
      time: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4} at \d{1,2}:\d{2} (am|pm) \w+$/),
      status: 'submitted',
    });
    const submitted = JSON.parse(fetchMock.lastOptions('/api/tta-requests/42/submit').body);
    expect(submitted).toEqual(
      expect.objectContaining({
        recipientAware: true,
        originator: 'TTA Staff',
        context: 'Some context',
      })
    );
    expect(mockSetAppLoadingText).toHaveBeenCalledWith('Submitting');
    expect(mockSetIsAppLoading).toHaveBeenLastCalledWith(false);
  });

  it('submits a saved draft without creating another', async () => {
    fetchMock.get('/api/tta-requests/42', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/42/submit', { ...SAVED_REQUEST, status: 'submitted' });
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    const history = renderFormAt('/tta-requests/42', { recipientOptions: [RECIPIENT] });

    await screen.findByRole('button', { name: 'Submit' });
    await fillCompleteRequest();
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/tta-requests');
    });
    expect(fetchMock.called('/api/tta-requests', { method: 'POST' })).toBe(false);
    expect(history.location.state.message.reportId).toBe(42);
  });

  it('stays on the form and says so when the submit fails', async () => {
    fetchMock.post('/api/tta-requests', SAVED_REQUEST);
    fetchMock.put('/api/tta-requests/42/submit', 500);
    const history = createMemoryHistory();
    renderForm({ recipient: RECIPIENT, regionId: 14 }, history);

    await fillCompleteRequest();
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText(SUBMIT_ERROR)).toBeVisible();
    expect(history.location.pathname).not.toBe(BACK_LINK);
    expect(mockSetIsAppLoading).toHaveBeenLastCalledWith(false);
  });

  it('offers the region approvers as reviewers', async () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    const reviewer = screen.getByLabelText(/reviewing ttac or manager/i);
    await waitFor(() => {
      expect(fetchMock.called('begin:/api/activity-reports/approvers')).toBe(true);
    });

    selectEvent.openMenu(reviewer);
    expect(await screen.findByText('Ross Geller')).toBeVisible();
  });

  it('has the four request originators', async () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    const originator = screen.getByLabelText(/who originated this request/i);
    selectEvent.openMenu(originator);

    expect(await screen.findByText('Central Office')).toBeVisible();
    expect(screen.getByText('Recipient')).toBeVisible();
    expect(screen.getByText('Regional Office')).toBeVisible();
    expect(screen.getByText('TTA Staff')).toBeVisible();
  });
});
