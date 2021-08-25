import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GranteeSearch from '../index';
import { SCOPE_IDS } from '../../../Constants';

const userBluePrint = {
  id: 1,
  name: 'One',
  role: 'Taco Alphabetizer',
  homeRegionId: 1,
  permissions: [],
};

describe('the grantee search page', () => {
  const renderGranteeSearch = (user) => {
    render(<GranteeSearch user={user} />);
  };

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
    expect(screen.getByRole('button', { name: /open the regional select menu/i })).toBeInTheDocument();
  });

  it('you can interact with the search box', () => {
    const user = { ...userBluePrint };
    renderGranteeSearch(user);
    const searchBox = screen.getByRole('searchbox');
    const button = screen.getByRole('button', { name: /search for matching grantees/i });
    userEvent.type(searchBox, 'ground control?');
    fireEvent.click(button);

    // Todo - once there is more ui, this should be expanded
    // to test what actually happens when the button is clicked

    expect(button).toBeInTheDocument();
    expect(searchBox).toBeInTheDocument();
  });
});
