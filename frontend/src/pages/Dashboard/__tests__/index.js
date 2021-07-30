import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import Dashboard from '../index';
import formatDateRange from '../formatDateRange';

describe('Dashboard page', () => {
  const renderDashboard = (user) => render(<Dashboard user={user} />);

  const user = {
    permissions: [{
      regionId: 14,
    }],
  };

  it('shows a heading', async () => {
    renderDashboard(user);
    const heading = await screen.findByText(/regional tta activity analytics/i);
    expect(heading).toBeInTheDocument();
  });

  it('shows a date range selector', async () => {
    renderDashboard(user);
    const dateRange = await screen.findByRole('button', { name: /open date range options menu/i });
    expect(dateRange).toBeInTheDocument();
  });

  it('shows the currently selected date range', async () => {
    renderDashboard(user);

    const thirtyDays = formatDateRange({ lastThirtyDays: true, withSpaces: true });
    const selectedRange = await screen.findAllByText(thirtyDays);
    expect(selectedRange.length).toBeGreaterThan(0);
  });

  it('shows the currently applied date range', async () => {
    renderDashboard(user);

    const button = screen.getByRole('button', { name: /open date range options menu/i });
    fireEvent.click(button);

    const custom = screen.getByRole('button', { name: /select to view data from custom date range\. select apply filters button to apply selection/i });
    fireEvent.click(custom);

    expect(screen.getByRole('textbox', { name: /start date/i })).toBeInTheDocument();
  });

  it('formats a date range correctly with 0 as an option', async () => {
    const blank = formatDateRange();
    expect(blank).toBe('');
  });

  it('renders a loading div when no user is provided', async () => {
    renderDashboard(null);
    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  it('shows the reason list widget', async () => {
    renderDashboard(user);
    expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
  });
});
