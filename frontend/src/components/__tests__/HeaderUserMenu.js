import React from 'react';
import '@testing-library/jest-dom';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  screen, render, fireEvent,
} from '@testing-library/react';
import App from '../../App';
import { SCOPE_IDS } from '../../Constants';

describe('HeaderUserMenu', () => {
  const user = { name: 'harry potter' };
  const adminUser = {
    name: 'harry potter',
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
  };
  const userUrl = join('api', 'user');
  const logoutUrl = join('api', 'logout');
  const cleanupUrl = join('api', 'activity-reports', 'storage-cleanup');

  const before = async (admin = false) => {
    if (admin) {
      fetchMock.get(userUrl, { ...adminUser });
    } else {
      fetchMock.get(userUrl, { ...user });
    }

    fetchMock.get(logoutUrl, 200);
    fetchMock.get(cleanupUrl, []);

    render(<App />);

    await screen.findByText('Office of Head Start TTA Hub');
    fireEvent.click(screen.getByTestId('header-avatar'));
  };

  describe('when authenticated', () => {
    describe('as non-admin user', () => {
      beforeEach(async () => before());
      afterEach(() => fetchMock.restore());

      it('displays the logout button', async () => {
        expect(await screen.findByText('Log out')).toBeVisible();
      });
    });

    describe('as admin  user', () => {
      beforeEach(async () => before(true));
      afterEach(() => fetchMock.restore());

      it('displays the admin button', async () => {
        expect(await screen.findByText('Admin')).toBeVisible();
      });
    });

    describe('logout button', () => {
      beforeEach(async () => before());
      afterEach(() => fetchMock.restore());

      it('logs the user out', async () => {
        const logout = await screen.findByText('Log out');
        fireEvent.click(logout);
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
