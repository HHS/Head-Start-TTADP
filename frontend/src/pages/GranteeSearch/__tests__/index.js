import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import { act } from 'react-dom/test-utils';
import GranteeSearch from '../index';
import { SCOPE_IDS } from '../../../Constants';

const query = 'ground control';

const userBluePrint = {
  id: 1,
  name: 'One',
  role: ['Taco Alphabetizer'],
  homeRegionId: 1,
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

const history = createMemoryHistory();

const res = {
  count: 13,
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
    {
      id: 3,
      name: 'major bob',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 4,
      name: 'major sara',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 5,
      name: 'major tara',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 6,
      name: 'major jim',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 7,
      name: 'major xi',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 1,
      name: 'major larry',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 8,
      name: 'major maggie',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 10,
      name: 'major brian',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 11,
      name: 'major chumley',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 12,
      name: 'major karen',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
    {
      id: 13,
      name: 'major superhero',
      grants: [
        {
          programSpecialistName: 'someone else',
        },
      ],
    },
  ],
};

const granteeUrl = join('/', 'api', 'grantee');

const renderGranteeSearch = (user) => {
  render(<Router history={history}><GranteeSearch user={user} /></Router>);
};

describe('the grantee search page', () => {
  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();
  });

  it('shows the correct heading and regional select text', () => {
    const user = {
      ...userBluePrint,
    };

    renderGranteeSearch(user);
    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=0');
    act(() => {
      fetchMock.get(url, res);
    });
    expect(screen.getByRole('heading', { name: /grantee records/i })).toBeInTheDocument();
    const regionalSelect = screen.getByRole('button', { name: /open regional select menu/i });
    expect(regionalSelect).toBeInTheDocument();
  });

  it('shows the correct regional select text when user has all regions', () => {
    const user = {
      ...userBluePrint,
      homeRegionId: 14,
    };

    renderGranteeSearch(user);

    const regionalSelect = screen.getByRole('button', { name: /open regional select menu/i });
    expect(regionalSelect).toHaveTextContent('All Regions');
  });

  it('the search box works', async () => {
    const user = { ...userBluePrint };

    renderGranteeSearch(user);
    const url = join(granteeUrl, 'search?s=ground%20control&region.in[]=1&sortBy=name&direction=asc&offset=0');

    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    act(() => {
      fireEvent.click(button);
    });

    expect(fetchMock.called()).toBe(false);

    act(() => {
      userEvent.type(searchBox, 'ground control');
      fireEvent.click(button);
    });

    expect(fetchMock.called()).toBeTruthy();
  });

  it('the regional select works', async () => {
    const user = { ...userBluePrint };

    renderGranteeSearch(user);
    const url = join(granteeUrl, 'search?s=ground%20control&region.in[]=2&sortBy=name&direction=asc&offset=0');

    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });
    const regionalSelect = screen.getByRole('button', { name: /open regional select menu/i });

    act(() => {
      userEvent.type(searchBox, 'ground control');
      fireEvent.click(regionalSelect);
    });

    const region2 = screen.getByRole('button', { name: /select to view data from region 2\. select apply filters button to apply selection/i });

    act(() => {
      fireEvent.click(region2);
    });

    const applyFilters = screen.getByRole('button', { name: /apply filters for the regional select menu/i });

    act(() => {
      fireEvent.click(applyFilters);
      fireEvent.click(button);
    });

    expect(fetchMock.called()).toBeTruthy();
  });

  it('the regional select works with all regions', async () => {
    const user = { ...userBluePrint, homeRegionId: 14 };

    renderGranteeSearch(user);
    const url = join(granteeUrl, 'search?s=ground%20control&region.in=1&region.in=2&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    act(() => {
      userEvent.type(searchBox, 'ground control');
      fireEvent.click(button);
    });

    expect(fetchMock.called()).toBeTruthy();
  });

  it('sorts correctly', async () => {
    const user = { ...userBluePrint };

    renderGranteeSearch(user);

    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=0');

    fetchMock.get(url, res);

    const sortButton = screen.getByRole('button', { name: 'Program Specialist. Activate to sort ascending' });
    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    fetchMock.get('/api/grantee/search?s=ground%20control&region.in[]=1&sortBy=programSpecialist&direction=asc&offset=0', res);

    act(() => {
      fireEvent.click(sortButton);
    });

    fetchMock.get('/api/grantee/search?s=ground%20control&region.in[]=1&sortBy=programSpecialist&direction=desc&offset=0', res);

    act(() => {
      fireEvent.click(sortButton);
    });

    expect(fetchMock.calls().length).toBe(3);
  });

  it('handles an error', async () => {
    const user = { ...userBluePrint };
    renderGranteeSearch(user);

    fetchMock.get('/api/grantee/search?s=ground%20control&region=1&sortBy=name&direction=asc&offset=0', 404);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    act(() => {
      userEvent.type(searchBox, 'ground control');
      fireEvent.click(button);
    });

    expect(document.querySelector('table.usa-table')).toBeInTheDocument();
  });

  it('won\'t search if there is no query', async () => {
    const user = { ...userBluePrint };
    renderGranteeSearch(user);

    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    act(() => {
      fireEvent.click(button);
    });

    expect(fetchMock.called()).not.toBeTruthy();
  });

  it('requests the next page', async () => {
    const user = { ...userBluePrint };
    renderGranteeSearch(user);

    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    const next = await screen.findByRole('link', { name: /go to page number 2/i });
    const nextUrl = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=12');

    fetchMock.get(nextUrl,
      {
        count: 13,
        rows: [
          {
            id: 14,
            name: 'major barack',
            grants: [
              {
                programSpecialistName: 'someone else',
              },
            ],
          },
        ],
      });

    act(() => {
      fireEvent.click(next);
    });

    const major = await screen.findByText('major barack');
    expect(major).toBeInTheDocument();
  });
});
