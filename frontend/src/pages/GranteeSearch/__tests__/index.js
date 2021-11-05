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
import { v4 as uuidv4 } from 'uuid';
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
          number: uuidv4(),
        },
      ],
    },
    {
      id: 3,
      name: 'major bob',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 4,
      name: 'major sara',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 5,
      name: 'major tara',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 6,
      name: 'major jim',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
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
          number: uuidv4(),
        },
      ],
    },
    {
      id: 8,
      name: 'major maggie',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 10,
      name: 'major brian',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 11,
      name: 'major chumley',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 12,
      name: 'major karen',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
        },
      ],
    },
    {
      id: 13,
      name: 'major superhero',
      grants: [
        {
          programSpecialistName: 'someone else',
          number: uuidv4(),
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
  beforeEach(() => {
    fetchMock.reset();
    const url = join(granteeUrl, 'search', '?s=&region.in[]=1&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the correct regional select text when user has all regions', () => {
    const user = {
      ...userBluePrint,
      homeRegionId: 14,
    };

    fetchMock.get('/api/grantee/search?s=&region.in[]=1&region.in[]=2&sortBy=name&direction=asc&offset=0', res);
    renderGranteeSearch(user);
    expect(screen.getByRole('heading', { name: /grantee records/i })).toBeInTheDocument();
    const regionalSelect = screen.getByRole('button', { name: 'toggle regional select menu' });
    expect(regionalSelect).toHaveTextContent('All Regions');
  });

  it('the search box works', async () => {
    const user = { ...userBluePrint };

    renderGranteeSearch(user);

    expect(fetchMock.calls().length).toBe(1);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    await waitFor(() => expect(button).not.toBeDisabled());

    const url = join(granteeUrl, 'search?s=ground%20control&region.in[]=1&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, { ...res });

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    expect(fetchMock.calls().length).toBe(2);
  });

  it('the regional select works', async () => {
    const user = { ...userBluePrint };

    renderGranteeSearch(user);
    const url = join(granteeUrl, 'search?s=ground%20control&region.in[]=2&sortBy=name&direction=asc&offset=0');

    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });
    const regionalSelect = screen.getByRole('button', { name: 'toggle regional select menu' });

    await waitFor(() => expect(button).not.toBeDisabled());

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

    fetchMock.get('/api/grantee/search?s=&region.in[]=1&region.in[]=2&sortBy=name&direction=asc&offset=0', res);

    renderGranteeSearch(user);
    const url = join(granteeUrl, 'search?s=ground%20control&region.in[]=1&region.in[]=2&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    await waitFor(() => expect(button).not.toBeDisabled());

    act(() => {
      userEvent.type(searchBox, 'ground control');
      fireEvent.click(button);
    });

    expect(fetchMock.called()).toBeTruthy();
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

  it('requests a sort', async () => {
    const user = { ...userBluePrint };
    renderGranteeSearch(user);

    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    await waitFor(() => expect(button).not.toBeDisabled());

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    const changeDirection = await screen.findByRole('button', { name: /grantee name\. activate to sort descending/i });
    const changeDirectionUrl = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=desc&offset=0');

    fetchMock.get(changeDirectionUrl, res);

    await waitFor(() => expect(changeDirection).not.toBeDisabled());

    act(() => {
      fireEvent.click(changeDirection);
    });

    const changeSort = await screen.findByRole('button', { name: /program specialist\. activate to sort ascending/i });
    const chageSortUrl = join(
      granteeUrl,
      'search',
      `?s=${encodeURIComponent(`${query}major tom`)}`,
      '&region.in[]=1&sortBy=programSpecialist&direction=desc&offset=0',
    );

    fetchMock.get(chageSortUrl, res);

    await waitFor(() => expect(changeSort).not.toBeDisabled());

    act(() => {
      userEvent.type(searchBox, 'major tom');
      fireEvent.click(changeSort);
    });

    const expectedMocks = [
      '/api/grantee/search?s=&region.in[]=1&sortBy=name&direction=asc&offset=0',
      '/api/grantee/search?s=ground%20control&region.in[]=1&sortBy=name&direction=asc&offset=0',
      '/api/grantee/search?s=ground%20control&region.in[]=1&sortBy=name&direction=desc&offset=0',
      '/api/grantee/search?s=ground%20controlmajor%20tom&region.in[]=1&sortBy=programSpecialist&direction=desc&offset=0',
    ];

    const mocks = fetchMock.calls().map((call) => call[0]);
    expect(mocks).toStrictEqual(expectedMocks);
  });

  it('requests the next page', async () => {
    const user = { ...userBluePrint };
    renderGranteeSearch(user);

    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region.in[]=1&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    await waitFor(() => expect(button).not.toBeDisabled());

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
                number: uuidv4(),
              },
            ],
          },
        ],
      });

    await waitFor(() => expect(next).not.toBeDisabled());

    act(() => {
      fireEvent.click(next);
    });

    const major = await screen.findByText('major barack');
    expect(major).toBeInTheDocument();
  });
});
