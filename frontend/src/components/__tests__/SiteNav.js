import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import {
  screen, render,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router-dom';
import SiteNav from '../SiteNav';
import UserContext from '../../UserContext';

describe('SiteNav', () => {
  const renderTest = (initialEntries = []) => {
    const user = {
      name: 'name',
      id: 1,
      flags: [],
      roles: [],
      permissions: [],
    };

    render(
      <MemoryRouter initialEntries={initialEntries}>
        <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
          <SiteNav authenticated admin user={user} hasAlerts={false} />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  describe('when authenticated & pathname = "activity-reports', () => {
    afterEach(() => fetchMock.restore());

    const logoutUrl = join('api', 'logout');
    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = {
        name: 'name',
        id: 1,
        flags: [],
        roles: [],
        permissions: [],
      };

      fetchMock.get(userUrl, { ...user });
      fetchMock.get(logoutUrl, 200);
    });
    test('survey button is visible', async () => {
      renderTest(['/activity-reports']);
      const surveyButton = await screen.findByText(/Please leave feedback/i);
      expect(surveyButton).toBeVisible();
    });
  });

  describe('when authenticated', () => {
    afterEach(() => fetchMock.restore());

    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user, permissions: [] });

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated user={user} hasAlerts={false} />
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
      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user: {}, authenticated: false, logout: () => {} }}>
            <SiteNav authenticated={false} hasAlerts={false} />
          </UserContext.Provider>
        </MemoryRouter>,
      );
    });

    test('nav items are not visible', () => {
      expect(screen.queryAllByRole('link').length).toBe(1);
    });
  });

  describe('when authenticated & hasAlerts && no header', () => {
    afterEach(() => fetchMock.restore());

    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name' };
      fetchMock.get(userUrl, { ...user, permissions: [] });

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated user={user} hasAlerts />
          </UserContext.Provider>
        </MemoryRouter>,
      );
    });

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0);
    });
  });

  describe('when authenticated & hasAlerts && a header', () => {
    afterEach(() => fetchMock.restore());

    const userUrl = join('api', 'user');

    beforeEach(() => {
      const user = { name: 'name', permissions: [] };
      fetchMock.get(userUrl, { ...user });

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <header className="smart-hub-header.has-alerts">
              <SiteNav authenticated user={user} hasAlerts />
            </header>
          </UserContext.Provider>
        </MemoryRouter>,
      );
    });

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0);
    });
  });
});
