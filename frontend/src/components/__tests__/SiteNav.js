import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import {
  screen, render,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter, Router } from 'react-router';
import { createMemoryHistory } from 'history';
import UserContext from '../../UserContext';

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
          <UserContext.Provider value={{ user }}>
            <SiteNav authenticated admin user={user} />
          </UserContext.Provider>
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

    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user });

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user }}>
            <SiteNav authenticated user={user} />
          </UserContext.Provider>
        </MemoryRouter>,
      );
    });

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0);
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
