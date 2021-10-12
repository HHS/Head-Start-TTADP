import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import RegionalDashboard from '../index';
import formatDateRange from '../formatDateRange';

describe('Regional Dashboard page', () => {
  beforeAll(() => {
    fetchMock.mock('*', 200);
  });

  const renderDashboard = (user) => render(<RegionalDashboard user={user} />);

  const user = {
    homeRegionId: 14,
    permissions: [{
      regionId: 14,
    }],
  };

  it('shows a heading', async () => {
    renderDashboard(user);
    const heading = await screen.findByText(/regional tta activity dashboard/i);
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

    const button = await screen.findByRole('button', { name: /open date range options menu/i });
    fireEvent.click(button);

    const custom = await screen.findByRole('button', { name: /select to view data from custom date range\. select apply filters button to apply selection/i });
    fireEvent.click(custom);

    expect(await screen.findByRole('textbox', { name: /start date/i })).toBeInTheDocument();
  });

  it('formats a date range correctly with 0 as an option', async () => {
    const blank = formatDateRange();
    expect(blank).toBe('');
  });

  it('renders a loading div when no user is provided', async () => {
    renderDashboard(null);
    expect(await screen.findByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  it('shows the reason list widget', async () => {
    renderDashboard(user);

    await waitFor(() => {
      expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    });
  });

  it('filters by role correctly', async () => {
    renderDashboard(user);

    const thirtyDays = formatDateRange(
      { lastThirtyDays: true, withSpaces: false, forDateTime: true },
    );

    const params = `?&region.in[]=14&startDate.win=${thirtyDays}&role.in[]=Family%20Engagement%20Specialist,Grantee%20Specialist,Health%20Specialist,System%20Specialist`;
    const widgetUrl = join('/', 'api', 'widgets', 'topicFrequencyGraph', params);
    fetchMock.get(widgetUrl, []);

    const specFilter = screen.getByRole('button', { name: /change filter by specialists/i });
    fireEvent.click(specFilter);
    const ecs = screen.getByRole('checkbox', { name: /select early childhood specialist \(ecs\)/i });
    fireEvent.click(ecs);
    const apply = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(apply);

    expect(fetchMock.called()).toBeTruthy();
    fetchMock.reset();
    await waitFor(() => expect(screen.queryByText(/Loading data/i)).toBeNull());
  });
});
