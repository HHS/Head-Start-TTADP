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
import RecipientSearch, { determineDefaultSort } from '../index';
import { SCOPE_IDS } from '../../../Constants';
import { mockWindowProperty } from '../../../testHelpers';
import UserContext from '../../../UserContext';

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
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 3,
      name: 'major bob',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 4,
      name: 'major sara',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 5,
      name: 'major tara',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 6,
      name: 'major jim',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 7,
      name: 'major xi',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 1,
      name: 'major larry',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 8,
      name: 'major maggie',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 10,
      name: 'major brian',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 11,
      name: 'major chumley',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 12,
      name: 'major karen',
      specialists: ['someone else'],
      regionId: 1,
    },
    {
      id: 13,
      name: 'major superhero',
      specialists: ['someone else'],
      regionId: 1,
    },
  ],
};

const recipientUrl = join('/', 'api', 'recipient');

const renderRecipientSearch = (user) => {
  render((
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <RecipientSearch user={user} />
      </UserContext.Provider>
    </Router>
  ));
};

describe('the recipient search page', () => {
  mockWindowProperty('sessionStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  });

  beforeEach(() => {
    fetchMock.get('/api/recipient/search?s=&sortBy=name&direction=asc&offset=0', res);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  describe('the default sort', () => {
    it('returns regionId if the user has central office', () => {
      const hasCentralOffice = true;
      const defaultSort = determineDefaultSort(hasCentralOffice);
      expect(defaultSort.sortBy).toBe('regionId');
    });

    it('returns name if the user is not central office', () => {
      const hasCentralOffice = false;
      const defaultSort = determineDefaultSort(hasCentralOffice);
      expect(defaultSort.sortBy).toBe('name');
    });
  });

  it('the search box works', async () => {
    const user = { ...userBluePrint };

    renderRecipientSearch(user);

    expect(fetchMock.calls().length).toBe(1);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching recipients/i });

    await waitFor(() => expect(button).not.toBeDisabled());

    const url = join(recipientUrl, 'search?s=ground%20control&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, { ...res });

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    expect(fetchMock.calls().length).toBe(2);
  });

  it('an error sets the result to nothing', async () => {
    const user = { ...userBluePrint };

    renderRecipientSearch(user);

    const button = screen.getByRole('button', { name: /search for matching recipients/i });
    const searchBox = screen.getByRole('searchbox');
    await waitFor(() => expect(button).not.toBeDisabled());

    expect(document.querySelectorAll('tbody tr').length).toBe(12);

    fetchMock.restore();

    const url = join(recipientUrl, 'search?s=ground%20control&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, 500);

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(document.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('the filter panel works', async () => {
    const user = { ...userBluePrint };

    renderRecipientSearch(user);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching recipients/i });
    await waitFor(() => expect(button).not.toBeDisabled());

    const filtersButton = screen.getByRole('button', { name: /open filters/i });

    act(() => {
      userEvent.type(searchBox, 'ground control');
      userEvent.click(filtersButton);
    });

    const topic = document.querySelector('[name="topic"]');
    act(() => {
      userEvent.selectOptions(topic, 'region');
    });

    const condition = document.querySelector('[name="condition"]');
    act(() => {
      userEvent.selectOptions(condition, 'is');
    });

    const regionDropdown = document.querySelector('[name="region"]');
    act(() => {
      userEvent.selectOptions(regionDropdown, '2');
    });

    fetchMock.restore();
    const url = join(recipientUrl, 'search?s=ground%20control&region.in[]=2&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const applyFiltersButton = await screen.findByTestId('apply-filters-test-id');
    expect(fetchMock.called(url)).toBeFalsy();
    act(() => {
      userEvent.click(applyFiltersButton);
    });

    expect(fetchMock.called(url)).toBeTruthy();
    fetchMock.restore();

    const urlWithNoFilters = join(recipientUrl, 'search?s=ground%20control&sortBy=name&direction=asc&offset=0');
    fetchMock.get(urlWithNoFilters, res);

    const removeFilterButton = await screen.findByRole('button', { name: /This button removes the filter: Region is 2/i });
    act(() => {
      userEvent.click(removeFilterButton);
    });

    await waitFor(() => expect(fetchMock.called(urlWithNoFilters)).toBeTruthy());
  });

  it('handles an error', async () => {
    const user = { ...userBluePrint };
    renderRecipientSearch(user);

    fetchMock.restore();
    fetchMock.get('/api/recipient/search?s=ground%20control&region=1&sortBy=name&direction=asc&offset=0', 404);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching recipients/i });

    act(() => {
      userEvent.type(searchBox, 'ground control');
      fireEvent.click(button);
    });

    expect(document.querySelector('table.usa-table')).toBeInTheDocument();
  });

  it('requests a sort', async () => {
    const user = { ...userBluePrint };
    renderRecipientSearch(user);
    expect(fetchMock.called()).toBe(true);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching recipients/i });

    await waitFor(() => expect(button).not.toBeDisabled());

    const urlWithQuery = join(recipientUrl, 'search?s=ground%20control&sortBy=name&direction=asc&offset=0');
    fetchMock.get(urlWithQuery, res);

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    await waitFor(() => expect(fetchMock.called(urlWithQuery)).toBeTruthy());

    const changeDirection = await screen.findByRole('button', { name: /recipient name\. activate to sort descending/i });
    const urlWithQueryAndNewDirection = join(recipientUrl, 'search?s=ground%20control&sortBy=name&direction=desc&offset=0');
    fetchMock.get(urlWithQueryAndNewDirection, res);

    await waitFor(() => expect(changeDirection).not.toBeDisabled());

    act(() => {
      fireEvent.click(changeDirection);
    });

    await waitFor(() => expect(fetchMock.called(urlWithQueryAndNewDirection)).toBeTruthy());

    const changeSort = await screen.findByRole('button', { name: /program specialist\. activate to sort ascending/i });
    const changeSortUrl = join(
      recipientUrl,
      'search',
      `?s=${encodeURIComponent(`${query}`)}`,
      '&sortBy=programSpecialist&direction=desc&offset=0',
    );

    fetchMock.get(changeSortUrl, res);

    await waitFor(() => expect(changeSort).not.toBeDisabled());

    act(() => {
      fireEvent.click(changeSort);
    });

    await waitFor(() => expect(fetchMock.called(changeSortUrl)).toBeTruthy());
  });

  it('requests the next page', async () => {
    const user = { ...userBluePrint };
    renderRecipientSearch(user);

    const url = join(recipientUrl, 'search', `?s=${encodeURIComponent(query)}`, '&sortBy=name&direction=asc&offset=0');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching recipients/i });

    await waitFor(() => expect(button).not.toBeDisabled());

    act(() => {
      userEvent.type(searchBox, query);
      fireEvent.click(button);
    });

    const next = await screen.findByRole('link', { name: /go to page number 2/i });
    const nextUrl = join(recipientUrl, 'search', `?s=${encodeURIComponent(query)}`, '&sortBy=name&direction=asc&offset=12');

    fetchMock.get(nextUrl,
      {
        count: 13,
        rows: [
          {
            id: 14,
            name: 'major barack',
            regionId: 1,
            specialists: ['someone else'],
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
