import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  fireEvent,
  screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';

import RecipientResults from '../RecipientResults';

const history = createMemoryHistory();

const recipients = [
  {
    id: 11,
    recipientType: '',
    name: 'Agency 2 in region 1, Inc.',
    regionId: 1,
    programSpecialists: 'Candyman, Tony Todd',
  },
  {
    id: 11,
    recipientType: '',
    name: 'Agency 2 in region 1, Inc.',
    regionId: 2,
    programSpecialists: 'Tony Todd',
  },
  {
    id: 11,
    recipientType: '',
    name: 'Agency 2 in region 1, Inc.',
    regionId: 3,
    programSpecialists: 'Doug Bradley',
  },
  {
    id: 10,
    recipientType: '',
    name: 'Agency 1.b in region 1, Inc.',
    regionId: 1,
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    programSpecialists: [],
  },
  {
    id: 9,
    recipientType: '',
    name: 'Agency 1.a in region 1, Inc.',
    regionId: 1,
    createdAt: '2021-09-21T19:16:15.842Z',
    updatedAt: '2021-09-21T19:16:15.842Z',
    programSpecialists: [],
  },
];

describe('Recipient Search > RecipientResults', () => {
  const config = {
    sortBy: 'name',
    direction: 'desc',
  };

  const renderRecipientResults = (
    handlePageChange,
    requestSort,
    loading = false,
    sortConfig = config,
  ) => (
    render(
      <Router history={history}>
        <RecipientResults
          region={1}
          recipients={recipients}
          loading={loading}
          activePage={1}
          offset={0}
          perPage={12}
          count={recipients.length}
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
    renderRecipientResults(handlePageChange, requestSort);
    expect(screen.getByRole('button', { name: /region\. activate to sort ascending/i })).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: /agency 1\.a in region 1, inc\./i,
    })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /candyman, tony todd/i })).toBeInTheDocument();
  });

  it('calls the sort function', async () => {
    const handlePageChange = jest.fn();
    const requestSort = jest.fn();
    renderRecipientResults(handlePageChange, requestSort);
    const button = screen.getByRole('button', { name: /program specialist\. activate to sort ascending/i });
    fireEvent.click(button);
    expect(requestSort).toHaveBeenCalledWith('programSpecialist');
  });

  it('disables the buttons on loading', async () => {
    const handlePageChange = jest.fn();
    const requestSort = jest.fn();
    renderRecipientResults(handlePageChange, requestSort, true);
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
    renderRecipientResults(handlePageChange, requestSort, false, sortConfig);
    const tds = document.querySelectorAll('td');
    expect(tds[1]).toHaveTextContent('Agency 2 in region 1, Inc.');
    const button = screen.getByRole('button', { name: /recipient name\. activate to sort descending/i });
    fireEvent.click(button);
    expect(requestSort).toHaveBeenCalledWith('name');
  });
});
