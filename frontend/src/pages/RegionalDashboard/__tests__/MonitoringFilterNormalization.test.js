import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import UserContext from '../../../UserContext';
import RegionalDashboard from '../index';

const mockSetFilters = jest.fn();
const mockFilterPanel = jest.fn(() => <div data-testid="filter-panel" />);
const mockDashboard = jest.fn(() => <div data-testid="dashboard" />);

jest.mock('../../../hooks/useDashboardFilterKey', () =>
  jest.fn(() => 'regional-dashboard-monitoring')
);

jest.mock('../../../hooks/useFilters', () =>
  jest.fn(() => ({
    regions: [1],
    defaultRegion: 1,
    allRegionsFilters: [{ id: 'r1', topic: 'region', condition: 'is', query: ['1'] }],
    userHasOnlyOneRegion: true,
    filters: [
      {
        id: 'start-1',
        topic: 'startDate',
        condition: 'is within',
        query: '2026/07/01-2026/07/08',
      },
      {
        id: 'delivery-1',
        topic: 'reportDeliveryDate',
        condition: 'is within',
        query: '2026/07/01-2026/07/08',
      },
    ],
    setFilters: mockSetFilters,
    onApplyFilters: jest.fn(),
    onRemoveFilter: jest.fn(),
    filterConfig: [],
  }))
);

jest.mock('../../../permissions', () => ({
  hasApproveActivityReport: jest.fn(() => false),
}));

jest.mock('../../../components/filter/FilterPanel', () => (props) => {
  mockFilterPanel(props);
  return <div data-testid="filter-panel" />;
});

jest.mock('../../../components/filter/FilterPanelContainer', () => ({ children }) => (
  <div>{children}</div>
));

jest.mock('../components/Dashboard', () => (props) => {
  mockDashboard(props);
  return <div data-testid="dashboard" />;
});

jest.mock('../../../components/RegionPermissionModal', () => () => (
  <div data-testid="region-modal" />
));
jest.mock('../../../components/TabsNav', () => () => <div data-testid="tabs" />);

describe('RegionalDashboard monitoring filter normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes reportDeliveryDate and normalizes startDate to US format before rendering filters', () => {
    render(
      <UserContext.Provider value={{ user: { permissions: [] } }}>
        <RegionalDashboard
          match={{
            params: { reportType: 'monitoring' },
            path: '/dashboards/regional-dashboard/:reportType',
            url: '/dashboards/regional-dashboard/monitoring',
          }}
        />
      </UserContext.Provider>
    );

    const expectedNormalized = [
      {
        id: 'start-1',
        topic: 'startDate',
        condition: 'is within',
        query: '07/01/2026-07/08/2026',
      },
    ];

    expect(mockSetFilters).toHaveBeenCalledWith(expectedNormalized);
    expect(mockFilterPanel).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expectedNormalized })
    );
    expect(mockDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expectedNormalized })
    );
  });
});
