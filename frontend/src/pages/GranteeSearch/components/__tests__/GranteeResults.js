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
    granteeType: '',
    name: 'Agency 2 in region 1, Inc.',
    regionId: 1,
    programSpecialists: 'Candyman, Tony Todd',
  },
  {
    id: 11,
    granteeType: '',
    name: 'Agency 2 in region 1, Inc.',
    regionId: 2,
    programSpecialists: 'Tony Todd',
  },
  {
    id: 11,
    granteeType: '',
    name: 'Agency 2 in region 1, Inc.',
    regionId: 3,
    programSpecialists: 'Doug Bradley',
  },
  {
    id: 10,
    granteeType: '',
    name: 'Agency 1.b in region 1, Inc.',
    regionId: 1,
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    programSpecialists: [],
  },
  {
    id: 9,
    granteeType: '',
    name: 'Agency 1.a in region 1, Inc.',
    regionId: 1,
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    programSpecialists: [],
  },
];

describe('Grantee Search > GranteeResults', () => {
  const config = {
    sortBy: 'name',
    direction: 'desc',
  };

  const renderGranteeResults = (
    handlePageChange,
    requestSort,
    loading = false,
    sortConfig = config,
  ) => (
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
          sortConfig={sortConfig}
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
    expect(screen.getByRole('cell', { name: /candyman, tony todd/i })).toBeInTheDocument();
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

  it('sorts in reverse', async () => {
    const sortConfig = {
      sortBy: 'name',
      direction: 'asc',
    };

    const handlePageChange = jest.fn();
    const requestSort = jest.fn();
    renderGranteeResults(handlePageChange, requestSort, false, sortConfig);
    const tds = document.querySelectorAll('td');
    expect(tds[1]).toHaveTextContent('Agency 2 in region 1, Inc.');
    const button = screen.getByRole('button', { name: /grantee name\. activate to sort descending/i });
    fireEvent.click(button);
    expect(requestSort).toHaveBeenCalledWith('name');
  });
});
