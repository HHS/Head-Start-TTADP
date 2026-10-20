import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fetchGoalDashboardGoalsByIds } from '../../../fetchers/goals';
import GoalDashboardPrintPreview from '../GoalDashboardPrintPreview';

jest.mock('../../../fetchers/goals');

const renderPrintPreview = (state) =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/dashboards/goal-dashboard/print',
          state,
        },
      ]}
    >
      <GoalDashboardPrintPreview />
    </MemoryRouter>
  );

describe('GoalDashboardPrintPreview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows an informational alert when no preview goal ids are supplied', async () => {
    renderPrintPreview();

    expect(await screen.findByText('No goals selected')).toBeInTheDocument();
    expect(fetchGoalDashboardGoalsByIds).not.toHaveBeenCalled();
  });

  it('shows an error alert when the fetch fails', async () => {
    fetchGoalDashboardGoalsByIds.mockRejectedValue(new Error('Network error'));

    renderPrintPreview({ previewGoalIds: [1] });

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Unable to fetch goal dashboard goals')).toBeInTheDocument();
  });

  it('shows a no goals found alert when the fetch returns empty results', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({ goalRows: [] });

    renderPrintPreview({ previewGoalIds: [1] });

    expect(await screen.findByText('No goals found')).toBeInTheDocument();
    expect(
      screen.getByText('No matching goals were found. Please go back and try again.')
    ).toBeInTheDocument();
  });

  it('renders N/A for missing dates and None for empty activity reports', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({
      goalRows: [
        {
          id: 100,
          goalNumbers: ['G-100'],
          status: 'Not Started',
          name: 'Test goal with missing dates',
          grant: {
            number: '22RE000001',
            recipient: { name: 'Test Recipient' },
          },
          objectives: [
            {
              id: 10,
              title: 'Test objective without end date',
              activityReports: [],
              status: 'In Progress',
            },
          ],
        },
      ],
    });

    renderPrintPreview({ previewGoalIds: [100] });

    expect(await screen.findByText('None')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('uses the default sort config when goalDashboardState provides no sortConfig', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({ goalRows: [] });

    renderPrintPreview({ previewGoalIds: [1], goalDashboardState: {} });

    await waitFor(() => {
      expect(fetchGoalDashboardGoalsByIds).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=goalStatus'),
        [1]
      );
    });
    expect(fetchGoalDashboardGoalsByIds).toHaveBeenCalledWith(
      expect.stringContaining('direction=asc'),
      [1]
    );
  });

  it('falls back to default sortBy and direction when sortConfig fields are absent', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({ goalRows: [] });

    renderPrintPreview({ previewGoalIds: [1], goalDashboardState: { sortConfig: {} } });

    await waitFor(() => {
      expect(fetchGoalDashboardGoalsByIds).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=goalStatus'),
        [1]
      );
    });
    expect(fetchGoalDashboardGoalsByIds).toHaveBeenCalledWith(
      expect.stringContaining('direction=asc'),
      [1]
    );
  });

  it('shows no goals found when the response has no goalRows property', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue(null);

    renderPrintPreview({ previewGoalIds: [1] });

    expect(await screen.findByText('No goals found')).toBeInTheDocument();
  });

  it('renders fallback display values when goal fields are absent or invalid', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({
      goalRows: [
        {
          id: 42,
          // no goalNumbers → falls back to G-42
          goalStatus: 'Not Started', // no status → uses goalStatus
          createdAt: '2026-01-01',
          goalText: 'Fallback goal text', // no name → uses goalText
          // no grant → recipientName = 'Recipient', grantNumbers = 'N/A'
          objectives: [
            {
              id: 10,
              title: 'Test objective',
              activityReports: [],
              endDate: 'not-a-valid-date', // invalid date → formatDate returns raw value
              // no topics → renders null
              status: undefined, // falsy → '' → no STATUSES match → 'Needs Status' fallback
            },
          ],
        },
        {
          id: 43,
          status: 'In Progress',
          // no name, no goalText → 'N/A' for goal text
          grant: { recipient: { name: 'Recipient 43' } },
          objectives: [],
        },
      ],
    });

    renderPrintPreview({ previewGoalIds: [42, 43] });

    expect(await screen.findByText('Recipient - Goal G-42')).toBeInTheDocument();
    expect(screen.getByText('Fallback goal text')).toBeInTheDocument();
    expect(screen.getByText('not-a-valid-date')).toBeInTheDocument();
    expect(screen.getByText('Recipient 43 - Goal G-43')).toBeInTheDocument();
  });

  it('renders joined grantNumbers when the array is provided', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({
      goalRows: [
        {
          id: 99,
          status: 'In Progress',
          name: 'Test goal',
          grantNumbers: ['12345', '67890'],
          grant: { recipient: { name: 'Test Recipient' } },
          objectives: [],
        },
      ],
    });

    renderPrintPreview({ previewGoalIds: [99] });

    expect(await screen.findByText('12345, 67890')).toBeInTheDocument();
  });

  it('renders N/A for objective title when title is absent', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({
      goalRows: [
        {
          id: 1,
          status: 'In Progress',
          name: 'Test goal',
          grant: { recipient: { name: 'Test Recipient' } },
          objectives: [{ id: 10, activityReports: [], status: 'In Progress' }],
        },
      ],
    });

    renderPrintPreview({ previewGoalIds: [1] });

    await screen.findByText('Test goal');
    // objective with no title renders the 'N/A' fallback inside the Objective label-value pair
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });

  it('does not update state when the component unmounts before a successful fetch', async () => {
    let resolveGoals;
    fetchGoalDashboardGoalsByIds.mockReturnValue(
      new Promise((res) => {
        resolveGoals = res;
      })
    );

    const { unmount } = renderPrintPreview({ previewGoalIds: [1] });
    unmount();
    resolveGoals({ goalRows: [] });

    // Flush the microtask queue so the async continuation runs with isMounted = false.
    await Promise.resolve();
  });

  it('does not update state when the component unmounts before a failed fetch', async () => {
    let rejectGoals;
    fetchGoalDashboardGoalsByIds.mockReturnValue(
      new Promise((_, rej) => {
        rejectGoals = rej;
      })
    );

    const { unmount } = renderPrintPreview({ previewGoalIds: [1] });
    unmount();
    rejectGoals(new Error('Network error'));

    await Promise.resolve();
  });

  it('fetches and renders selected goals for print preview', async () => {
    fetchGoalDashboardGoalsByIds.mockResolvedValue({
      goalRows: [
        {
          id: 56789,
          goalNumbers: ['G-56789'],
          status: 'Not Started',
          createdAt: '2026-02-01',
          name: 'The recipient will implement family engagement strategies.',
          grant: {
            number: '22RE220001 - HS',
            recipient: {
              name: 'Children and Families First',
            },
          },
          objectives: [
            {
              id: 1,
              title: 'Support the family service staff in developing an implementation plan.',
              activityReports: [
                {
                  id: 10,
                  displayId: 'R14-AR-12345',
                },
              ],
              endDate: '2025-10-01',
              topics: ['Family Support Services'],
              status: 'In Progress',
            },
          ],
        },
      ],
    });

    renderPrintPreview({
      previewGoalIds: [56789],
      goalDashboardState: {
        perPage: 10,
        selectedGoalIds: [56789],
        sortConfig: {
          sortBy: 'goalStatus',
          direction: 'asc',
        },
      },
    });

    expect(await screen.findByText('TTA goals and objectives')).toBeInTheDocument();
    expect(
      await screen.findByText('Children and Families First - Goal G-56789')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Support the family service staff in developing an implementation plan.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print to pdf/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchGoalDashboardGoalsByIds).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=goalStatus'),
        [56789]
      );
    });
    expect(fetchGoalDashboardGoalsByIds).toHaveBeenCalledWith(
      expect.stringContaining('direction=asc'),
      [56789]
    );
  });
});
