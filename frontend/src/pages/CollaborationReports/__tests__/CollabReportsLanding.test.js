import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CollabReportsLanding } from '../index'
import UserContext from '../../../UserContext'

jest.mock('../../../hooks/useFilters')
/* eslint-disable react/prop-types */
jest.mock(
  '../components/CollabReports',
  () =>
    function MockCollabReports({ title, emptyMsg }) {
      return (
        <div data-testid="collab-reports">
          <h2>{title}</h2>
          {emptyMsg && <p>{emptyMsg}</p>}
        </div>
      )
    }
)
jest.mock(
  '../../../components/filter/FilterPanelContainer',
  () =>
    function MockFilterPanelContainer({ children }) {
      return <div data-testid="filter-panel-container">{children}</div>
    }
)
jest.mock(
  '../../../components/filter/FilterPanel',
  () =>
    function MockFilterPanel({ applyButtonAria }) {
      return <div data-testid="filter-panel" aria-label={applyButtonAria} />
    }
)
jest.mock(
  '../../../components/RegionPermissionModal',
  () =>
    function MockRegionPermissionModal() {
      return <div data-testid="region-permission-modal" />
    }
)
/* eslint-enable react/prop-types */

const useFilters = require('../../../hooks/useFilters')

describe('CollabReportsLanding', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    homeRegionId: 1,
  }

  const mockUseFiltersReturn = {
    hasMultipleRegions: false,
    defaultRegion: 1,
    regions: [{ id: 1, name: 'Region 1' }],
    allRegionsFilters: [],
    filters: [],
    setFilters: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    useFilters.default.mockReturnValue(mockUseFiltersReturn)
  })

  const renderComponent = (userOverrides = {}) => {
    const user = { ...mockUser, ...userOverrides }
    return render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <CollabReportsLanding />
        </UserContext.Provider>
      </MemoryRouter>
    )
  }

  test('renders heading with plural regions when user has multiple regions', () => {
    useFilters.default.mockReturnValue({
      ...mockUseFiltersReturn,
      hasMultipleRegions: true,
    })

    renderComponent()

    expect(screen.getByText('Collaboration reports - your regions')).toBeInTheDocument()
  })

  test('renders heading with plural regions when defaultRegion is 14', () => {
    useFilters.default.mockReturnValue({
      ...mockUseFiltersReturn,
      defaultRegion: 14,
    })

    renderComponent()

    expect(screen.getByText('Collaboration reports - your regions')).toBeInTheDocument()
  })

  test('renders New Collaboration Report link with correct href', () => {
    renderComponent()

    const newReportLink = screen.getByRole('link', { name: /new collaboration report/i })
    expect(newReportLink).toBeInTheDocument()
    expect(newReportLink).toHaveAttribute('href', '/collaboration-reports/new/activity-summary')
    expect(newReportLink).toHaveClass('usa-button', 'smart-hub--new-report-btn')
  })

  test('renders RegionPermissionModal with correct props', () => {
    renderComponent()

    expect(screen.getByTestId('region-permission-modal')).toBeInTheDocument()
  })

  test('renders both CollabReports components with correct props', () => {
    renderComponent()

    const collabReportsComponents = screen.getAllByTestId('collab-reports')
    expect(collabReportsComponents).toHaveLength(2)

    expect(screen.getByText('My Collaboration Reports')).toBeInTheDocument()
    expect(screen.getByText('You have no Collaboration Reports in progress.')).toBeInTheDocument()

    expect(screen.getByText('Approved Collaboration Reports')).toBeInTheDocument()
    expect(screen.getByText('You have no approved Collaboration Reports.')).toBeInTheDocument()
  })

  test('calls useFilters with correct parameters', () => {
    renderComponent()

    expect(useFilters.default).toHaveBeenCalledWith(mockUser, 'collab-landing-filters', true, [], [])
  })

  test('renders header with correct classes', () => {
    renderComponent()

    const header = document.querySelector('.collab-report-header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('flex-align-start', 'margin-top-0', 'margin-bottom-3')
  })

  test('renders heading with correct class', () => {
    renderComponent()

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('landing')
  })

  test('renders plus icon in new report button', () => {
    renderComponent()

    const plusIcon = document.querySelector('.smart-hub--plus')
    expect(plusIcon).toBeInTheDocument()
    expect(plusIcon).toHaveTextContent('+')
  })

  test('renders new report text span', () => {
    renderComponent()

    const newReportText = document.querySelector('.smart-hub--new-report')
    expect(newReportText).toBeInTheDocument()
    expect(newReportText).toHaveTextContent('New Collaboration Report')
  })
})
