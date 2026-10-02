import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import AppLoadingContext from '../../../AppLoadingContext';
import RecipientTtaRequestForm from '../RecipientTtaRequestForm';

const ROUTE_PATH =
  '/recipient-tta-records/:recipientId/region/:regionId/tta-request/:ttaRequestId(new|[0-9]*)/:currentPage([a-z\\-]*)?';

function renderRouted(recipient, regionId) {
  return render(
    <AppLoadingContext.Provider
      value={{ isAppLoading: false, setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}
    >
      <MemoryRouter
        initialEntries={[
          `/recipient-tta-records/${recipient.recipientId}/region/${regionId}/tta-request/new/who-is-the-request-for`,
        ]}
      >
        <Route
          path={ROUTE_PATH}
          render={({ match }) => (
            <RecipientTtaRequestForm recipient={recipient} regionId={regionId} match={match} />
          )}
        />
      </MemoryRouter>
    </AppLoadingContext.Provider>
  );
}

jest.mock(
  '../../../components/RichEditor',
  () =>
    function MockRichEditor({ ariaLabel }) {
      return <textarea aria-label={ariaLabel} />;
    }
);

const RECIPIENT = {
  id: 10,
  recipientId: '10',
  recipientName: 'Children and Families First',
  grants: [
    { id: 1, regionId: 14, status: 'Active', numberWithProgramTypes: '14HP1234 - EHS' },
    // an inactive grant cannot be requested against, so it never reaches the form
    { id: 2, regionId: 14, status: 'Inactive', numberWithProgramTypes: '14CH5678 - HS' },
  ],
};

describe('RecipientTtaRequestForm', () => {
  beforeEach(() => {
    fetchMock.get('begin:/api/goal-templates', []);
    fetchMock.get('begin:/api/activity-reports/approvers', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('falls back to the route recipient id when the record has not loaded one', () => {
    const { id, ...withoutId } = RECIPIENT;

    renderRouted(withoutId, '14');

    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
  });

  it('shows the recipient as fixed text rather than a selector', () => {
    renderRouted(RECIPIENT, '14');

    // there is only ever one recipient on offer here, so there is nothing to choose between
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.queryByRole('combobox', { name: /recipient/i })).toBeNull();
    expect(screen.getByText('Children and Families First')).toBeVisible();
  });

  it('fixes the recipient and returns to their TTA requests', () => {
    renderRouted(RECIPIENT, '14');

    expect(screen.getByRole('link', { name: 'Back to TTA Requests' })).toHaveAttribute(
      'href',
      '/recipient-tta-records/10/region/14/tta-request'
    );
    // the recipient arrives already chosen, and is the only one on offer
    expect(screen.getByText('Children and Families First')).toBeVisible();
    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
    // the inactive grant cannot be requested against
    expect(screen.queryByText('Children and Families First - 14CH5678 - HS')).toBeNull();
  });
});
