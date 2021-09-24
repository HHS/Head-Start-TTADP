import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  fireEvent,
  screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import GranteeResults from '../GranteeResults';

const history = createMemoryHistory();

const grantees = [
  {
    id: 11,
    name: 'Agency 2 in region 1, Inc.',
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    grants: [
      {
        id: 12,
        number: '09HP01111',
        regionId: 1,
        programSpecialistName: 'Candyman',
      },
    ],
  },
  {
    id: 10,
    name: 'Agency 1.b in region 1, Inc.',
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    grants: [
      {
        id: 11,
        number: '01HP022222',
        regionId: 1,
        programSpecialistName: null,
      },
    ],
  },
  {
    id: 9,
    name: 'Agency 1.a in region 1, Inc.',
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    grants: [
      {
        id: 10,
        number: '01HP044444',
        regionId: 1,
        programSpecialistName: null,
      },
    ],
  },
];

describe('Grantee Search > GranteeResults', () => {
  const renderGranteeResults = (handlePageChange, requestSort, loading = false) => (
    render(
      <Router history={history}>
        <GranteeResults
          region={1}
          grantees={grantees}
          loading={loading}
          activePage={1}
          offset={0}
          perPage={12}
          count={grantees.length}
          handlePageChange={handlePageChange}
          requestSort={requestSort}
          sortConfig={{
            sortBy: 'name',
            direction: 'desc',
          }}
        />
      </Router>,
    )
  );

  afterEach(() => jest.clearAllMocks());

  it('renders the component', async () => {
    const handlePageChange = jest.fn();
    const requestSort = jest.fn();
    renderGranteeResults(handlePageChange, requestSort);
    expect(screen.getByRole('button', { name: /region\. activate to sort ascending/i })).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: /agency 1\.a in region 1, inc\./i,
    })).toBeInTheDocument();
    expect(screen.getByText('Candyman')).toBeInTheDocument();
  });

  it('calls the sort function', async () => {
    const handlePageChange = jest.fn();
    const requestSort = jest.fn();
    renderGranteeResults(handlePageChange, requestSort);
    const button = screen.getByRole('button', { name: /program specialist\. activate to sort ascending/i });
    fireEvent.click(button);
    expect(requestSort).toHaveBeenCalledWith('programSpecialist');
  });

  it('disables the buttons on loading', async () => {
    const handlePageChange = jest.fn();
    const requestSort = jest.fn();
    renderGranteeResults(handlePageChange, requestSort, true);
    const button = screen.getByRole('button', { name: /program specialist\. activate to sort ascending/i });
    expect(button).toBeDisabled();
  });
});
