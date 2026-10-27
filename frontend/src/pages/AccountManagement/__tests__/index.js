import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router';
import AppLoadingContext from '../../../AppLoadingContext';
import { MyGroupsContext } from '../../../components/MyGroupsProvider';
import UserContext from '../../../UserContext';
import AccountManagement from '..';

describe('AccountManagement', () => {
  const now = new Date();

  const unverifiedUser = {
    name: 'user1',
    lastLogin: now,
    validationStatus: [],
    roles: [{ name: 'ECM' }, { name: 'GMS' }, { name: 'PS' }],
  };

  const renderAM = (user = unverifiedUser) => {
    render(
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <UserContext.Provider value={{ user }}>
            <MyGroupsContext.Provider value={{ myGroups: [], setMyGroups: jest.fn() }}>
              <AccountManagement />
            </MyGroupsContext.Provider>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </MemoryRouter>
    );
  };

  afterEach(() => fetchMock.restore());

  it('renders the profile and groups sections', async () => {
    renderAM();
    expect(await screen.findByRole('heading', { name: 'Account Management' })).toBeVisible();
    expect(screen.getByText('Profile')).toBeVisible();
    expect(screen.getByText('Last login')).toBeVisible();
    expect(await screen.findByText('My groups')).toBeVisible();
  });

  it('does not show email verification or email preferences for an unverified user', async () => {
    renderAM();
    await screen.findByRole('heading', { name: 'Account Management' });
    expect(screen.queryByText('Email preferences')).toBeNull();
    expect(screen.queryByText(/verify email address/i)).toBeNull();
    expect(screen.queryByText(/your email address isn't verified/i)).toBeNull();
    expect(screen.queryByTestId('send-verification-email-button')).toBeNull();
    expect(screen.queryByTestId('email-preferences-form')).toBeNull();
    expect(fetchMock.called('/api/settings/email')).toBe(false);
  });
});
