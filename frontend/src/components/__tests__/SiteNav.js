import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import {
  screen, render, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter, Router } from 'react-router';
import { createMemoryHistory } from 'history';

import { SCOPE_IDS } from '@ttahub/common';
import SiteNav from '../SiteNav';
import UserContext from '../../UserContext';

const history = createMemoryHistory();

describe('SiteNav', () => {
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

      render(
        <Router history={history}>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated admin user={user} hasAlerts={false} />
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

  describe('has permission to see training reports', () => {
    afterEach(() => fetchMock.restore());

    const userUrl = join('api', 'user');

    const renderWithScopes = (scopes = []) => {
      const user = {
        name: 'name',
        permissions: scopes.map((scope) => ({ scopeId: scope, regionId: 1 })),
      };
      fetchMock.get(userUrl,
        {
          ...user,
        });

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated user={user} hasAlerts={false} />
          </UserContext.Provider>
        </MemoryRouter>,
      );
    };

    test('visible for POC', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.POC_TRAINING_REPORTS]);
      });

      expect(await screen.findByRole('link', { name: 'Training Reports' })).toBeInTheDocument();
    });

    test('visible for read write', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.READ_WRITE_TRAINING_REPORTS]);
      });
      expect(await screen.findByRole('link', { name: 'Training Reports' })).toBeInTheDocument();
    });

    test('visible for read', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.READ_TRAINING_REPORTS]);
      });
      expect(await screen.findByRole('link', { name: 'Training Reports' })).toBeInTheDocument();
    });

    test('visible for combo', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.READ_TRAINING_REPORTS, SCOPE_IDS.POC_TRAINING_REPORTS]);
      });
      expect(await screen.findByRole('link', { name: 'Training Reports' })).toBeInTheDocument();
    });

    test('visible for combo where some don\'t apply', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.READ_ACTIVITY_REPORTS, SCOPE_IDS.POC_TRAINING_REPORTS]);
      });
      expect(await screen.findByRole('link', { name: 'Training Reports' })).toBeInTheDocument();
    });

    test('visible for admin', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.READ_ACTIVITY_REPORTS, SCOPE_IDS.ADMIN]);
      });
      expect(await screen.findByRole('link', { name: 'Training Reports' })).toBeInTheDocument();
    });

    test('not visible when scope missing', async () => {
      act(() => {
        renderWithScopes([SCOPE_IDS.READ_ACTIVITY_REPORTS]);
      });
      expect(screen.queryByRole('link', { name: 'Training Reports' })).toBeNull();
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
