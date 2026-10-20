import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import ApprovedTtaRequestsTable from '../ApprovedTtaRequestsTable';

/*
  Requests can't be approved yet, so the table only ever shows its empty state. Its rows
  and columns arrive with approving a request.
*/
describe('ApprovedTtaRequestsTable', () => {
  afterEach(() => {
    fetchMock.restore();
    window.sessionStorage.clear();
  });

  it.each([
    ['on a recipient record', {}],
    ['across recipients', { showRecipientColumns: true }],
  ])('says there are no approved requests %s', (_label, props) => {
    render(
      <MemoryRouter>
        <ApprovedTtaRequestsTable {...props} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Approved TTA requests', level: 2 })).toBeVisible();
    expect(screen.getByText('You have no approved TTA requests.')).toBeVisible();

    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /open actions for approved tta requests/i })
    ).toBeNull();

    // this table only states the fact, it has no call to action
    expect(screen.queryByRole('link', { name: /new tta request/i })).toBeNull();
  });

  it('does not ask the API for anything', () => {
    render(
      <MemoryRouter>
        <ApprovedTtaRequestsTable showRecipientColumns />
      </MemoryRouter>
    );

    expect(fetchMock.calls()).toHaveLength(0);
  });
});
