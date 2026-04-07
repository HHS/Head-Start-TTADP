import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonitoringRelatedTta from '../MonitoringRelatedTta';

describe('MonitoringRelatedTta', () => {
  const renderMonitoringRelatedTta = () => render(
    <MonitoringRelatedTta />,
  );

  it('renders the correct title and subtitle', () => {
    renderMonitoringRelatedTta();
    expect(screen.getByText('Monitoring related TTA')).toBeInTheDocument();
    expect(screen.getByText('The date filter applies to the review received date.')).toBeInTheDocument();
  });

  it('renders the sort dropdown with the correct options', async () => {
    renderMonitoringRelatedTta();
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveValue('recipient_finding-desc');
    expect(screen.getByRole('option', { name: 'Recipient (A to Z), then Finding type' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (Z to A), then Finding type' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (A to Z), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recipient (Z to A), then Citation number' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Citation number (low to high), then Recipient' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Citation number (high to low), then Recipient' })).toBeInTheDocument();
  });

  it('updates sort configuration when a new option is selected', async () => {
    renderMonitoringRelatedTta();
    const dropdown = screen.getByRole('combobox');
    userEvent.selectOptions(dropdown, 'citation-desc');
    await waitFor(() => {
      expect(screen.getByTestId('monitoring-related-tta-sort-container')).toHaveAttribute('data-sortby', 'citation');
      expect(screen.getByTestId('monitoring-related-tta-sort-container')).toHaveAttribute('data-direction', 'desc');
    });
  });
});
