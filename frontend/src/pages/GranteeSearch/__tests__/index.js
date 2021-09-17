import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

const granteeUrl = join('/', 'api', 'grantee');

describe('the grantee search page', () => {
  const renderGranteeSearch = (user) => {
    render(<GranteeSearch user={user} />);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading and the region select', async () => {
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
    expect(screen.getByRole('heading', { name: /grantee records/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open regional select menu/i })).toBeInTheDocument();
  });

  it('the search bar works', async () => {
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

    const res = [{
      id: 2, name: 'to major tom',
    }];

    renderGranteeSearch(user);
    const query = 'ground control';
    const url = join(granteeUrl, 'search', `?s=${encodeURIComponent(query)}`, '&region=1');
    fetchMock.get(url, res);

    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });

    expect(button).toBeInTheDocument();
    expect(searchBox).toBeInTheDocument();

    userEvent.type(searchBox, query);

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => expect(screen.getByText(res[0].name)).toBeInTheDocument());
  });
});
