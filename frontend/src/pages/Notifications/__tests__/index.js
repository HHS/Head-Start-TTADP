import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router';
import FeatureFlag from '../../../components/FeatureFlag';
import { fetchArchivedNotifications, fetchNotifications } from '../../../fetchers/notifications';
import useFetch from '../../../hooks/useFetch';
import UserContext from '../../../UserContext';
import Notifications from '../index';

jest.mock('../../../hooks/useFetch');
jest.mock('../../../fetchers/notifications');

const sampleRow = (overrides = {}) => ({
  id: 1,
  type: 'changesRequested',
  text: 'Test',
  displayId: 'R01',
  ...overrides,
});

// Configure the useFetch mock to invoke the supplied fetcher (so the test can
// observe what sortConfig is passed to the notifications fetchers) and return
// the desired data/loading/error shape.
const mockUseFetch = ({ count = 0, rows = [], loading = false, error = null } = {}) => {
  useFetch.mockImplementation((_initial, fetcher) => {
    if (fetcher) {
      fetcher();
    }
    return {
      data: { count, rows },
      loading,
      error,
    };
  });
};

const renderPage = (route = '/notifications') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Notifications />
    </MemoryRouter>
  );

describe('Notifications Page', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUseFetch();
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

  test('renders both tabs when there are notifications', () => {
    mockUseFetch({ count: 1, rows: [sampleRow()] });

    renderPage('/notifications');

    expect(screen.getByRole('link', { name: 'Active' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Archived' })).toBeVisible();
  });

  test('preferences link', () => {
    renderPage('/notifications');

    const prefLinks = screen.getAllByRole('link', { name: 'Set notification preferences' });
    expect(prefLinks.length).toBeGreaterThanOrEqual(1);
    prefLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/account/notifications');
    });
  });

  describe.each([
    {
      label: 'active',
      route: '/notifications',
      fetcher: () => fetchNotifications,
      otherFetcher: () => fetchArchivedNotifications,
      emptyText: "You don't have any new notifications.",
    },
    {
      label: 'archived',
      route: '/notifications/archive',
      fetcher: () => fetchArchivedNotifications,
      otherFetcher: () => fetchNotifications,
      emptyText: "You don't have any archived notifications.",
    },
  ])('$label route', ({ route, fetcher, otherFetcher, emptyText }) => {
    describe('fetcher routing', () => {
      test('calls the correct fetcher and not the other', () => {
        renderPage(route);

        expect(fetcher()).toHaveBeenCalledTimes(1);
        expect(otherFetcher()).not.toHaveBeenCalled();
      });

      test('passes the default sortConfig to the fetcher', () => {
        renderPage(route);

        expect(fetcher()).toHaveBeenCalledWith({
          sortConfig: {
            sortBy: 'action_needed',
            direction: 'asc',
            activePage: 1,
            offset: 0,
          },
        });
      });
    });

    describe('loading and error states', () => {
      test('renders the container during loading', () => {
        mockUseFetch({ loading: true });

        renderPage(route);

        expect(document.querySelector('.notifications-container')).toBeVisible();
      });

      test('renders the error alert when useFetch returns an error', () => {
        mockUseFetch({ error: 'some error' });

        renderPage(route);

        expect(screen.getByText('Error loading notifications')).toBeVisible();
      });
    });

    describe('pagination', () => {
      test('renders PaginationCard when count > perPage', () => {
        mockUseFetch({ count: 25, rows: [sampleRow()] });

        renderPage(route);

        expect(document.querySelector('nav[aria-label="Pagination, bottom"]')).toBeVisible();
      });

      test('does not render PaginationCard when notifications are empty', () => {
        mockUseFetch({ count: 0, rows: [] });

        renderPage(route);

        expect(document.querySelector('nav[aria-label="Pagination, bottom"]')).toBeNull();
      });

      test('does not render PaginationCard when there is an error', () => {
        mockUseFetch({ count: 25, rows: [], error: 'boom' });

        renderPage(route);

        expect(document.querySelector('nav[aria-label="Pagination, bottom"]')).toBeNull();
      });

      test('clicking the next page button refetches with activePage=2 and offset=10', () => {
        mockUseFetch({ count: 25, rows: [sampleRow()] });

        renderPage(route);

        // Sanity: initial fetch uses the default page/offset
        expect(fetcher()).toHaveBeenLastCalledWith({
          sortConfig: expect.objectContaining({ activePage: 1, offset: 0 }),
        });

        const nextButton = screen.getByRole('button', { name: /next page/i });
        fireEvent.click(nextButton);

        expect(fetcher()).toHaveBeenLastCalledWith({
          sortConfig: expect.objectContaining({
            sortBy: 'action_needed',
            direction: 'asc',
            activePage: 2,
            offset: 10,
          }),
        });
      });
    });

    describe('sorting', () => {
      test('renders all 8 sort options in the dropdown', () => {
        renderPage(route);

        const dropdown = screen.getByLabelText('Sort by');
        const options = dropdown.querySelectorAll('option');
        expect(options).toHaveLength(8);

        const expectedLabels = [
          'Action needed (oldest first)',
          'Action needed (newest first)',
          'Informational (oldest first)',
          'Informational (newest first)',
          'Notification type (A-Z)',
          'Notification type (Z-A)',
          'All (oldest first)',
          'All (newest first)',
        ];
        expectedLabels.forEach((label) => {
          expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
        });
      });

      test('dropdown reflects the default sort value action_needed-asc on first render', () => {
        renderPage(route);

        expect(screen.getByLabelText('Sort by')).toHaveValue('action_needed-asc');
      });

      test('changing the sort dropdown refetches with the new sort config and resets pagination', () => {
        mockUseFetch({ count: 25, rows: [sampleRow()] });

        renderPage(route);

        // Advance to page 2 first so we can verify the sort change resets pagination
        fireEvent.click(screen.getByRole('button', { name: /next page/i }));
        expect(fetcher()).toHaveBeenLastCalledWith({
          sortConfig: expect.objectContaining({ activePage: 2, offset: 10 }),
        });

        fireEvent.change(screen.getByLabelText('Sort by'), {
          target: { value: 'informational-desc' },
        });

        expect(fetcher()).toHaveBeenLastCalledWith({
          sortConfig: {
            sortBy: 'informational',
            direction: 'desc',
            activePage: 1,
            offset: 0,
          },
        });
      });
    });

    describe('empty state', () => {
      test(`shows the "${emptyText}" message`, () => {
        mockUseFetch({ count: 0, rows: [] });

        renderPage(route);

        expect(screen.getByText("You're all caught up!")).toBeVisible();
        expect(screen.getByText(emptyText)).toBeVisible();
      });

      test('shows the Set notification preferences link in the empty state', () => {
        mockUseFetch({ count: 0, rows: [] });

        renderPage(route);

        const links = screen.getAllByRole('link', { name: 'Set notification preferences' });
        // One in the top controls, one in the empty-state card.
        expect(links.length).toBeGreaterThanOrEqual(2);
        links.forEach((link) => {
          expect(link).toHaveAttribute('href', '/account/notifications');
        });
      });

      test('keeps the sort dropdown and page heading visible', () => {
        mockUseFetch({ count: 0, rows: [] });

        renderPage(route);

        expect(screen.getByText('Notifications')).toBeVisible();
        expect(screen.getByLabelText('Sort by')).toBeVisible();
      });
    });

    describe('list rendering', () => {
      test('renders a notification card per row', () => {
        mockUseFetch({
          count: 2,
          rows: [
            sampleRow({ id: 1, text: 'First notification' }),
            sampleRow({
              id: 2,
              type: 'systemPlannedOutage',
              text: 'Second notification',
              displayId: 'R02',
            }),
          ],
        });

        renderPage(route);

        expect(document.querySelectorAll('.notification-card')).toHaveLength(2);
      });
    });
  });
});
