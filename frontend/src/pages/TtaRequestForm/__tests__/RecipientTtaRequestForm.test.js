import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
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
    fetchMock.get('begin:/api/feeds/item', '');
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

    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
  });

  it('lists only the grant rather than repeating the recipient', () => {
    render(
      <MemoryRouter>
        <RecipientTtaRequestForm recipient={RECIPIENT} regionId="14" />
      </MemoryRouter>
    );

    // there is only ever one recipient on offer here, and the grant already names them
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.queryByRole('combobox', { name: /recipient/i })).toBeNull();
    expect(screen.queryByText('Children and Families First')).toBeNull();
    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
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
    // the recipient arrives already chosen, so only their grant is listed
    expect(screen.getByText('Children and Families First - 14HP1234 - EHS')).toBeVisible();
    // the inactive grant cannot be requested against
    expect(screen.queryByText('Children and Families First - 14CH5678 - HS')).toBeNull();
  });
});
