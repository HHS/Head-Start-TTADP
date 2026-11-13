import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import React from 'react';
import join from 'url-join';
import Digests from '../Digests';

const digestUrl = (freq) => join('/', 'api', 'admin', 'digests', freq);

describe('Digests', () => {
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
    render(<Digests />);

    // the live region exists before the run so the result is announced
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole('button', { name: 'Run weekly digests' }));

    expect(await screen.findByText('Queued 4 weekly digest emails.')).toBeInTheDocument();
    expect(statusRegion).toHaveTextContent('Queued 4 weekly digest emails.');
    expect(fetchMock.called(digestUrl('weekly'))).toBe(true);
  });

  it('does nothing if the confirm is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    fetchMock.post(digestUrl('daily'), { frequency: 'DAILY', queued: 1 });
    render(<Digests />);

    await userEvent.click(screen.getByRole('button', { name: 'Run daily digests' }));

    expect(fetchMock.called(digestUrl('daily'))).toBe(false);
  });

  it('shows an error when the run fails', async () => {
    fetchMock.post(digestUrl('monthly'), 500);
    render(<Digests />);

    await userEvent.click(screen.getByRole('button', { name: 'Run monthly digests' }));

    expect(await screen.findByText('Error running monthly digests.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Error running monthly digests.');
  });

  it('explains when the run is blocked in production', async () => {
    fetchMock.post(digestUrl('daily'), 403);
    render(<Digests />);

    await userEvent.click(screen.getByRole('button', { name: 'Run daily digests' }));

    expect(
      await screen.findByText('Manually running digests is not available in production.')
    ).toBeInTheDocument();
  });
});
