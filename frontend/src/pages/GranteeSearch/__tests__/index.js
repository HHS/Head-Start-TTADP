import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { act } from 'react-dom/test-utils';
import GranteeSearch from '../index';
import { SCOPE_IDS } from '../../../Constants';

const userBluePrint = {
  id: 1,
  name: 'One',
  role: ['Taco Alphabetizer'],
  homeRegionId: 1,
  permissions: [],
};

const history = createMemoryHistory();

const res = {
  count: 1,
  rows: [
    {
      id: 2,
      name: 'major tom',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
  ],
};

const granteeUrl = join('/', 'api', 'grantee');

describe('the grantee search page', () => {
  const renderGranteeSearch = (user) => {
    render(<Router history={history}><GranteeSearch user={user} /></Router>);
  };

  beforeEach(() => {
    const user = {
      ...userBluePrint,
      permissions: [
        {
          userId: 1,
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          userId: 1,
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 2,
        },
      ],
    };

    renderGranteeSearch(user);
    const query = 'ground control';
    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region=1&sortBy=name&direction=desc&offset=0');
    fetchMock.get(url, res);
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();
  });

  it('renders the heading and the region select', async () => {
    expect(screen.getByRole('heading', { name: /grantee records/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open regional select menu/i })).toBeInTheDocument();
  });

  it('the regional select works', async () => {
    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    fireEvent.click(button);

    expect(fetchMock.called()).toBe(false);

    expect(button).toBeInTheDocument();
    expect(searchBox).toBeInTheDocument();

    const regionalSelect = screen.getByRole('button', { name: /open regional select menu/i });
    fireEvent.click(regionalSelect);
    const region2 = screen.getByRole('button', { name: /select to view data from region 2\. select apply filters button to apply selection/i });
    fireEvent.click(region2);
    const applyFilters = screen.getByRole('button', { name: /apply filters for the regional select menu/i });
    fireEvent.click(applyFilters);
    userEvent.type(searchBox, 'ground control');

    fetchMock.get('/api/grantee/search?s=ground%20control&region=2&sortBy=name&direction=desc&offset=0', res);

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(screen.getByText('major tom')).toBeInTheDocument());
  });

  it('the search bar works', async () => {
    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    expect(button).toBeInTheDocument();
    expect(searchBox).toBeInTheDocument();
    userEvent.type(searchBox, 'ground control');

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(screen.getByText('major tom')).toBeInTheDocument());
  });

  it('calls for a sort', async () => {
    const sortButton = screen.getByRole('button', { name: 'Program Specialist. Activate to sort ascending' });
    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    expect(button).toBeInTheDocument();
    expect(searchBox).toBeInTheDocument();
    userEvent.type(searchBox, 'ground control');

    fetchMock.get('/api/grantee/search?s=ground%20control&region=1&sortBy=programSpecialist&direction=desc&offset=0', res);

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(sortButton);
    });

    fetchMock.get('/api/grantee/search?s=ground%20control&region=1&sortBy=programSpecialist&direction=asc&offset=0', res);

    await act(async () => {
      fireEvent.click(sortButton);
    });

    await waitFor(() => expect(screen.getByText('major tom')).toBeInTheDocument());
  });

  it('handles an error', async () => {
    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    expect(button).toBeInTheDocument();
    expect(searchBox).toBeInTheDocument();
    userEvent.type(searchBox, 'ground control');

    await act(async () => {
      fireEvent.click(button);
    });

    let majorTom;

    await waitFor(() => {
      majorTom = screen.getByText('major tom');
      expect(majorTom).toBeInTheDocument();
    });

    fetchMock.get('/api/grantee/search?s=ground%20control&region=1&sortBy=programSpecialist&direction=desc&offset=0', 500);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(majorTom).not.toBeInTheDocument();
  });
});
