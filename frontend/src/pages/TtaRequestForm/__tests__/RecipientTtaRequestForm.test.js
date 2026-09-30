import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import selectEvent from 'react-select-event';
import RecipientTtaRequestForm from '../RecipientTtaRequestForm';

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

    render(
      <MemoryRouter>
        <RecipientTtaRequestForm recipient={withoutId} regionId="14" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('read-only-value')).toHaveTextContent('14HP1234 - EHS');
  });

  it('offers no recipient but the one whose record the request came from', async () => {
    render(
      <MemoryRouter>
        <RecipientTtaRequestForm recipient={RECIPIENT} regionId="14" />
      </MemoryRouter>
    );

    selectEvent.openMenu(screen.getByLabelText(/recipient/i));

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Children and Families First');
  });

  it('fixes the recipient and returns to their TTA requests', () => {
    render(
      <MemoryRouter>
        <RecipientTtaRequestForm recipient={RECIPIENT} regionId="14" />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Back to TTA Requests' })).toHaveAttribute(
      'href',
      '/recipient-tta-records/10/region/14/tta-request'
    );
    // the recipient arrives already chosen, and is the only one on offer
    expect(screen.getByText('Children and Families First')).toBeVisible();
    expect(screen.getByTestId('read-only-value')).toHaveTextContent('14HP1234 - EHS');
    // the inactive grant cannot be requested against
    expect(screen.queryByText('14CH5678 - HS')).toBeNull();
  });
});
