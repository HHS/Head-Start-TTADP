import { act, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { archiveNotification } from '../../fetchers/notifications';
import NotificationCard from '../../pages/Notifications/components/NotificationCard';
import UserContext from '../../UserContext';
import HeaderUserMenu from '../HeaderUserMenu';

const countUrl = '/api/notifications/count?viewed.in[]=false&archived.in[]=false';
const notification = {
  id: 8,
  text: 'Review report',
  label: 'Review',
  link: '/report/8',
  actionable: true,
  viewedAt: null,
  createdAt: '2026-09-01',
  type: 'changesRequested',
};
async function setup(flags = ['actionable_notifications'], actionable = true) {
  const history = createMemoryHistory({ initialEntries: ['/notifications'] });
  await act(async () => {
    render(
      <Router history={history}>
        <UserContext.Provider
          value={{ user: { id: 1, name: 'Test User', permissions: [], flags } }}
        >
          <HeaderUserMenu setAreThereUnreadWhatsNewNotifications={jest.fn()} />
          <NotificationCard
            notification={{ ...notification, actionable } as any}
            onArchive={() => {}}
          />
        </UserContext.Provider>
      </Router>
    );
  });
  return history;
}

afterEach(() => fetchMock.restore());

it('does not fetch or show a bell without the flag', async () => {
  await setup([]);
  expect(screen.queryByRole('link', { name: /Notification center/ })).toBeNull();
  expect(fetchMock.calls()).toHaveLength(0);
});

it.each([true, false])('refreshes after a delayed CTA write, actionable=%s', async (actionable) => {
  let unread = 1;
  let complete;
  fetchMock.get(countUrl, () => ({ count: unread, rows: [] }));
  fetchMock.put(
    '/api/notifications/8',
    () =>
      new Promise((resolve) => {
        complete = () => {
          unread = 0;
          resolve({ viewedAt: '2026-09-29' });
        };
      })
  );
  const history = await setup(undefined, actionable);
  await screen.findByRole('link', { name: 'Notification center, 1 unread notification' });
  expect(fetchMock.calls(countUrl)).toHaveLength(1);
  userEvent.click(screen.getByTestId('header-avatar'));
  expect(screen.getByRole('link', { name: 'Notifications new' })).toBeVisible();
  userEvent.click(screen.getByRole('link', { name: 'Notifications new' }));
  await waitFor(() => expect(fetchMock.calls(countUrl)).toHaveLength(2));
  expect(
    screen.getByRole('link', { name: 'Notification center, 1 unread notification' })
  ).toBeVisible();
  expect(fetchMock.calls('/api/notifications/8')).toHaveLength(0);
  userEvent.click(screen.getByRole('link', { name: 'Review' }));
  await waitFor(() => expect(complete).toBeDefined());
  act(() => history.push('/notifications'));
  expect(
    screen.getByRole('link', { name: 'Notification center, 1 unread notification' })
  ).toBeVisible();
  await act(async () => complete());
  await screen.findByRole('link', { name: 'Notification center' });
  userEvent.click(screen.getByTestId('header-avatar'));
  const dropdown = within(screen.getByTestId('user-menu-dropdown'));
  expect(dropdown.getByRole('link', { name: 'Notifications' })).toBeVisible();
  expect(dropdown.queryByText('new')).toBeNull();
  expect(screen.getByText('Review report')).toBeVisible();
  const body = JSON.parse(fetchMock.lastCall('/api/notifications/8')[1].body as string);
  expect(body.viewedAt).toBeTruthy();
  expect(body.archivedAt).toBeUndefined();
});

it('refreshes on navigation and archive, keeping the dot for remaining unread items', async () => {
  let unread = 0;
  fetchMock.get(countUrl, () => ({ count: unread, rows: [] }));
  fetchMock.put('/api/notifications/8', () => {
    unread = 1;
    return {};
  });
  const history = await setup();
  await waitFor(() => expect(fetchMock.called(countUrl)).toBe(true));
  unread = 2;
  act(() => history.push('/another-page'));
  await screen.findByRole('link', { name: 'Notification center, 2 unread notifications' });
  await act(async () => {
    await archiveNotification('8');
  });
  await waitFor(() => expect(fetchMock.calls(countUrl).length).toBeGreaterThanOrEqual(3));
  expect(
    screen.getByRole('link', { name: 'Notification center, 1 unread notification' })
  ).toBeVisible();
});

it('keeps unread state when the CTA write fails and still navigates', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.get(countUrl, { count: 1, rows: [] });
  fetchMock.put('/api/notifications/8', 500);
  const history = await setup();
  await screen.findByRole('link', { name: 'Notification center, 1 unread notification' });
  userEvent.click(screen.getByRole('link', { name: 'Review' }));
  await waitFor(() => expect(log).toHaveBeenCalled());
  expect(history.location.pathname).toBe('/report/8');
  expect(
    screen.getByRole('link', { name: 'Notification center, 1 unread notification' })
  ).toBeVisible();
  log.mockRestore();
});

it('ignores an older count response after navigation', async () => {
  let completeOld;
  let requests = 0;
  fetchMock.get(countUrl, () => {
    requests += 1;
    if (requests === 1)
      return new Promise((resolve) => {
        completeOld = resolve;
      });
    return { count: 1, rows: [] };
  });
  const history = await setup();
  await waitFor(() => expect(completeOld).toBeDefined());
  act(() => history.push('/next'));
  await screen.findByRole('link', { name: 'Notification center, 1 unread notification' });
  await act(async () => completeOld({ count: 0, rows: [] }));
  expect(
    screen.getByRole('link', { name: 'Notification center, 1 unread notification' })
  ).toBeVisible();
});

it('keeps the bell usable after a count request fails', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.get(countUrl, 500);
  await setup();
  await waitFor(() => expect(log).toHaveBeenCalled());
  expect(screen.getByRole('link', { name: 'Notification center' })).toHaveAttribute(
    'href',
    '/notifications'
  );
  log.mockRestore();
});
