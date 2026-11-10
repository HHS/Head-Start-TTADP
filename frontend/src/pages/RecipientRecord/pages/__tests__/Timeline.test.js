import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  createInitialTimelineFilters,
  TIMELINE_FILTER_CONFIG,
} from '../../../../components/filter/timelineFilters';
import { getRecipientTimeline } from '../../../../fetchers/recipient';
import useFilters from '../../../../hooks/useFilters';
import UserContext from '../../../../UserContext';
import { RECIPIENT_TTA_REQUEST_FEATURE_FLAG, TTA_TIMELINE_FEATURE_FLAG } from '../constants';
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

const renderTimeline = (currentUser = user, mode = 'chronological') =>
  render(
    <UserContext.Provider value={{ user: currentUser }}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/',
            state: { timelineView: { recipientId: '401', regionId: '1', mode } },
          },
        ]}
      >
        <Timeline recipientId="401" regionId="1" />
      </MemoryRouter>
    </UserContext.Provider>
  );

describe('Recipient Record - TTA Timeline', () => {
  beforeEach(() => {
    const initialFilters = createInitialTimelineFilters();
    useFilters.mockImplementation((_user, _key, _regions, _initial, filterConfig) => ({
      filters: initialFilters,
      onApplyFilters,
      onRemoveFilter,
      filterConfig,
    }));
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
    expect(screen.getByRole('button', { name: 'Get help using filters' })).toHaveClass(
      'usa-button--unstyled',
      'margin-right-3'
    );
    const sortControl = screen.getByRole('combobox', { name: 'View' });
    const checkbox = screen.getByRole('checkbox', {
      name: 'Hide multi-recipient communications',
    });
    const multiRecipientIcon = checkbox.parentElement.querySelector('svg');

    expect(sortControl).toHaveValue('desc');
    expect(sortControl).toHaveClass('width-mobile', 'maxw-full');
    expect(checkbox).toBeVisible();
    expect(checkbox.closest('.usa-checkbox')).toHaveClass('ttahub-timeline-checkbox');
    expect(multiRecipientIcon).toHaveClass('height-2', 'width-2');
    expect(multiRecipientIcon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Date', { selector: 'strong' })).toBeVisible();
    expect(useFilters).toHaveBeenCalledWith(
      user,
      'timeline-filters-401',
      false,
      [
        expect.objectContaining({
          topic: 'date',
          condition: 'is within',
        }),
      ],
      TIMELINE_FILTER_CONFIG,
      undefined,
      true
    );
    expect(TIMELINE_FILTER_CONFIG.map(({ id }) => id)).toEqual([
      'purpose',
      'date',
      'standard',
      'eventType',
    ]);
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

  it('sends the selected date order and resets pagination', async () => {
    renderTimeline();
    await screen.findByText('No results found.');
    await act(async () =>
      userEvent.selectOptions(screen.getByRole('combobox', { name: 'View' }), 'asc')
    );
    await waitFor(() =>
      expect(getRecipientTimeline).toHaveBeenLastCalledWith(
        '401',
        '1',
        expect.objectContaining({ direction: 'asc' })
      )
    );
    expect(getRecipientTimeline.mock.calls.at(-1)[2].cursor).toBeUndefined();
  });

  it('does not render or submit filters removed from the timeline configuration', async () => {
    useFilters.mockReturnValue({
      filters: [
        ...createInitialTimelineFilters(),
        {
          id: 'unsupported-method-filter',
          topic: 'method',
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
        filters: [expect.objectContaining({ topic: 'date', condition: 'is within' })],
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

  it.each(
    ['chronological', 'monitoring', 'goals'].flatMap((mode) =>
      [
        { name: 'a timeline-only reader', flags: [TTA_TIMELINE_FEATURE_FLAG], allowed: false },
        {
          name: 'a reader with both flags',
          flags: [TTA_TIMELINE_FEATURE_FLAG, RECIPIENT_TTA_REQUEST_FEATURE_FLAG],
          allowed: true,
        },
        {
          name: 'an approval-only reader with both flags',
          flags: [TTA_TIMELINE_FEATURE_FLAG, RECIPIENT_TTA_REQUEST_FEATURE_FLAG],
          scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
          allowed: false,
        },
        {
          name: 'a report writer with both flags',
          flags: [TTA_TIMELINE_FEATURE_FLAG, RECIPIENT_TTA_REQUEST_FEATURE_FLAG],
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          allowed: false,
        },
        {
          name: 'a reader with permission in another region',
          flags: [TTA_TIMELINE_FEATURE_FLAG, RECIPIENT_TTA_REQUEST_FEATURE_FLAG],
          permissionRegionId: 2,
          allowed: false,
        },
        {
          name: 'a request reviewer with both flags',
          flags: [TTA_TIMELINE_FEATURE_FLAG, RECIPIENT_TTA_REQUEST_FEATURE_FLAG],
          scopeId: SCOPE_IDS.REVIEW_TTA_REQUESTS,
          allowed: true,
        },
        { name: 'a reader without flags', flags: undefined, allowed: false },
        { name: 'an admin without flags', flags: undefined, admin: true, allowed: true },
      ].map((access) => ({ mode, ...access }))
    )
  )(
    'gates request events and the filter option for $name in $mode view',
    async ({
      mode,
      flags,
      admin,
      allowed,
      scopeId = SCOPE_IDS.READ_REPORTS,
      permissionRegionId = 1,
    }) => {
      const requestEvent = {
        ...batch(1, 1)[0],
        source: 'ttaRequest',
        eventType: 'TTA request',
        title: 'TTA request',
        tags: [{ label: 'Monitoring', flagged: true }],
        details: [{ label: 'Originator', items: [{ text: 'Regional Office' }] }],
        links: [
          {
            label: 'View TTA request',
            to: '/recipient-tta-records/401/region/1/tta-request/view/1',
          },
        ],
      };
      const activityEvent = {
        ...batch(2, 1)[0],
        tags: [{ label: 'Monitoring', flagged: true }],
        links: [{ label: 'View activity report', to: '/activity-reports/view/2' }],
      };
      const response = {
        count: allowed ? 2 : 1,
        events: allowed ? [requestEvent, activityEvent] : [activityEvent],
        categories: [{ label: 'Monitoring', statuses: [] }],
      };
      getRecipientTimeline.mockResolvedValue(response);
      renderTimeline(
        {
          ...user,
          flags,
          permissions: [
            {
              regionId: admin ? 14 : permissionRegionId,
              scopeId: admin ? SCOPE_IDS.ADMIN : scopeId,
            },
          ],
        },
        mode
      );

      expect(await screen.findByTestId('timeline-results')).toHaveTextContent(
        allowed ? '2 timeline events' : '1 timeline event'
      );
      if (allowed) {
        expect(screen.getByRole('heading', { name: 'TTA request' })).toBeVisible();
        await act(async () =>
          userEvent.click(screen.getByRole('button', { name: /View details for TTA request/ }))
        );
        expect(screen.getByText('Regional Office')).toBeVisible();
        expect(screen.getByRole('link', { name: 'View TTA request' })).toHaveAttribute(
          'href',
          '/recipient-tta-records/401/region/1/tta-request/view/1'
        );
      } else {
        expect(screen.queryByRole('heading', { name: 'TTA request' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'View TTA request' })).not.toBeInTheDocument();
      }
      await act(async () =>
        userEvent.click(screen.getByRole('button', { name: /View details for Event 2/ }))
      );
      expect(screen.getByRole('link', { name: 'View activity report' })).toHaveAttribute(
        'href',
        '/activity-reports/view/2'
      );
      await act(async () =>
        userEvent.click(screen.getByRole('button', { name: /open filters for this page/i }))
      );
      await act(async () =>
        userEvent.selectOptions(screen.getByRole('combobox', { name: 'topic' }), 'eventType')
      );
      await act(async () =>
        userEvent.selectOptions(screen.getByRole('combobox', { name: 'condition' }), 'is')
      );
      await act(async () =>
        userEvent.click(screen.getByLabelText('Select TTA event types to filter by'))
      );
      expect(screen.getByText('Monitoring report received')).toBeVisible();
      const requestOption = document.querySelector('.ttahub-filter-select__option');
      expect(requestOption).toBeInTheDocument();
      const options = [...document.querySelectorAll('.ttahub-filter-select__option')].map(
        (option) => option.textContent
      );
      expect(options.includes('TTA request')).toBe(allowed);
    }
  );

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
      .mockResolvedValueOnce({ count: 27, events: batch(1, 25), nextCursor: 'after-25' })
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
      expect.objectContaining({ limit: 25, cursor: 'after-25' })
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
        .mockResolvedValueOnce({ count: 75, events: batch(1, 25), nextCursor: 'after-25' })
        .mockResolvedValueOnce({ count: 75, events: batch(start, 25), nextCursor: 'after-50' });
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
      .mockResolvedValueOnce({ count: 26, events: batch(1, 25), nextCursor: 'after-25' })
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
    expect(getRecipientTimeline.mock.calls.slice(1).map((call) => call[2].cursor)).toEqual([
      'after-25',
      'after-25',
    ]);
  });

  it('shows a later slice failure next to the retry button, not above the list', async () => {
    getRecipientTimeline
      .mockResolvedValueOnce({ count: 26, events: batch(1, 25), nextCursor: 'after-25' })
      .mockRejectedValueOnce(new Error('failed'));
    renderTimeline();
    await screen.findByRole('heading', { name: 'Event 25' });
    await act(async () =>
      userEvent.click(screen.getByRole('button', { name: 'Load more events' }))
    );
    const alert = await screen.findByRole('alert');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    const retry = screen.getByRole('button', { name: 'Retry loading events' });
    expect(alert.parentElement).toBe(retry.parentElement);
    expect(
      screen.getByRole('list', { name: 'Timeline events' }).compareDocumentPosition(alert) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('saves filters under a key for the recipient being viewed', async () => {
    getRecipientTimeline.mockResolvedValue({ count: 0, events: [] });
    render(
      <UserContext.Provider value={{ user }}>
        <MemoryRouter>
          <Timeline recipientId="644" regionId="6" />
        </MemoryRouter>
      </UserContext.Provider>
    );
    await screen.findByText('No results found.');
    expect(useFilters).toHaveBeenCalledWith(
      user,
      'timeline-filters-644',
      false,
      expect.any(Array),
      TIMELINE_FILTER_CONFIG,
      undefined,
      true
    );
    expect(useFilters).not.toHaveBeenCalledWith(
      user,
      'timeline-filters-401',
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
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
      expect.objectContaining({ limit: 25 })
    );
    expect(getRecipientTimeline.mock.calls.at(-1)[2].cursor).toBeUndefined();
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
      .mockResolvedValueOnce({ count: 27, events: batch(1, 25), nextCursor: 'after-25' })
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
        expect.objectContaining({ limit: 25 })
      );
      expect(getRecipientTimeline.mock.calls[0][2].cursor).toBeUndefined();
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
        expect.objectContaining({ limit: 25, cursor: 'after-25' })
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
