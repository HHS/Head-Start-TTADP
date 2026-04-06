import { render, screen } from '@testing-library/react';
import React from 'react';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';
import MonitoringReportDashboard from '../components/MonitoringReportDashboard';

jest.mock('../../../widgets/MonitoringReportDashboardOverview');
jest.mock('../../../widgets/ActiveDeficientCitationsWithTtaSupport');

describe('MonitoringReportDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MonitoringReportDashboardOverview.mockImplementation(({ filters }) => (
      <div data-testid="overview-widget">{JSON.stringify(filters)}</div>
    ));
    ActiveDeficientCitationsWithTtaSupport.mockImplementation(({ filters }) => (
      <div data-testid="citations-widget">{JSON.stringify(filters)}</div>
    ));
  });

  it('renders overview and citations widgets', () => {
    render(<MonitoringReportDashboard filtersToApply={[]} />);

    expect(screen.getByTestId('overview-widget')).toBeInTheDocument();
    expect(screen.getByTestId('citations-widget')).toBeInTheDocument();
  });

  it('passes merged filters including default startDate filter to both widgets', () => {
    const incomingFilters = [
      {
        id: 'f1',
        topic: 'region',
        condition: 'is',
        query: '1',
      },
    ];

    render(<MonitoringReportDashboard filtersToApply={incomingFilters} />);

    expect(MonitoringReportDashboardOverview).toHaveBeenCalledTimes(1);
    expect(ActiveDeficientCitationsWithTtaSupport).toHaveBeenCalledTimes(1);

    const overviewFilters = MonitoringReportDashboardOverview.mock.calls[0][0].filters;
    const citationsFilters = ActiveDeficientCitationsWithTtaSupport.mock.calls[0][0].filters;

    expect(overviewFilters).toHaveLength(2);
    expect(citationsFilters).toHaveLength(2);
    expect(overviewFilters[0]).toEqual(incomingFilters[0]);
    expect(citationsFilters[0]).toEqual(incomingFilters[0]);

    const defaultOverviewFilter = overviewFilters[1];
    const defaultCitationsFilter = citationsFilters[1];

    expect(defaultOverviewFilter.topic).toBe('startDate');
    expect(defaultOverviewFilter.condition).toBe('is within');
    expect(defaultOverviewFilter.query).toEqual(expect.any(String));
    expect(defaultOverviewFilter.query).toContain('-');

    expect(defaultCitationsFilter.topic).toBe('startDate');
    expect(defaultCitationsFilter.condition).toBe('is within');
    expect(defaultCitationsFilter.query).toEqual(expect.any(String));
    expect(defaultCitationsFilter.query).toContain('-');
  });
});
