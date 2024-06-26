import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SCOPE_IDS } from '@ttahub/common';
import Tabs from '../Tabs';
import UserContext from '../../UserContext';

const DEFAULT_USER = {
  name: 'test@test.com',
  homeRegionId: 1,
  permissions: [
    {
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
      regionId: 1,
    },
  ],
  flags: [],
};

const testTabs = [
  { key: 'Test Tab 1', value: 'test-tab-1' },
  { key: 'Test Tab 2', value: 'test-tab-2' },
  { key: 'Test Tab 3', value: 'test-tab-3' }];

describe('Tabs', () => {
  // eslint-disable-next-line react/prop-types
  const Test = ({ backLink, user }) => (
    <MemoryRouter>
      <UserContext.Provider value={{ user }}>
        <Tabs
          tabs={testTabs}
          ariaLabel="test label"
          backLink={backLink}
        />
      </UserContext.Provider>
    </MemoryRouter>
  );

  const renderTabs = (backLink = null, user = DEFAULT_USER) => {
    render(<Test backLink={backLink} user={user} />);
  };

  it('renders the correct tabs', () => {
    renderTabs();
    expect(screen.getByText('Test Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Test Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Test Tab 3')).toBeInTheDocument();
  });

  it('does not show the icon if there is no back link', () => {
    renderTabs();
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument();
  });

  it('does not show the icon if the back link is a fragment', () => {
    renderTabs(<></>);
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument();
  });

  it('shows the icon if the backlink is a <Link>', () => {
    renderTabs(<a href="/">Back</a>);
    expect(screen.queryByTestId('back-link-icon')).toBeInTheDocument();
  });
});
