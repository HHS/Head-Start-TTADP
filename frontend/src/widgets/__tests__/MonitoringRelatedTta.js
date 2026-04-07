import React from 'react';
import {
  render, screen, waitFor, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import MonitoringRelatedTta from '../MonitoringRelatedTta';

describe('MonitoringRelatedTta', () => {
  const url = '/api/widgets/monitoringTta?&sortBy=recipient_finding&sortDirection=asc&offset=20';
  beforeEach(() => {
    fetchMock.get(url, []);
  });
  afterEach(() => {
    fetchMock.restore();
  });

  const renderMonitoringRelatedTta = () => render(<MonitoringRelatedTta filters={[]} />);

  it('renders the correct title and subtitle', async () => {
    await act(async () => {
      renderMonitoringRelatedTta();
    });

    expect(fetchMock.called(url)).toBe(true);
    expect(screen.getByText('Monitoring related TTA')).toBeInTheDocument();
    expect(screen.getByText('The date filter applies to the review received date.')).toBeInTheDocument();
  });

  it('renders the sort dropdown with the correct options', async () => {
    await act(async () => {
      renderMonitoringRelatedTta();
    });

    expect(fetchMock.called(url)).toBe(true);
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveValue('recipient_finding-asc');
    expect(screen.getByRole('option', { name: 'Recipient (A to Z), then Finding type' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (Z to A), then Finding type' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (A to Z), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (Z to A), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Citation number (low to high), then Recipient' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Citation number (high to low), then Recipient' })).toBeInTheDocument();
  });

  it('updates sort configuration when a new option is selected', async () => {
    await act(async () => {
      renderMonitoringRelatedTta();
    });
    const resortUrl = '/api/widgets/monitoringTta?&sortBy=citation&sortDirection=desc&offset=0';
    expect(fetchMock.called(url)).toBe(true);
    fetchMock.get(resortUrl, []);
    const dropdown = screen.getByRole('combobox');
    userEvent.selectOptions(dropdown, 'citation-desc');
    await waitFor(() => {
      expect(screen.getByTestId('monitoring-related-tta-sort-container')).toHaveAttribute('data-sortby', 'citation');
      expect(screen.getByTestId('monitoring-related-tta-sort-container')).toHaveAttribute('data-direction', 'desc');
    });

    expect(fetchMock.called(resortUrl)).toBe(true);
  });
});
