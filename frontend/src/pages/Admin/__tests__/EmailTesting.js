import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import join from 'url-join';
import EmailTesting from '../EmailTesting';

const digestUrl = (freq) => join('/', 'api', 'admin', 'email-testing', 'digests', freq);
const monitoringUrl = join('/', 'api', 'admin', 'email-testing', 'monitoring-deliveries');

describe('EmailTesting', () => {
  const oldWindowConfirm = window.confirm;

  beforeEach(() => {
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => fetchMock.restore());

  afterAll(() => {
    window.confirm = oldWindowConfirm;
  });

  it('runs the chosen digest and shows how many were queued', async () => {
    fetchMock.post(digestUrl('weekly'), { frequency: 'WEEKLY', queued: 4 });
    render(<EmailTesting />);

    // the live region exists before the run so the result is announced
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', { name: 'Run weekly digests' }));

    expect(await screen.findByText('Queued 4 weekly digest emails.')).toBeInTheDocument();
    expect(statusRegion).toHaveTextContent('Queued 4 weekly digest emails.');
    expect(fetchMock.called(digestUrl('weekly'))).toBe(true);
  });

  it('runs the monitoring deliveries and shows what was sent', async () => {
    fetchMock.post(monitoringUrl, { detected: 2, recorded: 0, inApp: 3, emails: 1 });
    render(<EmailTesting />);

    await userEvent.click(screen.getByRole('button', { name: 'Run monitoring deliveries' }));

    expect(
      await screen.findByText(
        'Found 2 monitoring deliveries. Created 3 in-app notifications and queued 1 email.'
      )
    ).toBeInTheDocument();
  });

  it('does nothing if the confirm is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    fetchMock.post(digestUrl('daily'), { frequency: 'DAILY', queued: 1 });
    fetchMock.post(monitoringUrl, {});
    render(<EmailTesting />);

    await userEvent.click(screen.getByRole('button', { name: 'Run daily digests' }));
    await userEvent.click(screen.getByRole('button', { name: 'Run monitoring deliveries' }));

    expect(fetchMock.called()).toBe(false);
  });

  it('shows an error when a run fails', async () => {
    fetchMock.post(digestUrl('monthly'), 500);
    fetchMock.post(monitoringUrl, 500);
    render(<EmailTesting />);

    await userEvent.click(screen.getByRole('button', { name: 'Run monthly digests' }));
    expect(await screen.findByText('Error running monthly digests.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Run monitoring deliveries' }));
    expect(await screen.findByText('Error running monitoring deliveries.')).toBeInTheDocument();
  });

  it('explains when the run is blocked in production', async () => {
    fetchMock.post(monitoringUrl, 403);
    render(<EmailTesting />);

    await userEvent.click(screen.getByRole('button', { name: 'Run monitoring deliveries' }));

    expect(
      await screen.findByText('Email testing is not available in production.')
    ).toBeInTheDocument();
  });
});
