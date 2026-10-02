import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import selectEvent from 'react-select-event';
import AppLoadingContext from '../../../AppLoadingContext';
import AllRegionsTtaRequestForm from '../AllRegionsTtaRequestForm';

const ROUTE_PATH = '/tta-requests/:ttaRequestId(new|[0-9]*)/:currentPage([a-z\\-]*)?';

jest.mock(
  '../../../components/RichEditor',
  () =>
    function MockRichEditor({ ariaLabel }) {
      return <textarea aria-label={ariaLabel} />;
    }
);

const RECIPIENTS = [
  {
    id: 10,
    name: 'Children and Families First',
    grants: [
      {
        id: 1,
        regionId: 14,
        status: 'Active',
        numberWithProgramTypes: '14HP1234 - EHS',
        name: 'Children and Families First - 14HP1234 - EHS',
      },
    ],
  },
];

const renderForm = () =>
  render(
    <AppLoadingContext.Provider
      value={{ isAppLoading: false, setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}
    >
      <MemoryRouter initialEntries={['/tta-requests/new/who-is-the-request-for']}>
        <Route
          path={ROUTE_PATH}
          render={({ match }) => <AllRegionsTtaRequestForm match={match} />}
        />
      </MemoryRouter>
    </AppLoadingContext.Provider>
  );

describe('AllRegionsTtaRequestForm', () => {
  beforeEach(() => {
    fetchMock.get('begin:/api/goal-templates', []);
    fetchMock.get('begin:/api/activity-reports/approvers', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('offers every recipient the user can see', async () => {
    fetchMock.get('/api/recipient/user', RECIPIENTS);

    renderForm();

    expect(screen.getByRole('link', { name: 'Back to TTA Requests' })).toHaveAttribute(
      'href',
      '/tta-requests'
    );

    await waitFor(() => {
      expect(fetchMock.called('/api/recipient/user')).toBe(true);
    });

    await selectEvent.select(screen.getByLabelText(/recipient/i), 'Children and Families First');

    expect(await screen.findByTestId('read-only-value')).toHaveTextContent(
      'Children and Families First - 14HP1234 - EHS'
    );
  });

  it('falls back to an empty list when the response has no body', async () => {
    fetchMock.get('/api/recipient/user', { body: 'null', status: 200 });

    renderForm();

    await waitFor(() => {
      expect(fetchMock.called('/api/recipient/user')).toBe(true);
    });

    // the recipient select is still offered, it just has nothing in it
    expect(screen.getByLabelText(/recipient/i)).toBeVisible();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('still renders when the recipients cannot be loaded', async () => {
    fetchMock.get('/api/recipient/user', 500);

    renderForm();

    await waitFor(() => {
      expect(fetchMock.called('/api/recipient/user')).toBe(true);
    });

    expect(screen.getByLabelText(/recipient/i)).toBeVisible();
    expect(screen.queryByTestId('read-only-value')).toBeNull();
  });
});
