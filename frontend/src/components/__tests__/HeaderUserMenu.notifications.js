/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { fetchNotificationsCount } from '../../fetchers/notifications';
import UserContext from '../../UserContext';
import HeaderUserMenu from '../HeaderUserMenu';

jest.mock('../../fetchers/notifications', () => ({
  fetchNotificationsCount: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
}));

describe('HeaderUserMenu whats new notifications', () => {
  const defaultProps = {
    areThereUnreadWhatsNewNotifications: false,
    setAreThereUnreadWhatsNewNotifications: jest.fn(),
  };

  beforeEach(() => {
    fetchNotificationsCount.mockResolvedValue({ count: 0, rows: [] });
  });

  const user = { name: 'user', permissions: [], flags: [] };

  const renderHeaderUserMenu = (props = defaultProps, currentUser = user) =>
    render(
      <Router history={createMemoryHistory()}>
        <UserContext.Provider value={{ user: currentUser }}>
          <HeaderUserMenu {...props} />
        </UserContext.Provider>
      </Router>
    );

  it.each([
    [false, 0],
    [false, 1],
    [true, 0],
    [true, 1],
  ])(
    'keeps avatar and bell indicators independent: whatsNew=%s count=%s',
    async (whatsNew, count) => {
      fetchNotificationsCount.mockResolvedValue({ count, rows: [] });
      const clearWhatsNew = jest.fn();
      renderHeaderUserMenu(
        {
          areThereUnreadWhatsNewNotifications: whatsNew,
          setAreThereUnreadWhatsNewNotifications: clearWhatsNew,
        },
        { ...user, flags: ['actionable_notifications'] }
      );
      const bell = await screen.findByRole('link', {
        name: count ? 'Notifications, unread notifications' : 'Notifications',
      });
      const avatar = screen.getByTestId('header-avatar');
      expect(bell.compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(avatar.className.includes('header-avatar-button__with-unread')).toBe(whatsNew);
      userEvent.click(bell);
      expect(clearWhatsNew).not.toHaveBeenCalled();
      act(() => {
        userEvent.click(screen.getByTestId('header-avatar'));
      });
      userEvent.click(screen.getByRole('link', { name: /what's new/i }));
      expect(clearWhatsNew).toHaveBeenCalledWith(false);
    }
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

    expect(screen.getAllByRole('link', { name: /^notifications$/i })).toHaveLength(2);
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
