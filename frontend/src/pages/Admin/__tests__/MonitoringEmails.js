import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import join from 'url-join';
import MonitoringEmails from '../MonitoringEmails';

const url = join('/', 'api', 'admin', 'monitoring-notifications', 'test');

const result = (overrides = {}) => ({
  kind: 'digest',
  userId: 1,
  email: 'qa@test.gov',
  sent: true,
  detail: 'daily digest listing 2 recipient(s)',
  ...overrides,
});

describe('MonitoringEmails', () => {
  const oldWindowConfirm = window.confirm;

  beforeEach(() => {
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => fetchMock.restore());

  afterAll(() => {
    window.confirm = oldWindowConfirm;
  });

  it('emails the current admin by default and lists what was sent', async () => {
    fetchMock.post(url, {
      results: [result({ kind: 'immediate', detail: 'recipient Alpha' }), result()],
    });
    render(<MonitoringEmails />);

    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(await screen.findByText('Sent 2 emails.')).toBeInTheDocument();
    expect(statusRegion).toHaveTextContent('Sent 2 emails.');
    expect(window.confirm).toHaveBeenCalledWith('Send monitoring report emails to you now?');
    expect(JSON.parse(fetchMock.lastCall(url)[1].body)).toEqual({
      type: 'both',
      frequency: 'DAILY',
    });
    expect(
      screen.getByText('Sent: immediate email to qa@test.gov (user 1), recipient Alpha')
    ).toBeInTheDocument();
  });

  it('sends the chosen users, email, frequency and review', async () => {
    fetchMock.post(url, { results: [result()] });
    render(<MonitoringEmails />);

    await userEvent.type(screen.getByLabelText('User IDs'), '4, 5');
    await userEvent.click(screen.getByLabelText('Digest only'));
    await userEvent.selectOptions(screen.getByLabelText('Digest frequency'), 'WEEKLY');
    await userEvent.type(screen.getByLabelText('Delivered review ID'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(await screen.findByText('Sent 1 email.')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.lastCall(url)[1].body)).toEqual({
      userIds: [4, 5],
      type: 'digest',
      frequency: 'WEEKLY',
      deliveredReviewId: 12,
    });
  });

  it('disables the frequency for immediate emails only', async () => {
    render(<MonitoringEmails />);

    await userEvent.click(screen.getByLabelText('Immediate only'));

    expect(screen.getByLabelText('Digest frequency')).toBeDisabled();
  });

  it('does not send when the IDs are not numbers', async () => {
    fetchMock.post(url, { results: [] });
    render(<MonitoringEmails />);

    await userEvent.type(screen.getByLabelText('User IDs'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(
      await screen.findByText('User IDs and the review ID must be numbers.')
    ).toBeInTheDocument();
    expect(fetchMock.called(url)).toBe(false);
  });

  it('does nothing if the confirm is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    fetchMock.post(url, { results: [] });
    render(<MonitoringEmails />);

    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(fetchMock.called(url)).toBe(false);
  });

  it('says how many emails were not sent', async () => {
    fetchMock.post(url, { results: [result(), result({ sent: false, detail: 'other' })] });
    render(<MonitoringEmails />);

    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(await screen.findByText('1 of 2 emails were not sent.')).toBeInTheDocument();
  });

  it('shows the reason the server gives for refusing', async () => {
    fetchMock.post(url, {
      status: 403,
      body: { error: 'Refusing to send test monitoring notifications in production.' },
    });
    render(<MonitoringEmails />);

    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(
      await screen.findByText('Refusing to send test monitoring notifications in production.')
    ).toBeInTheDocument();
  });

  it('shows a generic error when the request fails', async () => {
    fetchMock.post(url, 500);
    render(<MonitoringEmails />);

    await userEvent.click(screen.getByRole('button', { name: 'Send emails' }));

    expect(await screen.findByText('Error sending monitoring report emails.')).toBeInTheDocument();
  });
});
