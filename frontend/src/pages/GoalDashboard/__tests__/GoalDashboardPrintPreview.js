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
