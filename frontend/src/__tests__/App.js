import React from 'react';
import '@testing-library/jest-dom';
import join from 'url-join';
import {
  screen, render, fireEvent,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import App from '../App';

describe('App', () => {
  const loginText = 'Log In with HSES';

  afterEach(() => fetchMock.restore());
  const userUrl = join('api', 'user');
  const logoutUrl = join('api', 'logout');

  describe('when authenticated', () => {
    beforeEach(async () => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user });
      fetchMock.get(logoutUrl, 200);
      render(<App />);
      await screen.findByText('Activity Reports');
    });

    it('displays the logout button', async () => {
      expect(await screen.findByText('Logout')).toBeVisible();
    });

    it('can log the user out when "logout" is pressed', async () => {
      const logout = await screen.findByText('Logout');
      fireEvent.click(logout);
      expect(await screen.findByText(loginText)).toBeVisible();
      expect(await screen.findByText('Logout Successful')).toBeVisible();
    });
  });

  describe('when unauthenticated', () => {
    it('displays the login button', async () => {
      fetchMock.get(userUrl, 401);
      render(<App />);
      expect(await screen.findByText(loginText)).toBeVisible();
    });
  });

  describe('when user is locked', () => {
    it('displays the "request permissions" page', async () => {
      fetchMock.get(userUrl, 403);
      render(<App />);
      expect(await screen.findByText('You need permission to access the TTA Hub.')).toBeVisible();
      expect(await screen.findByText('Request Permission')).toBeVisible();
    });
  });
});
