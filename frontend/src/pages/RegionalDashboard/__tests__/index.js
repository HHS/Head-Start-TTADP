import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import join from 'url-join';
import fetchMock from 'fetch-mock';
import RegionalDashboard from '../index';
import formatDateRange from '../formatDateRange';
import { SCOPE_IDS } from '../../../Constants';

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

  it('shows the selected region', async () => {
    renderDashboard({
      ...user,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 14,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    });

    expect(screen.getByText('Regional TTA Activity Dashboard')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Open regional select menu' });
    fireEvent.click(button);

    const region1 = screen.getByRole('button', { name: 'Select to view data from Region 1. Select Apply filters button to apply selection' });
    fireEvent.click(region1);

    const apply = screen.getByRole('button', { name: 'Apply filters for the regional select menu' });
    fireEvent.click(apply);

    expect(screen.getByText('Region 1 TTA Activity Dashboard')).toBeInTheDocument();
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

    const params = `?region.in[]=14&startDate.win=${thirtyDays}&modelType.is=activityReport&role.in[]=Family%20Engagement%20Specialist,Grantee%20Specialist,Health%20Specialist,System%20Specialist`;
    const widgetUrl = join('/', 'api', 'widgets', 'topicFrequencyGraph', params);
    fetchMock.get(widgetUrl, []);

    const specFilter = screen.getByRole('button', { name: /change filter by specialists/i });
    fireEvent.click(specFilter);
    const ecs = screen.getByRole('checkbox', { name: /select early childhood specialist \(ecs\)/i });
    fireEvent.click(ecs);
    const apply = screen.getByRole('button', { name: /apply filters/i });

    act(() => {
      fireEvent.click(apply);
    });

    expect(fetchMock.called()).toBeTruthy();
    fetchMock.reset();
    await waitFor(() => expect(screen.queryByText(/Loading data/i)).toBeNull());
  });
});
