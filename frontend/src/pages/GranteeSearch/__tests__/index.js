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

describe('the grantee search page', () => {
  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();
  });

  const renderGranteeSearch = (user) => {
    render(<Router history={history}><GranteeSearch user={user} /></Router>);
  };

  it('handles a user with a home region of 14', async () => {
    jest.clearAllMocks();
    fetchMock.reset();
    const user = {
      ...userBluePrint,
      homeRegionId: 14,
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

    const button = screen.getByRole('button', { name: /open regional select menu/i });
    expect(button).toHaveTextContent('All Regions');
  });

  describe('testing the search ui', () => {
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
      userEvent.type(searchBox, 'ground control');
      await act(async () => fireEvent.click(button));
      const regionalSelect = screen.getByRole('button', { name: /open regional select menu/i });
      fireEvent.click(regionalSelect);
      const region2 = screen.getByRole('button', { name: /select to view data from region 2\. select apply filters button to apply selection/i });
      fireEvent.click(region2);
      const applyFilters = screen.getByRole('button', { name: /apply filters for the regional select menu/i });
      fetchMock.get('/api/grantee/search?s=ground%20control&region=2&sortBy=name&direction=desc&offset=0', res);
      await act(async () => fireEvent.click(applyFilters));
      await waitFor(() => expect(screen.getByText('major tom')).toBeInTheDocument());
      expect(fetchMock.called()).toBeTruthy();
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

    it('requests the next page', async () => {
      const searchBox = screen.getByRole('searchbox');
      const button = screen.getByRole('button', { name: /search for matching grantees/i });

      expect(button).toBeInTheDocument();
      expect(searchBox).toBeInTheDocument();
      userEvent.type(searchBox, 'ground control');

      await act(async () => {
        fireEvent.click(button);
      });

      const next = await screen.findByRole('link', { name: /go to page number 2/i });

      fetchMock.get('/api/grantee/search?s=ground%20control&region=1&sortBy=name&direction=desc&offset=12',
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

      await act(async () => {
        fireEvent.click(next);
      });

      await waitFor(() => expect(screen.getByText('major barack')).toBeInTheDocument());
    });

    it('handles an error', async () => {
      const searchBox = screen.getByRole('searchbox');
      const button = screen.getByRole('button', { name: /search for matching grantees/i });
      userEvent.type(searchBox, 'ground control');

      await act(async () => {
        fireEvent.click(button);
      });

      let majorTom;

      await waitFor(() => {
        majorTom = screen.getByText('major tom');
        expect(majorTom).toBeInTheDocument();
      });

      fetchMock.get('/api/grantee/search?s=ground%20controls&region=1&sortBy=name&direction=desc&offset=0', 404);
      userEvent.clear(searchBox);
      userEvent.type(searchBox, 'ground controls');

      await act(async () => {
        fireEvent.click(button);
      });
      await waitFor(() => expect(majorTom).not.toBeInTheDocument());
    });

    it('won\'t search if !loading', async () => {
      const searchBox = screen.getByRole('searchbox');
      const button = screen.getByRole('button', { name: /search for matching grantees/i });
      userEvent.type(searchBox, 'ground control');

      await act(async () => {
        fireEvent.click(button);
        fireEvent.click(button);
      });

      expect(fetchMock.calls().length).toBe(1);
    });

    it('won\'t search if there is no query', async () => {
      const button = screen.getByRole('button', { name: /search for matching grantees/i });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(fetchMock.called()).not.toBeTruthy();
    });
  });
});
