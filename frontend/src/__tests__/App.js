import React from 'react';
import '@testing-library/jest-dom';
import join from 'url-join';
import {
  screen,
  render,
  act,
  waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import App from '../App';

const storageCleanup = join('api', 'activity-reports', 'storage-cleanup');
describe('App', () => {
  const loginText = 'Log In with HSES';

  beforeEach(async () => fetchMock.get(storageCleanup, []));
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

  describe('when user is authenticated', () => {
    it('fetches alerts', async () => {
      const hubUser = {
        id: 1,
        name: 'Jim user',
        hsesUserId: '213434',
        hsesUsername: 'jim.user',
        hsesAuthorities: ['ROLE_FEDERAL'],
        email: 'email@email.com',
        phoneNumber: '123456',
        homeRegionId: 1,
        flags: [],
        permissions: [{ userId: 1, scopeId: 1, regionId: 1 }],
        roles: [
          {
            id: 6,
            name: 'CO',
            fullName: 'Central Office',
            isSpecialist: false,
            UserRole: { userId: 1, roleId: 6 },
          }],
      };

      fetchMock.get(userUrl, hubUser);

      const alertsUrl = join('api', 'alerts');
      fetchMock.get(alertsUrl, []);

      const renderApp = () => render(<App />);
      act(renderApp);

      await waitFor(() => expect(fetchMock.called(alertsUrl)).toBe(true));
    });
  });
});
