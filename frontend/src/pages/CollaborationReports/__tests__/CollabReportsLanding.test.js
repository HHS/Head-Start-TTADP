import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { Helmet } from 'react-helmet';
import { CollabReportsLanding } from '../index';
import UserContext from '../../../UserContext';

// Import mocked modules
import useSessionFiltersAndReflectInUrl from '../../../hooks/useSessionFiltersAndReflectInUrl';
import { allRegionsUserHasActivityReportPermissionTo } from '../../../permissions';
import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../../regionHelpers';
import CollabReports from '../components/CollabReports';
import FilterPanel from '../../../components/filter/FilterPanel';
import RegionPermissionModal from '../../../components/RegionPermissionModal';

// Mock dependencies
jest.mock('../../../hooks/useSessionFiltersAndReflectInUrl');
jest.mock('../../../permissions');
jest.mock('../../regionHelpers');
jest.mock('../components/CollabReports');
jest.mock('../../../components/filter/FilterPanel');
jest.mock('../../../components/RegionPermissionModal');

describe('CollabReportsLanding', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    homeRegionId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    useSessionFiltersAndReflectInUrl.mockReturnValue([[], jest.fn()]);
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2]);
    buildDefaultRegionFilters.mockReturnValue([]);
    showFilterWithMyRegions.mockReturnValue(jest.fn());

    // Mock components
    CollabReports.mockImplementation(() => <div data-testid="collab-reports">Collab Reports</div>);
    FilterPanel.mockImplementation(() => <div data-testid="filter-panel">Filter Panel</div>);
    RegionPermissionModal.mockImplementation(() => <div data-testid="region-permission-modal">Region Permission Modal</div>);
  });

  const renderComponent = (user = mockUser) => render(
    <MemoryRouter>
      <UserContext.Provider value={{ user }}>
        <CollabReportsLanding />
      </UserContext.Provider>
    </MemoryRouter>,
  );

  it('renders the main heading', () => {
    renderComponent();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Collaboration reports/)).toBeInTheDocument();
  });

  it('renders the New Collaboration Report button', () => {
    renderComponent();
    const newReportButton = screen.getByRole('link', { name: /New Collaboration Report/i });
    expect(newReportButton).toBeInTheDocument();
    expect(newReportButton).toHaveAttribute('href', '/collaboration-reports/new/activity-summary');
  });

  it('renders the filter panel', () => {
    renderComponent();
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
  });

  it('renders the region permission modal', () => {
    renderComponent();
    expect(screen.getByTestId('region-permission-modal')).toBeInTheDocument();
  });

  it('renders collab reports components', () => {
    renderComponent();
    const collabReports = screen.getAllByTestId('collab-reports');
    expect(collabReports).toHaveLength(2);
  });

  it('sets the document title', () => {
    renderComponent();
    const helmet = Helmet.peek();
    expect(helmet.title).toBe('Collaboration Reports');
  });

  it('renders with single region label', () => {
    const singleRegionUser = { ...mockUser, homeRegionId: 5 };
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([5]);

    renderComponent(singleRegionUser);
    expect(screen.getByText(/your region$/)).toBeInTheDocument();
  });

  it('renders with multiple regions label', () => {
    const multiRegionUser = { ...mockUser, homeRegionId: 1 };
    allRegionsUserHasActivityReportPermissionTo.mockReturnValue([1, 2, 3]);

    renderComponent(multiRegionUser);
    expect(screen.getByText(/your regions$/)).toBeInTheDocument();
  });
});
