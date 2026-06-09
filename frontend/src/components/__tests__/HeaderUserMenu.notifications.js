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

  const history = createMemoryHistory();

  const user = { name: 'harry potter', permissions: [] };

  const renderHeaderUserMenu = (props = defaultProps) =>
    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
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
