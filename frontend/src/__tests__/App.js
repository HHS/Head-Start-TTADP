import React from 'react';
import '@testing-library/jest-dom';
import join from 'url-join';
import {
  screen, render,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import App from '../App';

describe('App', () => {
  const loginText = 'Log In with HSES';

  afterEach(() => fetchMock.restore());
  const userUrl = join('api', 'user');

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
