import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { archiveNotification } from '../../fetchers/notifications';
import NotificationCard from '../../pages/Notifications/components/NotificationCard';
import UserContext from '../../UserContext';
import NotificationBell from '../NotificationBell';

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
function setup(flags = ['actionable_notifications'], actionable = true) {
  const history = createMemoryHistory({ initialEntries: ['/notifications'] });
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user: { id: 1, flags } }}>
        <NotificationBell />
        <NotificationCard
          notification={{ ...notification, actionable } as any}
          onArchive={() => {}}
        />
      </UserContext.Provider>
    </Router>
  );
  return history;
}

afterEach(() => fetchMock.restore());

it('does not fetch or show a bell without the flag', () => {
  setup([]);
  expect(screen.queryByRole('link', { name: /Notifications/ })).toBeNull();
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
  const history = setup(undefined, actionable);
  await screen.findByRole('link', { name: 'Notifications, unread notifications' });
  expect(fetchMock.calls('/api/notifications/8')).toHaveLength(0);
  userEvent.click(screen.getByRole('link', { name: 'Review' }));
  await waitFor(() => expect(complete).toBeDefined());
  act(() => history.push('/notifications'));
  expect(screen.getByRole('link', { name: 'Notifications, unread notifications' })).toBeVisible();
  await act(async () => complete());
  await screen.findByRole('link', { name: 'Notifications' });
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
  const history = setup();
  await waitFor(() => expect(fetchMock.called(countUrl)).toBe(true));
  unread = 2;
  act(() => history.push('/another-page'));
  await screen.findByRole('link', { name: 'Notifications, unread notifications' });
  await act(async () => {
    await archiveNotification('8');
  });
  await waitFor(() => expect(fetchMock.calls(countUrl).length).toBeGreaterThanOrEqual(3));
  expect(screen.getByRole('link', { name: 'Notifications, unread notifications' })).toBeVisible();
});

it('keeps unread state when the CTA write fails and still navigates', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.get(countUrl, { count: 1, rows: [] });
  fetchMock.put('/api/notifications/8', 500);
  const history = setup();
  await screen.findByRole('link', { name: 'Notifications, unread notifications' });
  userEvent.click(screen.getByRole('link', { name: 'Review' }));
  await waitFor(() => expect(log).toHaveBeenCalled());
  expect(history.location.pathname).toBe('/report/8');
  expect(screen.getByRole('link', { name: 'Notifications, unread notifications' })).toBeVisible();
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
  const history = setup();
  await waitFor(() => expect(completeOld).toBeDefined());
  act(() => history.push('/next'));
  await screen.findByRole('link', { name: 'Notifications, unread notifications' });
  await act(async () => completeOld({ count: 0, rows: [] }));
  expect(screen.getByRole('link', { name: 'Notifications, unread notifications' })).toBeVisible();
});

it('keeps the bell usable after a count request fails', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.get(countUrl, 500);
  setup();
  await waitFor(() => expect(log).toHaveBeenCalled());
  expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
    'href',
    '/notifications'
  );
  log.mockRestore();
});
