import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Link, Route, Router } from 'react-router-dom';
import {
  serializeTimelineFilter,
  TIMELINE_FILTER_CONFIG,
} from '../../../../components/filter/timelineFilters';
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
const view = {
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
      <Router history={history}>
        <Route path="/timeline">
          <Timeline recipientId="401" regionId="1" />
          <Link to="/detail">View details</Link>
        </Route>
        <Route path="/detail">
          <p>Detail page</p>
        </Route>
      </Router>
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

  afterEach(() => jest.restoreAllMocks());

  it('saves loaded depth and visible event without extra history entries, then restores on refresh', async () => {
    getRecipientTimeline.mockImplementation((_recipient, _region, { offset }) =>
      Promise.resolve({ count: 100, events: batch(offset + 1, 25) })
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
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].offset)).toEqual([0, 25, 50]);
    expect(screen.getAllByRole('article')).toHaveLength(75);
    expect(screen.queryByText('Restoring timeline position…')).not.toBeInTheDocument();
  });

  it('does not replace location state while at the top, even after several slices', async () => {
    getRecipientTimeline.mockImplementation((_recipient, _region, { offset }) =>
      Promise.resolve({ count: 100, events: batch(offset + 1, 25) })
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
    getRecipientTimeline.mockImplementation((_recipient, _region, { offset }) =>
      Promise.resolve({ count: 100, events: batch(offset + 1, 25) })
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
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].offset)).toEqual([0, 25]);
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
        offset: 0,
      })
    );
    expect(screen.getByRole('combobox', { name: 'View' })).toHaveValue('asc');
    expect(
      screen.getByRole('checkbox', { name: 'Hide multi-recipient communications' })
    ).toBeChecked();
  });

  it('pauses restoration after an error and resumes at the failed slice on retry', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 100, events: batch(1, 25) })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ count: 100, events: batch(26, 25) })
      .mockResolvedValueOnce({ count: 100, events: batch(51, 25) });
    renderTimeline(historyAt({ timelineView: view, timelinePosition: position }));
    await screen.findByRole('alert');
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(screen.getAllByRole('article')).toHaveLength(25);
    userEvent.click(screen.getByRole('button', { name: 'Retry loading events' }));
    await waitFor(() =>
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 3120, behavior: 'auto' })
    );
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].offset)).toEqual([0, 25, 25, 50]);
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
    getRecipientTimeline.mockImplementation((_recipient, _region, { offset }) =>
      Promise.resolve({ count: 100, events: batch(offset + 1, 25) })
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
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].offset)).toEqual([0, 25, 50]);
  });

  it('restores the raw loaded depth even when batches contain duplicate events', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 75, events: batch(1, 25) });
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
      .mockResolvedValueOnce({ count: 100, events: batch(1, 25) })
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
      expect.objectContaining({ direction: 'asc', offset: 0 })
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
    getRecipientTimeline.mockImplementation((_recipient, _region, { offset }) =>
      Promise.resolve({ count: 100, events: batch(offset + 1, 25) })
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
      expect.stringContaining('TTA activity'),
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
    getRecipientTimeline.mockImplementation((_recipient, _region, { offset }) =>
      Promise.resolve({ count: 100, events: batch(offset + 1, 25) })
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
        expect.objectContaining({ filters: [serializeTimelineFilter(filter)], offset: 0 })
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
    expect(getRecipientTimeline.mock.calls.map((call) => call[2].offset)).toEqual([0, 25]);
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
