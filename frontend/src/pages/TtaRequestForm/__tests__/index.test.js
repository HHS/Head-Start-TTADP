import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Route, Router } from 'react-router-dom';
import selectEvent from 'react-select-event';
import AppLoadingContext from '../../../AppLoadingContext';
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
};

const BACK_LINK = '/recipient-tta-records/10/region/14/tta-request';
const ROUTE_PATH = `${BACK_LINK}/:ttaRequestId(new|[0-9]*)/:currentPage([a-z\\-]*)?`;

const renderForm = (props = {}, history = createMemoryHistory({
  initialEntries: [`${BACK_LINK}/new/who-is-the-request-for`],
})) =>
  render(
    <AppLoadingContext.Provider
      value={{ isAppLoading: false, setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}
    >
      <Router history={history}>
        <Route
          path={ROUTE_PATH}
          render={({ match }) => (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <TtaRequestForm backLinkTo={BACK_LINK} match={match} {...props} />
          )}
        />
      </Router>
    </AppLoadingContext.Provider>
  );

describe('TtaRequestForm', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockFetches();
  });

  it('renders the heading, draft tag, side nav and the first page', () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    expect(
      screen.getByRole('heading', { name: 'Training and Technical Assistance (TTA) Request' })
    ).toBeVisible();
    expect(screen.getByText('Draft')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to TTA Requests' })).toHaveAttribute(
      'href',
      BACK_LINK
    );

    expect(screen.getByRole('button', { name: 'Who is the request for?' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Goal and context' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeVisible();

    expect(
      screen.getByRole('heading', { name: 'Who is the request for?' })
    ).toBeVisible();
    expect(screen.getByText(/indicates required field/i)).toBeVisible();
  });

  it('shows the recipient already selected, with its one grant read only', () => {
    renderForm({ recipient: RECIPIENT, recipientOptions: [RECIPIENT], regionId: 14 });

    // the recipient came from their TTA records, so it is shown rather than offered
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.getByText('Children and Families First')).toBeVisible();

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

  it('has the four request originators', async () => {
    renderForm({ recipient: RECIPIENT, regionId: 14 });

    const originator = screen.getByLabelText(/who originated this request/i);
    selectEvent.openMenu(originator);

    expect(await screen.findByText('Central Office')).toBeVisible();
    expect(screen.getByText('Recipient')).toBeVisible();
    expect(screen.getByText('Regional Office')).toBeVisible();
    expect(screen.getByText('TTA Staff')).toBeVisible();
  });

  it('blocks moving to the next page until its required fields are filled', async () => {
    renderForm({ recipientOptions: [RECIPIENT] });

    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(await screen.findByText('Select a recipient')).toBeVisible();
    expect(await screen.findByText('Select one')).toBeVisible();
    expect(await screen.findByText('Select who originated this request')).toBeVisible();

    // still on the first page - the next page's fields never mounted
    expect(screen.queryByLabelText(/select goal/i)).toBeNull();
  });

  it('asks for a grant when the recipient has several and none are checked', async () => {
    renderForm({ recipient: MULTI_GRANT_RECIPIENT, regionId: 14 });

    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

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

  it('saves itself on an interval, without validating', async () => {
    jest.useFakeTimers();
    try {
      renderForm({ recipient: RECIPIENT, regionId: 14 });

      expect(screen.queryByText(/autosaved on:/i)).toBeNull();

      // dirty the form, then let the navigator's autosave interval fire
      userEvent.click(screen.getByRole('radio', { name: 'Yes' }));

      act(() => {
        jest.advanceTimersByTime(1000 * 60 * 2);
      });

      expect(await screen.findByText(/autosaved on:/i)).toBeVisible();
    } finally {
      jest.useRealTimers();
    }
  });

  it('walks every page and submits once the whole request is complete', async () => {
    const history = createMemoryHistory({
      initialEntries: [`${BACK_LINK}/new/who-is-the-request-for`],
    });
    renderForm({ recipient: RECIPIENT, regionId: 14 }, history);

    // page 1: who is the request for
    userEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await selectEvent.select(screen.getByLabelText(/who originated this request/i), 'TTA Staff');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    // page 2: goal and context
    await selectEvent.select(await screen.findByLabelText(/select goal/i), OTHER_GOAL.name);
    userEvent.type(
      screen.getByLabelText('Provide background or context for this request'),
      'Some context'
    );
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    // page 3: submit for review - its approvers are fetched for the chosen grant's region
    await waitFor(() => {
      expect(fetchMock.called('begin:/api/activity-reports/approvers?region=14')).toBe(true);
    });
    await selectEvent.select(
      await screen.findByLabelText(/reviewing ttac or manager/i),
      'Rachel Green'
    );
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe(BACK_LINK);
    });
  });

  it('drops a goal chosen for a grant that is no longer selected', async () => {
    renderForm({ recipient: MULTI_GRANT_RECIPIENT, regionId: 14 });

    userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Select grant Children and Families First - 14HP1234 - EHS',
      })
    );
    userEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    await selectEvent.select(screen.getByLabelText(/who originated this request/i), 'TTA Staff');
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    await selectEvent.select(await screen.findByLabelText(/select goal/i), OTHER_GOAL.name);
    expect(screen.getByText(OTHER_GOAL.name)).toBeVisible();

    // back to the first page, by way of the side nav
    userEvent.click(screen.getByRole('button', { name: 'Who is the request for?' }));

    userEvent.click(
      await screen.findByRole('checkbox', {
        name: 'Select grant Children and Families First - 14CH5678 - HS',
      })
    );

    // forward again, to the goal and context page
    userEvent.click(screen.getByRole('button', { name: 'Goal and context' }));

    await waitFor(() => {
      expect(screen.queryByText(OTHER_GOAL.name)).toBeNull();
    });
  });
});
