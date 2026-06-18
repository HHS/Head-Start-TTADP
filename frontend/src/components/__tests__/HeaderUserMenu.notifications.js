/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import UserContext from '../../UserContext';
import HeaderUserMenu from '../HeaderUserMenu';

describe('HeaderUserMenu whats new notifications', () => {
  const defaultProps = {
    areThereUnreadWhatsNewNotifications: false,
    setAreThereUnreadWhatsNewNotifications: jest.fn(),
  };

  const user = { name: 'user', permissions: [], flags: [] };

  const renderHeaderUserMenu = (props = defaultProps, currentUser = user) =>
    render(
      <Router history={createMemoryHistory()}>
        <UserContext.Provider value={{ user: currentUser }}>
          <HeaderUserMenu {...props} />
        </UserContext.Provider>
      </Router>
    );

  it('renders the notification link', () => {
    renderHeaderUserMenu();

    act(() => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.getByRole('link', { name: /what's new/i })).toBeVisible();
    expect(screen.queryByText('new')).toBe(null);
  });

  it('hides the notifications link when the user lacks the actionable notifications flag', () => {
    renderHeaderUserMenu(defaultProps, { ...user, flags: [] });

    act(() => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.queryByRole('link', { name: /^notifications$/i })).toBe(null);
  });

  it('shows the notifications link when the user has the actionable notifications flag', () => {
    renderHeaderUserMenu(defaultProps, { ...user, flags: ['actionable_notifications'] });

    act(() => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.getByRole('link', { name: /^notifications$/i })).toBeVisible();
  });

  it('renders the notification link with a new notification indicator', () => {
    const setAreThereUnreadWhatsNewNotifications = jest.fn();
    const props = {
      setAreThereUnreadWhatsNewNotifications,
      areThereUnreadWhatsNewNotifications: true,
    };

    renderHeaderUserMenu(props);

    act(() => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.getByRole('link', { name: /what's new/i })).toBeVisible();
    expect(screen.getByText('new')).toBeVisible();

    act(() => {
      userEvent.click(screen.getByRole('link', { name: /what's new/i }));
    });

    expect(setAreThereUnreadWhatsNewNotifications).toHaveBeenCalledWith(false);
  });
});
