import { render, screen } from '@testing-library/react';
import React from 'react';
import MonitoringReportDashboardOverview from '../MonitoringReportDashboardOverview';

describe('MonitoringReportDashboardOverview', () => {
  it('renders monitoring overview fields via DashboardOverviewWidget', () => {
    render(<MonitoringReportDashboardOverview filters={[]} showTooltips loading={false} />);

    expect(
      screen.getAllByText('Compliant follow-up reviews with TTA support').length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Active deficient citations with TTA support').length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Active noncompliant citations with TTA support').length
    ).toBeGreaterThan(0);
  });
});
