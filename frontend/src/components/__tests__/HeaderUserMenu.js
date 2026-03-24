import React from 'react';
import '@testing-library/jest-dom';
import { SCOPE_IDS } from '@ttahub/common';
import {
  screen, render, fireEvent,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import HeaderUserMenu from '../HeaderUserMenu';
import UserContext from '../../UserContext';
import { mockWindowProperty, mockDocumentProperty } from '../../testHelpers';

describe('HeaderUserMenu', () => {
  const adminUser = {
    id: 1,
    name: 'harry potter',
    roles: [],
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
  };
  const hydratedUser = {
    id: 1,
    name: 'harry potter',
    permissions: [],
    roles: [],
  };

  const renderHeaderUserMenu = (user = hydratedUser) => {
    const history = createMemoryHistory();

    render(
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <HeaderUserMenu
            areThereUnreadNotifications={false}
            setAreThereUnreadNotifications={jest.fn()}
          />
        </UserContext.Provider>
      </Router>,
    );

    return history;
  };

  const openMenu = async (user = hydratedUser) => {
    const history = renderHeaderUserMenu(user);
    await userEvent.click(screen.getByTestId('header-avatar'));
    return history;
  };

  mockDocumentProperty('documentElement', {
    scrollTo: jest.fn(),
  });

  describe('when authenticated', () => {
    describe('as non-admin user', () => {
      beforeEach(async () => openMenu());

      it('displays the logout button', async () => {
        const logoutLink = screen.getByRole('link', { name: 'Log out' });
        expect(logoutLink).toBeVisible();
      });
    });

    describe('as admin user', () => {
      beforeEach(async () => openMenu(adminUser));

      it('displays the admin button', async () => {
        const adminLink = screen.getByRole('link', { name: 'Admin' });
        expect(adminLink).toBeVisible();
      });

      describe('as admin user doing an impersonation', () => {
        const setItem = jest.fn();
        const getItem = jest.fn(() => true);
        const removeItem = jest.fn();

        mockWindowProperty('sessionStorage', {
          setItem,
          getItem,
          removeItem,
        });

        beforeEach(() => {
          removeItem.mockClear();
        });

        afterAll(() => jest.restoreAllMocks());

        it('displays the admin button', async () => {
          const btn = await screen.findByRole('button', { name: /stop impersonating/i });
          expect(btn).toBeVisible();
          await userEvent.click(btn);
          expect(removeItem).toHaveBeenCalled();
        });
      });
    });

    describe('when navigating', () => {
      it('closes', async () => {
        const history = await openMenu(adminUser);
        const adminLink = screen.getByRole('link', { name: 'Admin' });
        expect(adminLink).toBeVisible();
        fireEvent.click(adminLink);
        expect(history.location.pathname).toBe('/admin');
        expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
      });
    });

    describe('logout button', () => {
      beforeEach(async () => openMenu());

      it('points to the RP-initiated logout endpoint', () => {
        const logoutLink = screen.getByRole('link', { name: /log out/i });
        expect(logoutLink).toHaveAttribute('href', '/api/logout-oidc');

        expect(logoutLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
        expect(logoutLink).not.toHaveAttribute('data-router-link');
      });
    });
  });

  describe('when unauthenticated', () => {
    beforeEach(() => {
      renderHeaderUserMenu(null);
    });

    it('doesn\'t show the user menu', async () => {
      expect(screen.queryByTestId('header-avatar')).toBeNull();
    });
  });
});
