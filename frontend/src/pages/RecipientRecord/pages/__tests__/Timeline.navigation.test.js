import '@testing-library/jest-dom';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { COMMUNICATION_PURPOSES } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Link, Route, Router } from 'react-router-dom';
import AriaLiveContext from '../../../../AriaLiveContext';
import { TIMELINE_FILTER_CONFIG } from '../../../../components/filter/timelineFilters';
import { getRecipientTimeline } from '../../../../fetchers/recipient';
import useFilters from '../../../../hooks/useFilters';
import UserContext from '../../../../UserContext';
import { filtersToQueryString } from '../../../../utils';
import Timeline from '../Timeline';

jest.mock('../../../../hooks/useFilters');
jest.mock('../../../../fetchers/recipient', () => ({ getRecipientTimeline: jest.fn() }));

const batch = (start, length) =>
  Array.from({ length }, (_, index) => ({
    source: 'activityReport',
    sourceId: start + index,
    eventType: 'TTA activity',
    title: `Event ${start + index}`,
    date: '2026-07-07',
    subtitle: null,
    byline: null,
    durationHours: null,
    indicators: [],
    tags: [],
    details: [],
    links: [],
  }));
// Emulates the API's keyset paging. A cursor encodes how many events came before it.
const pageAt = (total, cursor, size = 25) => {
  const start = cursor ? Number(cursor.replace('after-', '')) : 0;
  const length = Math.min(size, total - start);
  return {
    count: total,
    events: batch(start + 1, length),
    ...(start + length < total ? { nextCursor: `after-${start + length}` } : {}),
  };
};
const view = {
  mode: 'chronological',
  recipientId: '401',
  regionId: '1',
  direction: 'desc',
  excludeMultiRecipientCommunications: false,
};
const position = {
  queryKey: JSON.stringify(['401', '1', 'desc', false, '']),
  loadedPages: 3,
  eventKey: JSON.stringify(['activityReport', 32]),
  top: -20,
  scrollY: 3120,
};
const historyAt = (state) =>
  createMemoryHistory({ initialEntries: [{ pathname: '/timeline', state }] });
const renderTimeline = (history) =>
  render(
    <UserContext.Provider value={{ user: { homeRegionId: 1 } }}>
      <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
        <Router history={history}>
          <Route path="/timeline">
            <Timeline recipientId="401" regionId="1" />
            <Link to="/detail">View details</Link>
          </Route>
          <Route path="/detail">
            <p>Detail page</p>
          </Route>
        </Router>
      </AriaLiveContext.Provider>
    </UserContext.Provider>
  );
const scrollTo = (top) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: top });
};
// Swap the mocked useFilters for the real one, which reads and writes the URL.
const mockRealFilters = () => {
  const realUseFilters = jest.requireActual('../../../../hooks/useFilters').default;
  const latest = {};
  useFilters.mockImplementation((...args) => {
    const result = realUseFilters(...args);
    latest.setFilters = result.setFilters;
    return result;
  });
  return latest;
};

describe('timeline navigation restoration', () => {
  beforeEach(() => {
    window.sessionStorage.removeItem('timeline-filters-401');
    fetchMock.get('begin:/api/feeds/item?tag=ttahub-timeline', '<feed></feed>');
    getRecipientTimeline.mockReset();
    useFilters.mockReturnValue({
      filters: [],
      onApplyFilters: jest.fn(),
      onRemoveFilter: jest.fn(),
      filterConfig: TIMELINE_FILTER_CONFIG,
    });
    scrollTo(0);
    window.history.scrollRestoration = 'auto';
    jest.spyOn(window, 'scrollTo').mockImplementation(({ top }) => scrollTo(top));
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      const key = this.dataset.timelineEvent;
      const id = key ? JSON.parse(key)[1] : 1;
      const top = (id - 1) * 100 - window.scrollY;
      return { top, bottom: top + 100, height: 100, left: 0, right: 100, width: 100 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fetchMock.restore();
  });

  it.each(['monitoring', 'goals'])(
    'restores the original view and filters with Back after switching to %s',
    async (mode) => {
      mockRealFilters();
      const initialFilters = [
        { id: 'goal', topic: 'standard', condition: 'is', query: ['Family Support'] },
      ];
      const initialSearch = `?${filtersToQueryString(initialFilters)}`;
      const history = createMemoryHistory({
        initialEntries: [
          {
            pathname: '/timeline',
            search: initialSearch,
            state: { timelineView: view },
          },
        ],
      });
      getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
      renderTimeline(history);
      await screen.findByText('No results found.');
      await act(async () =>
        userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), mode)
      );
      await waitFor(() =>
        expect(getRecipientTimeline).toHaveBeenLastCalledWith(
          '401',
          '1',
          expect.objectContaining({ view: mode })
        )
      );
      expect(history.length).toBe(2);
      act(() => history.goBack());
      await waitFor(() =>
        expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('desc')
      );
      expect(history.location.search).toBe(initialSearch);
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({
          filters: [expect.objectContaining({ topic: 'standard', query: ['Family Support'] })],
        })
      );
      expect(getRecipientTimeline.mock.calls.at(-1)[2].view).toBeUndefined();
      act(() => history.goForward());
      await waitFor(() => expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue(mode));
      expect(getRecipientTimeline.mock.calls.at(-1)[2].filters).toEqual([
        expect.objectContaining({ topic: 'standard', query: ['Family Support'] }),
      ]);
    }
  );

  it('keeps all filters when switching views and restores the chosen view after details', async () => {
    mockRealFilters();
    const initialFilters = [
      { id: 'goal', topic: 'standard', condition: 'is', query: ['Family Support'] },
      { id: 'event', topic: 'eventType', condition: 'is', query: ['TTA activity'] },
    ];
    const history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/timeline',
          search: `?${filtersToQueryString(initialFilters)}`,
        },
      ],
    });
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
    renderTimeline(history);
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.click(screen.getByRole('checkbox', { name: 'Hide multi-recipient communications' }))
    );
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'monitoring')
    );
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({
          view: 'monitoring',
          excludeMultiRecipientCommunications: true,
          filters: [
            expect.objectContaining({ topic: 'standard', query: ['Family Support'] }),
            expect.objectContaining({ topic: 'eventType' }),
          ],
        })
      )
    );
    expect(screen.getByText('Goal category', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('Monitoring', { selector: 'strong' })).not.toBeInTheDocument();
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'goals')
    );
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({
          view: 'goals',
          excludeMultiRecipientCommunications: true,
          filters: [
            expect.objectContaining({ topic: 'standard', query: ['Family Support'] }),
            expect.objectContaining({ topic: 'eventType' }),
          ],
        })
      )
    );
    expect(screen.getByText('Goal category', { selector: 'strong' })).toBeInTheDocument();
    await act(async () => userEvent.click(screen.getByRole('link', { name: 'View details' })));
    act(() => history.goBack());
    expect(await screen.findByRole('combobox', { name: 'View' })).toHaveValue('goals');
  });

  it('applies no goal category filter pill in the Monitoring view', async () => {
    mockRealFilters();
    const history = createMemoryHistory({
      initialEntries: [{ pathname: '/timeline', search: '', state: { timelineView: view } }],
    });
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
    renderTimeline(history);
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'monitoring')
    );
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({ view: 'monitoring' })
      )
    );
    expect(
      getRecipientTimeline.mock.calls.at(-1)[2].filters.filter(({ topic }) => topic === 'standard')
    ).toHaveLength(0);
    expect(history.location.search).not.toContain('standard.');
    expect(screen.queryByText('Goal category', { selector: 'strong' })).not.toBeInTheDocument();
  });

  it.each([
    ['monitoring', 'desc'],
    ['monitoring', 'asc'],
    ['goals', 'desc'],
    ['goals', 'asc'],
  ])('keeps every filter when moving from %s to date order %s', async (mode, direction) => {
    mockRealFilters();
    const initialFilters = [
      { id: 'date', topic: 'date', condition: 'is within', query: '2025/10/01-2026/10/26' },
      { id: 'event', topic: 'eventType', condition: 'is', query: ['TTA activity'] },
      { id: 'purpose', topic: 'purpose', condition: 'is', query: [COMMUNICATION_PURPOSES[0]] },
      { id: 'goal', topic: 'standard', condition: 'is', query: ['Family Support'] },
    ];
    const history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/timeline',
          search: `?${filtersToQueryString(initialFilters)}`,
          state: { timelineView: { ...view, mode, excludeMultiRecipientCommunications: true } },
        },
      ],
    });
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
    renderTimeline(history);
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), direction)
    );
    await waitFor(() => {
      const request = getRecipientTimeline.mock.calls.at(-1)[2];
      expect(request.view).toBeUndefined();
      expect(request).toMatchObject({
        direction,
        excludeMultiRecipientCommunications: true,
      });
      expect(request.filters).toHaveLength(initialFilters.length);
      expect(request.filters).toEqual(
        expect.arrayContaining(
          initialFilters.map(({ id, ...filter }) => expect.objectContaining(filter))
        )
      );
    });
    expect(screen.getByText('Goal category', { selector: 'strong' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Hide multi-recipient communications' })
    ).toBeChecked();
    // A view switch is one history entry, and Back still restores the old view and filters.
    expect(history.length).toBe(2);
    act(() => history.goBack());
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue(mode));
    expect(
      getRecipientTimeline.mock.calls.at(-1)[2].filters.filter(({ topic }) => topic === 'standard')
    ).toHaveLength(1);
  });

  it("does not write one recipient's filters under the next recipient's saved key", async () => {
    const realFilters = mockRealFilters();
    const saved = [{ id: 'saved', topic: 'eventType', condition: 'is', query: ['Goal closed'] }];
    window.sessionStorage.setItem('timeline-filters-644', JSON.stringify(saved));
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
    const history = createMemoryHistory({ initialEntries: ['/timeline/401/1'] });
    render(
      <UserContext.Provider value={{ user: { homeRegionId: 1 } }}>
        <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
          <Router history={history}>
            <Route
              path="/timeline/:recipientId/:regionId"
              render={({ match }) => (
                <Timeline recipientId={match.params.recipientId} regionId={match.params.regionId} />
              )}
            />
          </Router>
        </AriaLiveContext.Provider>
      </UserContext.Provider>
    );
    await screen.findByText('No results found.');
    const filter = [{ id: 'type', topic: 'eventType', condition: 'is', query: ['Goal added'] }];
    act(() => realFilters.setFilters(filter));
    await waitFor(() =>
      expect(window.sessionStorage.getItem('timeline-filters-401')).toContain('Goal added')
    );
    act(() => history.push('/timeline/644/6'));
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith('644', '6', expect.anything())
    );
    expect(window.sessionStorage.getItem('timeline-filters-644')).toContain('Goal closed');
    expect(window.sessionStorage.getItem('timeline-filters-644')).not.toContain('Goal added');
    window.sessionStorage.removeItem('timeline-filters-644');
  });

  it('keeps focus on the View dropdown after changing to a different view', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
    renderTimeline(historyAt({ timelineView: view }));
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'goals')
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('goals')
    );
    expect(screen.getByRole('combobox', { name: 'View' })).toHaveFocus();
  });

  it('does not take focus when Back returns to a different view', async () => {
    const history = historyAt({ timelineView: view });
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [], categories: [] });
    renderTimeline(history);
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'goals')
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('goals')
    );
    act(() => history.goBack());
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('desc'));
    expect(screen.getByRole('combobox', { name: 'View' })).not.toHaveFocus();
  });

  it('nests event titles one level below their category headings in grouped views', async () => {
    const events = batch(1, 2).map((event) => ({
      ...event,
      tags: [{ label: 'Monitoring', flagged: true }],
    }));
    getRecipientTimeline.mockResolvedValue({
      count: 2,
      events,
      categories: [{ label: 'Monitoring', statuses: ['In Progress'] }],
    });
    renderTimeline(historyAt({ timelineView: { ...view, mode: 'goals' } }));
    expect(await screen.findByRole('heading', { name: 'Event 1', level: 4 })).toBeVisible();
    expect(screen.getByRole('heading', { name: /Monitoring In Progress/, level: 3 })).toBeVisible();
  });

  it.each(['monitoring', 'goals'])(
    'keeps goal dividers visible and unique across pages in %s view',
    async (mode) => {
      const first = batch(1, 25).map((event) => ({
        ...event,
        tags: [{ label: 'Monitoring', flagged: true }],
      }));
      first[24] = {
        ...first[24],
        source: 'goalStatusChange',
        eventType: 'Goal reopened',
        details: [{ label: 'Goal number', items: [{ text: 'G-109560' }] }],
      };
      const second = [
        {
          ...first[24],
          sourceId: 26,
          eventType: 'Goal closed',
          details: [{ label: 'Goal number', items: [{ text: 'G-103104' }] }],
        },
      ];
      const categories = [{ label: 'Monitoring', statuses: ['In Progress'] }];
      getRecipientTimeline
        .mockResolvedValueOnce({ count: 26, events: first, categories, nextCursor: 'after-25' })
        .mockResolvedValueOnce({ count: 26, events: second });
      renderTimeline(historyAt({ timelineView: { ...view, mode } }));
      expect(await screen.findByText('Goal G-109560 reopened')).toBeVisible();
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
      expect(await screen.findByText('Goal G-103104 closed')).toBeVisible();
      expect(screen.getAllByText(/^Goal G-\d+ (closed|reopened)$/)).toHaveLength(2);
      expect(screen.getAllByRole('article')).toHaveLength(26);
      expect(screen.getByTestId('timeline-results')).toHaveTextContent('26 timeline events');
      const toggle = screen.getByRole('button', { name: /Monitoring In Progress/ });
      userEvent.click(toggle);
      expect(screen.getByText('Goal G-103104 closed')).not.toBeVisible();
    }
  );

  it.each(['monitoring', 'goals'])(
    'pauses automatic loading when every category is collapsed and resumes on expansion in %s',
    async (mode) => {
      const originalObserver = window.IntersectionObserver;
      const observers = [];
      window.IntersectionObserver = jest.fn().mockImplementation((callback) => {
        const observer = { callback, observe: jest.fn(), disconnect: jest.fn() };
        observers.push(observer);
        return observer;
      });
      try {
        const categories = [
          ...(mode === 'goals' ? [{ label: 'Family Support', statuses: ['Closed'] }] : []),
          { label: 'Monitoring', statuses: ['In Progress'] },
        ];
        const page = (offset) => ({
          count: 75,
          // Categories come with the first page only.
          ...(offset === 0 ? { categories } : {}),
          ...(offset + 25 < 75 ? { nextCursor: `after-${offset + 25}` } : {}),
          events: batch(offset + 1, 25).map((event) => ({
            ...event,
            tags: categories.map(({ label }) => ({ label, flagged: false })),
          })),
        });
        let resolveSecondPage;
        getRecipientTimeline
          .mockResolvedValueOnce(page(0))
          .mockImplementationOnce(
            () =>
              new Promise((resolve) => {
                resolveSecondPage = resolve;
              })
          )
          .mockResolvedValueOnce(page(50));
        renderTimeline(historyAt({ timelineView: { ...view, mode } }));
        await screen.findByRole('button', { name: /Monitoring In Progress/ });
        await waitFor(() => expect(observers.length).toBeGreaterThan(0));
        if (mode === 'goals') {
          userEvent.click(screen.getByRole('button', { name: /Family Support Closed/ }));
        }
        // One open category must still allow automatic pagination.
        const queuedObserver = observers.at(-1);
        act(() => queuedObserver.callback([{ isIntersecting: true }]));
        await waitFor(() => expect(getRecipientTimeline).toHaveBeenCalledTimes(2));
        userEvent.click(screen.getByRole('button', { name: /Monitoring In Progress/ }));
        const observerCount = observers.length;
        await act(async () => resolveSecondPage(page(25)));
        expect(screen.queryByText('Loading timeline events...')).not.toBeInTheDocument();
        expect(observers).toHaveLength(observerCount);
        // Notifications queued before disconnection must not request another slice.
        act(() => queuedObserver.callback([{ isIntersecting: true }]));
        expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
        userEvent.click(screen.getByRole('button', { name: /Monitoring In Progress/ }));
        await waitFor(() => expect(observers.length).toBeGreaterThan(observerCount));
        act(() => observers.at(-1).callback([{ isIntersecting: true }]));
        await waitFor(() => expect(getRecipientTimeline).toHaveBeenCalledTimes(3));
        expect(getRecipientTimeline.mock.calls.map((call) => call[2].cursor)).toEqual([
          undefined,
          'after-25',
          'after-50',
        ]);
        await screen.findByRole('heading', { name: 'Event 75' });
      } finally {
        window.IntersectionObserver = originalObserver;
      }
    }
  );

  it('shows an event added to a category that had none, below the categories already shown', async () => {
    const withTag = (label, items) =>
      items.map((event) => ({ ...event, tags: [{ label, flagged: false }] }));
    getRecipientTimeline
      .mockResolvedValueOnce({
        count: 25,
        categories: [{ label: 'Monitoring', statuses: ['In Progress'] }],
        events: withTag('Monitoring', batch(1, 25)),
        nextCursor: 'after-25',
      })
      // A backdated Governance event was added after the first page loaded.
      .mockResolvedValueOnce({
        count: 26,
        categories: [{ label: 'Governance', statuses: ['Closed'] }],
        events: withTag('Governance', batch(26, 1)),
      });
    renderTimeline(historyAt({ timelineView: { ...view, mode: 'goals' } }));
    await screen.findByRole('list', { name: 'Monitoring timeline events' });
    expect(screen.queryByRole('button', { name: /Governance/ })).not.toBeInTheDocument();

    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }))
    );
    const governance = await screen.findByRole('list', { name: 'Governance timeline events' });
    // Every loaded event is on screen, not just those of the categories known at first.
    expect(within(governance).getAllByRole('article')).toHaveLength(1);
    expect(
      within(screen.getByRole('list', { name: 'Monitoring timeline events' })).getAllByRole(
        'article'
      )
    ).toHaveLength(25);
    const accordionButtons = Array.from(
      screen
        .getByRole('list', { name: 'Timeline events' })
        .querySelectorAll('.usa-accordion__button')
    );
    expect(accordionButtons.map((button) => button.textContent.trim())).toEqual([
      'MonitoringIn Progress',
      'GovernanceClosed',
    ]);
  });

  it('lists every category from the first page, before their events have loaded', async () => {
    const categories = [
      { label: 'Family Support', statuses: [] },
      { label: 'Governance', statuses: [] },
      { label: 'Monitoring', statuses: ['In Progress'] },
    ];
    const withTag = (label, items) =>
      items.map((event) => ({ ...event, tags: [{ label, flagged: false }] }));
    getRecipientTimeline
      .mockResolvedValueOnce({
        count: 30,
        categories,
        events: withTag('Monitoring', batch(1, 25)),
        nextCursor: 'after-25',
      })
      .mockResolvedValueOnce({ count: 30, events: withTag('Governance', batch(26, 5)) });
    renderTimeline(historyAt({ timelineView: { ...view, mode: 'goals' } }));
    await screen.findByRole('list', { name: 'Monitoring timeline events' });
    const accordionButtons = Array.from(
      screen
        .getByRole('list', { name: 'Timeline events' })
        .querySelectorAll('.usa-accordion__button')
    );
    expect(accordionButtons.map((button) => button.textContent.trim())).toEqual([
      'Family Support',
      'Governance',
      'MonitoringIn Progress',
    ]);
    // Categories with nothing loaded yet say so instead of showing an empty accordion.
    expect(screen.getAllByText('Events in this category appear as more events load.')).toHaveLength(
      2
    );

    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }))
    );
    const governance = await screen.findByRole('list', { name: 'Governance timeline events' });
    expect(within(governance).getAllByRole('article')).toHaveLength(5);
    // Nothing is left to load, and no event matched Family Support, so it no longer shows.
    expect(screen.queryByRole('button', { name: /Family Support/ })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Events in this category appear as more events load.')
    ).not.toBeInTheDocument();
    expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
  });

  it('groups multi-category events alphabetically in independently expanded accordions', async () => {
    const events = batch(1, 2).map((event) => ({
      ...event,
      tags: [
        { label: 'Family Support', flagged: false },
        { label: 'Monitoring', flagged: true },
      ],
    }));
    getRecipientTimeline.mockResolvedValue({
      count: 2,
      events,
      categories: [
        { label: 'Family Support', statuses: ['Closed'] },
        { label: 'Monitoring', statuses: ['In Progress'] },
      ],
    });
    renderTimeline(historyAt({ timelineView: { ...view, mode: 'goals' } }));
    const family = await screen.findByRole('list', { name: 'Family Support timeline events' });
    const monitoring = screen.getByRole('list', { name: 'Monitoring timeline events' });
    expect(within(family).getAllByRole('article')).toHaveLength(2);
    expect(within(monitoring).getAllByRole('article')).toHaveLength(2);
    expect(screen.getByTestId('timeline-results')).toHaveTextContent('2 timeline events');
    const headings = within(screen.getByRole('list', { name: 'Timeline events' })).getAllByRole(
      'heading',
      { level: 3 }
    );
    expect(headings[0]).toHaveTextContent('Family Support');
    const toggle = screen.getByRole('button', { name: /Family Support Closed/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await act(async () => userEvent.click(toggle));
    expect(family).not.toBeVisible();
    expect(monitoring).toBeVisible();
  });

  it.each(['is', 'is not'])(
    'applies multiple communication purposes with %s',
    async (condition) => {
      mockRealFilters();
      getRecipientTimeline.mockResolvedValue({ count: 0, events: [] });
      renderTimeline(historyAt());
      await screen.findByText('No results found.');
      await act(async () =>
        userEvent.click(screen.getByRole('button', { name: /open filters for this page/i }))
      );
      await act(async () =>
        userEvent.selectOptions(screen.getByRole('combobox', { name: 'topic' }), 'purpose')
      );
      await act(async () =>
        userEvent.selectOptions(screen.getByRole('combobox', { name: 'condition' }), condition)
      );
      for (const purpose of COMMUNICATION_PURPOSES.slice(0, 2)) {
        await act(async () =>
          userEvent.type(screen.getByLabelText('Select purpose to filter by'), purpose)
        );
        await act(async () => userEvent.click(screen.getByText(purpose)));
      }
      // Draft selections do not fetch until applied.
      expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
      await act(async () =>
        userEvent.click(screen.getByRole('button', { name: 'Apply filters to the TTA timeline' }))
      );
      await waitFor(() =>
        expect(getRecipientTimeline).toHaveBeenLastCalledWith(
          '401',
          '1',
          expect.objectContaining({
            filters: [
              expect.objectContaining({
                topic: 'purpose',
                condition,
                query: COMMUNICATION_PURPOSES.slice(0, 2),
              }),
            ],
          })
        )
      );
      expect(screen.getByText('Communication purpose', { selector: 'strong' })).toBeVisible();
    }
  );

  it('applies a date range from the panel and removes its pill from the request', async () => {
    mockRealFilters();
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [] });
    renderTimeline(historyAt());
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: /open filters for this page/i }))
    );
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'condition' }), 'is')
    );
    await act(async () =>
      userEvent.selectOptions(
        screen.getByRole('combobox', { name: 'date' }),
        screen.getByRole('option', { name: 'Last three months' }).value
      )
    );
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Apply filters to the TTA timeline' }))
    );
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({
          filters: [expect.objectContaining({ topic: 'date', condition: 'is' })],
        })
      )
    );
    await act(async () =>
      userEvent.click(
        screen.getByRole('button', { name: /This button removes the filter: Date is / })
      )
    );
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({ filters: [] })
      )
    );
    expect(screen.queryByText('Date', { selector: 'strong' })).not.toBeInTheDocument();
  });

  it('saves loaded depth and visible event without extra history entries, then restores on refresh', async () => {
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(100, cursor))
    );
    const history = historyAt({ unrelated: 'preserved' });
    const { unmount } = renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    for (const end of [50, 75]) {
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
      await screen.findByRole('heading', { name: `Event ${end}` });
    }
    act(() => {
      scrollTo(3120);
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() => expect(history.location.state.timelinePosition).toEqual(position));
    expect(history.length).toBe(1);
    expect(history.location.state.unrelated).toBe('preserved');
    expect(history.location.search).toBe('');
    const saved = history.location.state;
    unmount();
    expect(window.history.scrollRestoration).toBe('auto');
    scrollTo(0);
    getRecipientTimeline.mockClear();
    renderTimeline(historyAt(saved));
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].cursor)).toEqual([
      undefined,
      'after-25',
      'after-50',
    ]);
    expect(screen.getAllByRole('article')).toHaveLength(75);
    expect(screen.queryByText('Restoring timeline position…')).not.toBeInTheDocument();
  });

  it('returns to the previous page with one Back after scrolling through four batches', async () => {
    mockRealFilters();
    const filters = [{ id: 'type', topic: 'eventType', condition: 'is', query: ['TTA activity'] }];
    const search = `?${filtersToQueryString(filters)}`;
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(125, cursor))
    );
    const history = createMemoryHistory({
      initialEntries: ['/detail', `/timeline${search}`],
      initialIndex: 1,
    });
    const push = jest.spyOn(history, 'push');
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    for (const end of [50, 75, 100]) {
      act(() => {
        scrollTo((end - 25) * 100);
        window.dispatchEvent(new Event('scroll'));
      });
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
      await screen.findByRole('heading', { name: `Event ${end}` });
      await waitFor(() =>
        expect(history.location.state.timelinePosition.loadedPages).toBe(end / 25)
      );
      expect(history.length).toBe(2);
      expect(history.location.search).toBe(search);
    }
    expect(push).not.toHaveBeenCalled();
    act(() => history.goBack());
    expect(screen.getByText('Detail page')).toBeVisible();
    expect(history.location.pathname).toBe('/detail');
  });

  it('does not recreate a filtered URL when Back returns to an unfiltered timeline', async () => {
    window.sessionStorage.clear();
    const realFilters = mockRealFilters();
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor, filters }) =>
      Promise.resolve(pageAt(100, cursor, filters.length ? 25 : 1))
    );
    const history = createMemoryHistory({
      initialEntries: ['/detail', '/timeline'],
      initialIndex: 1,
    });
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 1' });
    const filtered = [{ id: 'type', topic: 'eventType', condition: 'is', query: ['Goal added'] }];
    act(() => realFilters.setFilters(filtered));
    await waitFor(() => expect(history.location.search).toContain('Goal%20added'));
    await screen.findByRole('heading', { name: 'Event 25' });
    act(() => history.goBack());
    await waitFor(() => expect(history.location.pathname).toBe('/timeline'));
    await screen.findByRole('heading', { name: 'Event 1' });
    expect(history.length).toBe(3);
    act(() => history.goBack());
    expect(history.location.pathname).toBe('/detail');
  });

  it('preserves an explicitly empty filter state when navigating Back and Forward', async () => {
    const realFilters = mockRealFilters();
    const filters = [{ id: 'type', topic: 'eventType', condition: 'is', query: ['Goal added'] }];
    const history = createMemoryHistory({
      initialEntries: [`/timeline?${filtersToQueryString(filters)}`],
    });
    getRecipientTimeline.mockResolvedValue({ count: 1, events: batch(1, 1) });
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 1' });
    act(() => realFilters.setFilters([]));
    await waitFor(() => expect(history.location.search).toBe(''));
    const entriesAfterClear = history.length;
    act(() => history.goBack());
    await waitFor(() => expect(history.location.search).toContain('Goal%20added'));
    act(() => history.goForward());
    await waitFor(() => expect(history.location.search).toBe(''));
    expect(history.length).toBe(entriesAfterClear);
  });

  it('preserves a session-restored empty filter state when navigating Back', async () => {
    window.sessionStorage.setItem('timeline-filters-401', JSON.stringify([]));
    const realFilters = mockRealFilters();
    const history = createMemoryHistory({
      initialEntries: ['/detail', '/timeline'],
      initialIndex: 1,
    });
    getRecipientTimeline.mockResolvedValue({ count: 1, events: batch(1, 1) });
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 1' });
    const filter = [{ id: 'type', topic: 'eventType', condition: 'is', query: ['Goal added'] }];
    act(() => realFilters.setFilters(filter));
    await waitFor(() => expect(history.location.search).toContain('Goal%20added'));
    act(() => history.goBack());
    await waitFor(() => expect(history.location.search).toBe(''));
    expect(history.length).toBe(3);
    act(() => history.goBack());
    expect(history.location.pathname).toBe('/detail');
  });

  it('does not replace location state while at the top, even after several slices', async () => {
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(100, cursor))
    );
    const history = historyAt({ unrelated: 'preserved' });
    const { key } = history.location;
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    for (const end of [50, 75]) {
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
      await screen.findByRole('heading', { name: `Event ${end}` });
    }
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(history.location.key).toBe(key);
    expect(history.location.state).toEqual({ unrelated: 'preserved' });
  });

  it('flushes pending scroll saves before a link and restores on browser Back', async () => {
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(100, cursor))
    );
    const history = historyAt();
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
    await screen.findByRole('heading', { name: 'Event 50' });
    act(() => {
      scrollTo(3120);
      window.dispatchEvent(new Event('scroll'));
    });
    userEvent.click(screen.getByRole('link', { name: 'View details' }));
    expect(screen.getByText('Detail page')).toBeVisible();
    expect(history.entries[0].state.timelinePosition.scrollY).toBe(3120);
    scrollTo(0);
    getRecipientTimeline.mockClear();
    act(() => history.goBack());
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].cursor)).toEqual([
      undefined,
      'after-25',
    ]);
    act(() => history.goForward());
    expect(screen.getByText('Detail page')).toBeVisible();
  });

  it('preserves sort and multi-recipient settings when refreshing', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 1, events: batch(1, 1) });
    const history = historyAt();
    const { unmount } = renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 1' });
    userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'asc');
    userEvent.click(screen.getByRole('checkbox', { name: 'Hide multi-recipient communications' }));
    await waitFor(() =>
      expect(history.location.state.timelineView).toEqual({
        ...view,
        direction: 'asc',
        excludeMultiRecipientCommunications: true,
      })
    );
    await screen.findByRole('heading', { name: 'Event 1' });
    const saved = history.location.state;
    unmount();
    getRecipientTimeline.mockClear();
    renderTimeline(historyAt(saved));
    await screen.findByRole('heading', { name: 'Event 1' });
    expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
    expect(getRecipientTimeline).toHaveBeenCalledWith(
      '401',
      '1',
      expect.objectContaining({
        direction: 'asc',
        excludeMultiRecipientCommunications: true,
      })
    );
    expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('asc');
    expect(
      screen.getByRole('checkbox', { name: 'Hide multi-recipient communications' })
    ).toBeChecked();
  });

  it('pauses restoration after an error and resumes at the failed slice on retry', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce(pageAt(100))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(pageAt(100, 'after-25'))
      .mockResolvedValueOnce(pageAt(100, 'after-50'));
    renderTimeline(historyAt({ timelineView: view, timelinePosition: position }));
    await screen.findByRole('alert');
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(screen.getAllByRole('article')).toHaveLength(25);
    userEvent.click(screen.getByRole('button', { name: 'Retry loading events' }));
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].cursor)).toEqual([
      undefined,
      'after-25',
      'after-25',
      'after-50',
    ]);
  });

  it('stops at the new end and falls back to the saved scroll if the anchor was deleted', async () => {
    getRecipientTimeline.mockResolvedValueOnce({ count: 10, events: batch(1, 10) });
    renderTimeline(historyAt({ timelineView: view, timelinePosition: position }));
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('10 events loaded.');
    expect(screen.getByText('10 events loaded.')).toHaveClass('usa-sr-only');
  });

  it('restores when navigating Forward to the timeline', async () => {
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(100, cursor))
    );
    const history = createMemoryHistory({
      initialIndex: 0,
      initialEntries: [
        '/detail',
        { pathname: '/timeline', state: { timelineView: view, timelinePosition: position } },
      ],
    });
    renderTimeline(history);
    act(() => history.goForward());
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].cursor)).toEqual([
      undefined,
      'after-25',
      'after-50',
    ]);
  });

  it('restores the raw loaded depth even when batches contain duplicate events', async () => {
    getRecipientTimeline.mockResolvedValue({
      count: 75,
      events: batch(1, 25),
      nextCursor: 'after-25',
    });
    renderTimeline(
      historyAt({
        timelineView: view,
        timelinePosition: {
          ...position,
          loadedPages: 2,
          eventKey: JSON.stringify(['activityReport', 12]),
          scrollY: 1120,
        },
      })
    );
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 1120, behavior: 'auto' })
    );
    expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('article')).toHaveLength(25);
  });

  it('cancels restoration when sort changes and ignores the old pending slice', async () => {
    let resolveOld;
    getRecipientTimeline
      .mockResolvedValueOnce(pageAt(100))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        })
      )
      .mockResolvedValueOnce({ count: 1, events: batch(101, 1) });
    const history = historyAt({ timelineView: view, timelinePosition: position });
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    expect(screen.getByRole('status')).toHaveTextContent('Restoring timeline position');
    userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'asc');
    await screen.findByRole('heading', { name: 'Event 101' });
    await act(async () => resolveOld({ count: 100, events: batch(26, 25) }));
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(history.location.state.timelinePosition).toBeUndefined();
    expect(history.location.state.timelineView.direction).toBe('asc');
    expect(getRecipientTimeline).toHaveBeenLastCalledWith(
      '401',
      '1',
      expect.objectContaining({ direction: 'asc' })
    );
  });

  it('keeps the saved event visible if its previously expanded details are collapsed', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 25, events: batch(1, 25) });
    renderTimeline(
      historyAt({
        timelineView: view,
        timelinePosition: {
          ...position,
          loadedPages: 1,
          eventKey: JSON.stringify(['activityReport', 12]),
          top: -500,
        },
      })
    );
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 1199, behavior: 'auto' })
    );
  });

  it('restores the earlier filter set and position when Back changes only the query string', async () => {
    const firstFilters = [
      { id: 'first', topic: 'eventType', condition: 'is', query: ['TTA activity'] },
    ];
    const nextFilters = [
      { id: 'next', topic: 'eventType', condition: 'is', query: ['Email communication'] },
    ];
    const realFilters = mockRealFilters();
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(100, cursor))
    );
    const history = createMemoryHistory({
      initialEntries: [`/timeline?${filtersToQueryString(firstFilters)}`],
    });
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
    await screen.findByRole('heading', { name: 'Event 50' });
    act(() => {
      scrollTo(3120);
      window.dispatchEvent(new Event('pagehide'));
    });
    act(() => realFilters.setFilters(nextFilters));
    await waitFor(() => expect(history.location.search).toContain('Email'));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(25));
    scrollTo(0);
    getRecipientTimeline.mockClear();
    act(() => history.goBack());
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(history.location.search).toBe(`?${filtersToQueryString(firstFilters)}`);
    expect(getRecipientTimeline.mock.calls.at(-1)[2].filters).toEqual([
      expect.objectContaining({
        topic: 'eventType',
        condition: 'is',
        query: ['TTA activity'],
      }),
    ]);
  });

  it.each([
    {
      name: 'a select filter with two values',
      filter: {
        id: 'panel',
        topic: 'eventType',
        condition: 'is',
        query: ['Email communication', 'TTA activity'],
      },
    },
    {
      name: 'a date filter with "is"',
      filter: { id: 'panel', topic: 'date', condition: 'is', query: '07/07/2026' },
    },
  ])('restores on Back after $name was applied from the panel', async ({ filter }) => {
    // Back remounts with filters read from the URL. A date "is" value comes back as an array,
    // and the select case guards the multi-value merge in queryStringToFilters.
    const realFilters = mockRealFilters();
    getRecipientTimeline.mockImplementation((_recipient, _region, { cursor }) =>
      Promise.resolve(pageAt(100, cursor))
    );
    const urlFilters = [{ id: 'url', topic: 'eventType', condition: 'is', query: ['Goal added'] }];
    const history = createMemoryHistory({
      initialEntries: [`/timeline?${filtersToQueryString(urlFilters)}`],
    });
    renderTimeline(history);
    await screen.findByRole('heading', { name: 'Event 25' });
    getRecipientTimeline.mockClear();
    act(() => realFilters.setFilters([filter]));
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenCalledWith(
        '401',
        '1',
        expect.objectContaining({ filters: [filter] })
      )
    );
    await screen.findByRole('heading', { name: 'Event 25' });
    userEvent.click(screen.getByRole('button', { name: 'Load more events' }));
    await screen.findByRole('heading', { name: 'Event 50' });
    act(() => scrollTo(3120));
    userEvent.click(screen.getByRole('link', { name: 'View details' }));
    expect(screen.getByText('Detail page')).toBeVisible();
    scrollTo(0);
    getRecipientTimeline.mockClear();
    act(() => history.goBack());
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(history.location.search).toBe(`?${filtersToQueryString([filter])}`);
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].cursor)).toEqual([
      undefined,
      'after-25',
    ]);
  });

  it.each([
    { loadedPages: -1 },
    { loadedPages: Infinity },
    { scrollY: NaN },
    { queryKey: JSON.stringify(['402', '1', 'desc', false, '']) },
    { queryKey: JSON.stringify(['401', '1', 'desc', false, 'eventType.in[]=Goal%20added']) },
  ])('ignores invalid or mismatched saved positions: %j', async (changes) => {
    getRecipientTimeline.mockResolvedValueOnce({ count: 100, events: batch(1, 25) });
    renderTimeline(
      historyAt({ timelineView: view, timelinePosition: { ...position, ...changes } })
    );
    await screen.findByRole('heading', { name: 'Event 25' });
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
  });
});
