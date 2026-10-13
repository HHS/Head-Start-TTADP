import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import selectEvent from 'react-select-event';
import { AUTOSAVE_INTERVAL } from '../constants';
import TtaRequestForm from '../index';

// eslint-disable-next-line react/prop-types
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

const renderForm = (props = {}, history = createMemoryHistory()) =>
  render(
    <Router history={history}>
      <TtaRequestForm backLinkTo={BACK_LINK} {...props} />
    </Router>
  );

describe('TtaRequestForm', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockFetches();
  });

  it('renders the heading, draft tag and required field note', () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    expect(
      screen.getByRole('heading', { name: 'Training and Technical Assistance (TTA) Request' })
    ).toBeVisible();
    expect(screen.getByText('Draft')).toBeVisible();
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

  it('records a save time when the draft is saved, without validating', async () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText(/autosaved on:/i)).toBeVisible();
    expect(screen.queryByText('Select a goal')).toBeNull();
  });

  it('saves itself on an interval', async () => {
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, regionId: 14 });

      expect(screen.queryByText(/autosaved on:/i)).toBeNull();

      act(() => {
        jest.advanceTimersByTime(AUTOSAVE_INTERVAL);
      });

      expect(screen.getByText(/autosaved on:/i)).toBeVisible();
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns to the list once a complete request is submitted', async () => {
    const history = createMemoryHistory();
    renderForm({ recipient: RECIPIENT, regionId: 14 }, history);

    userEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await selectEvent.select(screen.getByLabelText(/who originated this request/i), 'TTA Staff');
    await selectEvent.select(screen.getByLabelText(/select goal/i), OTHER_GOAL.name);
    userEvent.type(
      screen.getByLabelText('Provide background or context for this request'),
      'Some context'
    );
    await selectEvent.select(screen.getByLabelText(/reviewing ttac or manager/i), 'Rachel Green');

    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe(BACK_LINK);
    });
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
