import React from 'react';
import '@testing-library/jest-dom';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  screen, render, fireEvent,
} from '@testing-library/react';
import App from '../../App';
import { mockRSSData } from '../../testHelpers';

describe('HeaderUserMenu', () => {
  const user = { name: 'harry potter', permissions: [] };
  const adminUser = {
    name: 'harry potter',
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
  };
  const userUrl = join('api', 'user');
  const logoutUrl = join('api', 'logout');
  const cleanupUrl = join('api', 'activity-reports', 'storage-cleanup');
  const feedUrl = join('api', 'feeds', 'whats-new');
  const groupsUrl = join('api', 'groups');

  const before = async (admin = false) => {
    if (admin) {
      fetchMock.get(userUrl, { ...adminUser });
    } else {
      fetchMock.get(userUrl, { ...user });
    }

    fetchMock.get(logoutUrl, 200);
    fetchMock.get(cleanupUrl, []);
    fetchMock.get(feedUrl, mockRSSData());
    fetchMock.get(groupsUrl, []);

    render(<App />);

    await screen.findByText('Office of Head Start TTA Hub');
    fireEvent.click(screen.getByTestId('header-avatar'));
  };

  describe('when authenticated', () => {
    describe('as non-admin user', () => {
      beforeEach(async () => before());
      afterEach(() => fetchMock.restore());

      it('displays the logout button', async () => {
        const logoutLink = screen.getByRole('link', { name: 'Log out' });
        expect(logoutLink).toBeVisible();
      });
    });

    describe('as admin user', () => {
      beforeEach(async () => before(true));
      afterEach(() => fetchMock.restore());

      it('displays the admin button', async () => {
        const adminLink = screen.getByRole('link', { name: 'Admin' });
        expect(adminLink).toBeVisible();
      });
    });

    describe('when navigating', () => {
      beforeEach(async () => before(true));
      afterEach(() => fetchMock.restore());

      it('closes', async () => {
        const adminLink = screen.getByRole('link', { name: 'Admin' });
        expect(adminLink).toBeVisible();
        fireEvent.click(adminLink);
        expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
      });
    });

    describe('logout button', () => {
      beforeEach(async () => before());
      afterEach(() => fetchMock.restore());

      it('logs the user out', async () => {
        const logoutLink = screen.getByRole('link', { name: 'Log out' });
        fireEvent.click(logoutLink);
        expect(await screen.findByText('Log In with HSES')).toBeVisible();
        expect(await screen.findByText('Logout Successful')).toBeVisible();
      });
    });
  });

  describe('when unauthenticated', () => {
    beforeEach(async () => {
      fetchMock.get(userUrl, 401);
      render(<App />);
      await screen.findByText('Office of Head Start TTA Hub');
    });
    afterEach(() => fetchMock.restore());

    it('doesn\'t show the user menu', async () => {
      // item with testid 'header-avatar' is not on the dom
      expect(screen.queryByTestId('header-avatar')).toBeNull();
    });
  });
});
