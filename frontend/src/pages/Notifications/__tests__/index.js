import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router';
import FeatureFlag from '../../../components/FeatureFlag';
import { fetchArchivedNotifications, fetchNotifications } from '../../../fetchers/notifications';
import useFetch from '../../../hooks/useFetch';
import UserContext from '../../../UserContext';
import Notifications from '../index';

jest.mock('../../../hooks/useFetch');
jest.mock('../../../fetchers/notifications');

describe('Notifications Page', () => {
  beforeEach(() => {
    useFetch.mockImplementation((_initial, fetcher) => {
      if (fetcher) {
        fetcher();
      }

      return {
        data: [],
        loading: false,
        error: null,
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('displays notifications page', () => {
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );

    expect(screen.getByText('Notifications')).toBeVisible();
  });

  test('redirects users without the actionable notifications flag to the 404 page', () => {
    const user = {
      name: 'user',
      permissions: [],
      flags: [],
    };

    render(
      <UserContext.Provider value={{ user }}>
        <MemoryRouter initialEntries={['/notifications']}>
          <FeatureFlag flag="actionable_notifications" renderNotFound>
            <Notifications />
          </FeatureFlag>
          <Route path="/something-went-wrong/404">
            <div>Not found page</div>
          </Route>
        </MemoryRouter>
      </UserContext.Provider>
    );

    expect(screen.getByText('Not found page')).toBeVisible();
    expect(screen.queryByText('Notifications')).toBe(null);
  });

  test('renders both tabs', () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Active' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Archived' })).toBeVisible();
  });

  test('preferences link', () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Set notifications preferences' })).toHaveAttribute(
      'href',
      '/notifications/preferences'
    );
  });

  test('calls fetchNotifications on active route', () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(fetchNotifications).toHaveBeenCalledTimes(1);
    expect(fetchArchivedNotifications).not.toHaveBeenCalled();
  });

  test('calls fetchArchivedNotifications on archive route', () => {
    render(
      <MemoryRouter initialEntries={['/notifications/archive']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(fetchArchivedNotifications).toHaveBeenCalledTimes(1);
    expect(fetchNotifications).not.toHaveBeenCalled();
  });

  test('shows loading state', () => {
    useFetch.mockReturnValue({
      data: [],
      loading: true,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(document.querySelector('.notifications-container')).toBeVisible();
  });

  test('shows error state', () => {
    useFetch.mockReturnValue({
      data: [],
      loading: false,
      error: 'some error',
    });

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(screen.getByText('Error loading notifications')).toBeVisible();
  });

  test('renders notification cards', () => {
    useFetch.mockReturnValue({
      data: [
        {
          id: 1,
          type: 'changesRequested',
          text: 'First notification',
          displayId: 'R01',
        },
        {
          id: 2,
          type: 'systemPlannedOutage',
          text: 'Second notification',
          displayId: 'R02',
        },
      ],
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Notifications />
      </MemoryRouter>
    );

    expect(document.querySelectorAll('.notification-card')).toHaveLength(2);
  });
});
