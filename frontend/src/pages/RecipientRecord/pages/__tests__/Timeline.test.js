import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  createInitialTimelineFilters,
  TIMELINE_FILTER_CONFIG,
} from '../../../../components/filter/timelineFilters';
import { getRecipientTimeline } from '../../../../fetchers/recipient';
import useFilters from '../../../../hooks/useFilters';
import UserContext from '../../../../UserContext';
import Timeline from '../Timeline';

jest.mock('../../../../hooks/useFilters');
jest.mock('../../../../fetchers/recipient', () => ({
  getRecipientTimeline: jest.fn(),
}));

const user = { homeRegionId: 1 };
const onApplyFilters = jest.fn();
const onRemoveFilter = jest.fn();

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

const renderTimeline = () =>
  render(
    <UserContext.Provider value={{ user }}>
      <MemoryRouter>
        <Timeline recipientId="401" regionId="1" />
      </MemoryRouter>
    </UserContext.Provider>
  );

describe('Recipient Record - TTA Timeline', () => {
  beforeEach(() => {
    useFilters.mockReturnValue({
      filters: createInitialTimelineFilters(),
      onApplyFilters,
      onRemoveFilter,
      filterConfig: TIMELINE_FILTER_CONFIG,
    });
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page shell and design controls', async () => {
    renderTimeline();

    expect(screen.getByRole('heading', { name: 'TTA timeline' })).toBeVisible();
    expect(screen.getByRole('button', { name: /open filters for this page/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'About this data' })).toBeVisible();
    const sortControl = screen.getByRole('combobox', { name: 'View' });
    const checkbox = screen.getByRole('checkbox', {
      name: 'Hide multi-recipient communications',
    });
    const multiRecipientIcon = checkbox.parentElement.querySelector('svg');

    expect(sortControl).toHaveValue('desc');
    expect(sortControl).toHaveClass('width-mobile');
    expect(checkbox).toBeVisible();
    expect(checkbox.closest('.usa-checkbox')).toHaveClass('ttahub-timeline-checkbox');
    expect(multiRecipientIcon).toHaveClass('height-2', 'width-2');
    expect(multiRecipientIcon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Date', { selector: 'strong' })).toBeVisible();
    expect(useFilters).toHaveBeenCalledWith(
      user,
      'timeline-filters',
      false,
      [
        expect.objectContaining({
          topic: 'date',
          condition: 'is within',
        }),
      ],
      TIMELINE_FILTER_CONFIG
    );
    expect(TIMELINE_FILTER_CONFIG.map(({ id }) => id)).not.toContain('purpose');
    await screen.findByText('No results found.');
  });

  it('sends the multi-recipient communication checkbox state with the timeline request', async () => {
    renderTimeline();
    const checkbox = screen.getByRole('checkbox', {
      name: 'Hide multi-recipient communications',
    });

    await act(async () => userEvent.click(checkbox));

    expect(checkbox).toBeChecked();

    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({ excludeMultiRecipientCommunications: true })
      )
    );
  });

  it('does not render or submit filters removed from the timeline configuration', async () => {
    useFilters.mockReturnValue({
      filters: [
        ...createInitialTimelineFilters(),
        {
          id: 'stale-purpose-filter',
          topic: 'purpose',
          condition: 'is',
          query: ['General Check-In'],
        },
      ],
      onApplyFilters,
      onRemoveFilter,
      filterConfig: TIMELINE_FILTER_CONFIG,
    });

    renderTimeline();

    expect(screen.queryByText('General Check-In')).not.toBeInTheDocument();

    await screen.findByText('No results found.');

    expect(getRecipientTimeline).toHaveBeenLastCalledWith(
      '401',
      '1',
      expect.objectContaining({
        filters: [expect.stringContaining('"topic":"date"')],
      })
    );
    expect(getRecipientTimeline.mock.calls.at(-1)[2].filters).toHaveLength(1);
  });

  it('renders a loading state', () => {
    getRecipientTimeline.mockReturnValue(new Promise(() => {}));
    renderTimeline();
    expect(screen.getByLabelText('Loading TTA timeline')).toBeVisible();
    expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
  });

  it('renders an empty state', async () => {
    renderTimeline();
    expect(await screen.findByText('No results found.')).toBeVisible();
    expect(screen.getByText('Try removing or changing the selected filters.')).toBeVisible();
  });

  it('renders a result count when timeline events exist', async () => {
    getRecipientTimeline.mockResolvedValueOnce({ count: 2, events: batch(1, 2) });
    renderTimeline();
    expect(await screen.findByTestId('timeline-results')).toHaveTextContent('2 timeline events');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('list', { name: 'Timeline events' })).toBeVisible();
  });

  it('renders loaded events when the response count is malformed', async () => {
    getRecipientTimeline.mockResolvedValueOnce({ count: 'many', events: batch(1, 2) });
    renderTimeline();
    expect(await screen.findByTestId('timeline-results')).toHaveTextContent('2 timeline events');
    expect(screen.getByRole('status')).toHaveTextContent('2 events loaded.');
    expect(screen.getByText('2 events loaded.')).toHaveClass('usa-sr-only');
    expect(screen.queryByText('End of timeline.')).not.toBeInTheDocument();
    expect(getRecipientTimeline).toHaveBeenCalledTimes(1);
  });

  it('falls back to a "Load more events" button without IntersectionObserver', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 27, events: batch(1, 25) })
      .mockResolvedValueOnce({ count: 27, events: batch(26, 2) });
    renderTimeline();
    await screen.findByRole('heading', { name: 'Event 25' });
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }))
    );
    expect(await screen.findByRole('heading', { name: 'Event 27' })).toBeVisible();
    expect(getRecipientTimeline).toHaveBeenLastCalledWith(
      '401',
      '1',
      expect.objectContaining({ limit: 25, offset: 25 })
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(27);
    expect(screen.getByTestId('timeline-results')).toHaveTextContent('27 timeline events');
    expect(screen.getByRole('status')).toHaveTextContent('27 events loaded.');
    expect(screen.getByText('27 events loaded.')).toHaveClass('usa-sr-only');
    expect(screen.queryByText('End of timeline.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more events' })).not.toBeInTheDocument();
  });

  it.each([
    [26, 50],
    [25, 49],
  ])(
    'announces %i-based non-final batches with %i distinct events loaded',
    async (start, loaded) => {
      getRecipientTimeline
        .mockResolvedValueOnce({ count: 75, events: batch(1, 25) })
        .mockResolvedValueOnce({ count: 75, events: batch(start, 25) });
      renderTimeline();
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('25 of 75 events loaded.')
      );
      await act(async () =>
        userEvent.click(screen.getByRole('button', { name: 'Load more events' }))
      );
      expect(screen.getByRole('status')).toHaveTextContent(`${loaded} of 75 events loaded.`);
      expect(screen.getByRole('status')).not.toHaveTextContent('End of timeline.');
      expect(screen.getAllByRole('article')).toHaveLength(loaded);
    }
  );

  it('keeps loaded events visible and retries when a later slice fails', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 26, events: batch(1, 25) })
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({ count: 26, events: batch(26, 1) });
    renderTimeline();
    await screen.findByRole('heading', { name: 'Event 25' });
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }))
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the TTA timeline.');
    expect(screen.getAllByRole('listitem')).toHaveLength(25);
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Retry loading events' }))
    );
    expect(await screen.findByRole('heading', { name: 'Event 26' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getRecipientTimeline.mock.calls.slice(1).map((call) => call[2].offset)).toEqual([
      25, 25,
    ]);
  });

  it('renders an error state and retries the first page', async () => {
    getRecipientTimeline.mockRejectedValueOnce(new Error('failed'));
    renderTimeline();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the TTA timeline.');
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Retry loading events' }))
    );
    await screen.findByText('No results found.');
    expect(getRecipientTimeline).toHaveBeenLastCalledWith(
      '401',
      '1',
      expect.objectContaining({ offset: 0, limit: 25 })
    );
  });

  it('loads the next slice on scroll, keeps existing events visible, and ends without visible wording', async () => {
    let intersect;
    const disconnect = jest.fn();
    const originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = jest.fn((callback) => {
      intersect = callback;
      return { observe: jest.fn(), disconnect };
    });
    let resolveNext;
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 27, events: batch(1, 25) })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNext = resolve;
        })
      );
    try {
      renderTimeline();
      await screen.findByRole('heading', { name: 'Event 25' });
      expect(getRecipientTimeline).toHaveBeenCalledWith(
        '401',
        '1',
        expect.objectContaining({ limit: 25, offset: 0 })
      );
      act(() => {
        intersect([{ isIntersecting: true }]);
        intersect([{ isIntersecting: true }]);
      });
      expect(screen.getByRole('heading', { name: 'Event 1' })).toBeVisible();
      expect(screen.getByRole('status')).toHaveTextContent('Loading more events');
      expect(getRecipientTimeline).toHaveBeenCalledTimes(2);
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({ limit: 25, offset: 25 })
      );
      await act(async () => resolveNext({ count: 27, events: batch(25, 2) }));
      expect(screen.getAllByRole('listitem')).toHaveLength(26);
      expect(screen.getByRole('status')).toHaveTextContent('26 events loaded.');
      expect(screen.getByText('26 events loaded.')).toHaveClass('usa-sr-only');
      expect(screen.queryByText('End of timeline.')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Load more events' })).not.toBeInTheDocument();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      window.IntersectionObserver = originalObserver;
    }
  });
});
