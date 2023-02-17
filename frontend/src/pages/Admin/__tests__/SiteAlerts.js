import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import join from 'url-join';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import SiteAlerts from '../SiteAlerts';

describe('SiteAlerts', () => {
  const renderSiteAlerts = () => {
    render(<SiteAlerts />);
  };

  const alertsUrl = join('api', 'admin', 'alerts');

  afterEach(() => fetchMock.restore());

  it('renders the SiteAlerts component', () => {
    fetchMock.get(alertsUrl, []);
    act(renderSiteAlerts);

    expect(screen.getByRole('heading', { name: 'Site alerts' })).toBeInTheDocument();
  });

  it('handles an error fetching alerts', async () => {
    fetchMock.get(alertsUrl, 500);
    act(renderSiteAlerts);

    expect(await screen.findByText('There was an error fetching alerts')).toBeInTheDocument();
  });

  it('can create a new alert', async () => {
    fetchMock.get(alertsUrl, []);

    act(renderSiteAlerts);

    act(() => {
      userEvent.click(screen.getByRole('button', { name: 'Create new alert' }));
    });

    await waitFor(async () => {
      expect(await screen.findByRole('checkbox')).toBeInTheDocument();
    });
  });

  it('renders the alerts', async () => {
    const alerts = [
      {
        id: 1,
        status: 'Published',
        title: 'Alert 1',
        message: 'Alert 1 message',
        startDate: '2020-01-01',
        endDate: '2020-01-02',
      },
    ];

    fetchMock.get(alertsUrl, alerts);

    act(renderSiteAlerts);

    expect(await screen.findByText('Alert 1')).toBeInTheDocument();
  });

  it('allows deleting alerts', async () => {
    const alerts = [
      {
        id: 1,
        status: 'Published',
        title: 'Alert 1',
        message: 'Alert 1 message',
        startDate: '2020-01-01',
        endDate: '2020-01-02',
      },
    ];

    fetchMock.get(alertsUrl, alerts);
    fetchMock.delete(join(alertsUrl, '1'), 204);

    act(renderSiteAlerts);

    expect(await screen.findByText('Alert 1')).toBeInTheDocument();

    act(() => {
      userEvent.click(screen.getByRole('checkbox', { name: 'Edit?' }));
    });

    act(() => {
      screen.getByRole('button', { name: 'Delete' }).click();
    });

    expect(await screen.findByText('Alert 1')).not.toBeInTheDocument();
  });

  it('handles an error deleting an alert', async () => {
    const alerts = [
      {
        id: 1,
        status: 'Published',
        title: 'Alert 1',
        message: 'Alert 1 message',
        startDate: '2020-01-01',
        endDate: '2020-01-02',
      },
    ];

    fetchMock.get(alertsUrl, alerts);
    fetchMock.delete(join(alertsUrl, '1'), 500);

    act(renderSiteAlerts);

    expect(await screen.findByText('Alert 1')).toBeInTheDocument();

    act(() => {
      userEvent.click(screen.getByRole('checkbox', { name: 'Edit?' }));
    });

    act(() => {
      screen.getByRole('button', { name: 'Delete' }).click();
    });

    expect(await screen.findByText('There was an error deleting an alert')).toBeInTheDocument();
  });
});
