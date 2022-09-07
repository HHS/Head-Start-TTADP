import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import {
  screen, render,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter, Router } from 'react-router';
import { createMemoryHistory } from 'history';

import SiteNav from '../SiteNav';

const history = createMemoryHistory();

describe('SiteNav', () => {
  describe('when authenticated & pathname = "activity-reports', () => {
    afterEach(() => fetchMock.restore());

    const logoutUrl = join('api', 'logout');
    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user });
      fetchMock.get(logoutUrl, 200);

      render(
        <Router history={history}>
          <SiteNav authenticated admin user={user} />
        </Router>,
      );
    });
    test('survey button is visible', async () => {
      history.push('/activity-reports');
      const surveyButton = await screen.findByText(/Please leave feedback/i);
      expect(surveyButton).toBeVisible();
    });
  });

  describe('when authenticated', () => {
    afterEach(() => fetchMock.restore());

    const logoutUrl = join('api', 'logout');
    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user });
      fetchMock.get(logoutUrl, 200);

      render(
        <MemoryRouter>
          <SiteNav authenticated admin user={user} />
        </MemoryRouter>,
      );
    });

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0);
    });

    it('displays the logout button', async () => {
      expect(await screen.findByText('Logout')).toBeVisible();
    });
  });

  describe('when user is an admin', () => {
    it('the admin link is visible', () => {
      render(<MemoryRouter><SiteNav authenticated admin /></MemoryRouter>);
      const adminLink = screen.getByRole('link', { name: 'Admin' });
      expect(adminLink).toBeVisible();
    });
  });

  describe('when unauthenticated', () => {
    beforeEach(() => {
      render(<MemoryRouter><SiteNav authenticated={false} /></MemoryRouter>);
    });

    test('nav items are not visible', () => {
      expect(screen.queryAllByRole('link').length).toBe(1);
    });
  });
});
