import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MonitoringReportDashboard from '../components/MonitoringReportDashboard';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';

jest.mock('../../../widgets/MonitoringReportDashboardOverview');
jest.mock('../../../widgets/ActiveDeficientCitationsWithTtaSupport');
jest.mock('../../../widgets/MonitoringRelatedTta', () => () => <div data-testid="related-tta-widget" />);
jest.mock('../../../widgets/FindingCategoryHotspot', () => () => <div data-testid="finding-category-hotspot-widget" />);

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

  const renderDashboard = (filtersToApply = []) => render(
    <UserContext.Provider value={{ user: { id: 1, flags: [] } }}>
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
          <MonitoringReportDashboard filtersToApply={filtersToApply} />
        </AppLoadingContext.Provider>
      </MemoryRouter>
    </UserContext.Provider>,
  );

  it('renders overview and citations widgets', () => {
    renderDashboard();

    expect(screen.getByTestId('overview-widget')).toBeInTheDocument();
    expect(screen.getByTestId('citations-widget')).toBeInTheDocument();
  });

  it('passes merged filters including default startDate filter to both widgets', () => {
    const incomingFilters = [{
      id: 'f1',
      topic: 'region',
      condition: 'is',
      query: '1',
    }];

    renderDashboard(incomingFilters);

    expect(MonitoringReportDashboardOverview).toHaveBeenCalledTimes(1);
    expect(ActiveDeficientCitationsWithTtaSupport).toHaveBeenCalledTimes(1);

    const overviewFilters = MonitoringReportDashboardOverview.mock.calls[0][0].filters;
    const citationsFilters = ActiveDeficientCitationsWithTtaSupport.mock.calls[0][0].filters;

    expect(overviewFilters).toHaveLength(3);
    expect(citationsFilters).toHaveLength(3);
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
