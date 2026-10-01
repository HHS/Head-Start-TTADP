/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';
import { fetchNotificationsCount } from '../../fetchers/notifications';
import UserContext from '../../UserContext';
import HeaderUserMenu from '../HeaderUserMenu';

jest.mock('../../fetchers/notifications', () => ({
  fetchNotificationsCount: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
}));

describe('HeaderUserMenu notification indicators', () => {
  const defaultProps = {
    areThereUnreadWhatsNewNotifications: false,
    setAreThereUnreadWhatsNewNotifications: jest.fn(),
  };

  beforeEach(() => {
    fetchNotificationsCount.mockClear();
    fetchNotificationsCount.mockResolvedValue({ count: 0, rows: [] });
  });

  const user = { name: 'user', permissions: [], flags: [] };

  const renderHeaderUserMenu = async (props = defaultProps, currentUser = user) =>
    act(async () => {
      render(
        <Router history={createMemoryHistory()}>
          <UserContext.Provider value={{ user: currentUser }}>
            <HeaderUserMenu {...props} />
          </UserContext.Provider>
        </Router>
      );
    });

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
      await renderHeaderUserMenu(
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
      await act(async () => userEvent.click(bell));
      expect(clearWhatsNew).not.toHaveBeenCalled();
      await act(async () => {
        userEvent.click(screen.getByTestId('header-avatar'));
      });
      const dropdown = within(screen.getByTestId('user-menu-dropdown'));
      const notificationsLink = dropdown.getByRole('link', { name: /^Notifications/ });
      expect(within(notificationsLink).queryByText('new') !== null).toBe(count > 0);
      const whatsNewLink = dropdown.getByRole('link', { name: /what's new/i });
      expect(within(whatsNewLink).queryByText('new') !== null).toBe(whatsNew);
      await act(async () => userEvent.click(whatsNewLink));
      expect(clearWhatsNew).toHaveBeenCalledWith(false);
    }
  );

  it('renders the notification link', async () => {
    await renderHeaderUserMenu();

    await act(async () => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.getByRole('link', { name: /what's new/i })).toBeVisible();
    expect(screen.queryByText('new')).toBe(null);
  });

  it('hides the notifications link when the user lacks the actionable notifications flag', async () => {
    await renderHeaderUserMenu(defaultProps, { ...user, flags: [] });

    await act(async () => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.queryByRole('link', { name: /^notifications$/i })).toBe(null);
    expect(fetchNotificationsCount).not.toHaveBeenCalled();
  });

  it('shows the notifications link when the user has the actionable notifications flag', async () => {
    await renderHeaderUserMenu(defaultProps, { ...user, flags: ['actionable_notifications'] });

    await act(async () => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.getAllByRole('link', { name: /^notifications$/i })).toHaveLength(2);
  });

  it('renders the notification link with a new notification indicator', async () => {
    const setAreThereUnreadWhatsNewNotifications = jest.fn();
    const props = {
      setAreThereUnreadWhatsNewNotifications,
      areThereUnreadWhatsNewNotifications: true,
    };

    await renderHeaderUserMenu(props);

    await act(async () => {
      userEvent.click(screen.getByTestId('header-avatar'));
    });

    expect(screen.getByRole('link', { name: /what's new/i })).toBeVisible();
    expect(screen.getByText('new')).toBeVisible();

    await act(async () => {
      userEvent.click(screen.getByRole('link', { name: /what's new/i }));
    });

    expect(setAreThereUnreadWhatsNewNotifications).toHaveBeenCalledWith(false);
  });
});
