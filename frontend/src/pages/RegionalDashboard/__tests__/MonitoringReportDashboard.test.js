import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';
import ActiveDeficientCitationsWithTtaSupport from '../../../widgets/ActiveDeficientCitationsWithTtaSupport';
import CompliantFollowUpReviewsWithTtaSupport from '../../../widgets/CompliantFollowUpReviewsWithTtaSupport';
import MonitoringReportDashboardOverview from '../../../widgets/MonitoringReportDashboardOverview';
import MonitoringReportDashboard from '../components/MonitoringReportDashboard';

jest.mock('../../../widgets/MonitoringReportDashboardOverview');
jest.mock('../../../widgets/ActiveDeficientCitationsWithTtaSupport');
jest.mock('../../../widgets/CompliantFollowUpReviewsWithTtaSupport');
jest.mock('../../../widgets/ActiveNoncompliantCitationsWithTtaSupport', () => () => (
  <div data-testid="noncompliant-citations-widget" />
));
jest.mock('../../../widgets/MonitoringRelatedTta', () => () => (
  <div data-testid="related-tta-widget" />
));
jest.mock('../../../widgets/FindingCategoryHotspot', () => () => (
  <div data-testid="finding-category-hotspot-widget" />
));

describe('MonitoringReportDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MonitoringReportDashboardOverview.mockImplementation(({ filters }) => (
      <div data-testid="overview-widget">{JSON.stringify(filters)}</div>
    ));
    ActiveDeficientCitationsWithTtaSupport.mockImplementation(({ filters }) => (
      <div data-testid="citations-widget">{JSON.stringify(filters)}</div>
    ));
    CompliantFollowUpReviewsWithTtaSupport.mockImplementation(({ filters }) => (
      <div data-testid="compliant-follow-up-widget">{JSON.stringify(filters)}</div>
    ));
  });

  const renderDashboard = (filtersToApply = [], user = { id: 1, flags: [] }) =>
    render(
      <UserContext.Provider value={{ user }}>
        <MemoryRouter>
          <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
            <MonitoringReportDashboard filtersToApply={filtersToApply} />
          </AppLoadingContext.Provider>
        </MemoryRouter>
      </UserContext.Provider>
    );

  it('renders overview and citations widgets', () => {
    renderDashboard();

    expect(screen.getByTestId('overview-widget')).toBeInTheDocument();
    expect(screen.getByTestId('citations-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('compliant-follow-up-widget')).not.toBeInTheDocument();
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

    renderDashboard(incomingFilters);

    expect(MonitoringReportDashboardOverview).toHaveBeenCalledTimes(1);
    expect(ActiveDeficientCitationsWithTtaSupport).toHaveBeenCalledTimes(1);

    const overviewFilters = MonitoringReportDashboardOverview.mock.calls[0][0].filters;
    const citationsFilters = ActiveDeficientCitationsWithTtaSupport.mock.calls[0][0].filters;

    expect(overviewFilters).toHaveLength(1);
    expect(citationsFilters).toHaveLength(1);
    expect(overviewFilters[0]).toEqual(incomingFilters[0]);
    expect(citationsFilters[0]).toEqual(incomingFilters[0]);
  });

  it('renders the compliant follow-up widget only when the feature flag is enabled', () => {
    const incomingFilters = [
      {
        id: 'f1',
        topic: 'region',
        condition: 'is',
        query: '1',
      },
    ];

    renderDashboard(incomingFilters, {
      id: 1,
      flags: ['compliant_follow_up_reviews_tta_support'],
    });

    expect(screen.getByTestId('compliant-follow-up-widget')).toBeInTheDocument();
    expect(CompliantFollowUpReviewsWithTtaSupport).toHaveBeenCalledWith(
      expect.objectContaining({ filters: incomingFilters }),
      expect.anything()
    );
  });
});
