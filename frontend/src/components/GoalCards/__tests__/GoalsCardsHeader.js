import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { SCOPE_IDS } from '@ttahub/common'
import GoalCardsHeader from '../GoalsCardsHeader'
import UserContext from '../../../UserContext'

describe('GoalCardsHeader', () => {
  const history = createMemoryHistory()
  const REGION_ID = '1'
  const RECIPIENT_ID = '1'

  const defaultSortConfig = {
    sortBy: 'createdOn',
    direction: 'desc',
    activePage: 1,
    offset: 0,
  }

  const defaultProps = {
    title: 'Test Goals Header',
    count: 3,
    recipientId: RECIPIENT_ID,
    regionId: REGION_ID,
    hasActiveGrants: true,
    sortConfig: defaultSortConfig,
    requestSort: jest.fn(),
    numberOfSelectedGoals: 0,
    allGoalsChecked: false,
    selectAllGoalCheckboxSelect: jest.fn(),
    selectAllGoals: jest.fn(),
    pageSelectedGoalIds: [],
    pageGoalIds: [1, 2, 3],
    showRttapaValidation: false,
    draftSelectedRttapa: [],
    activePage: 1,
    offset: 0,
    perPage: 10,
    handlePageChange: jest.fn(),
    perPageChange: jest.fn(),
    allSelectedGoalIds: {},
    goalBuckets: [],
    hasMissingStandardGoals: true,
  }

  const renderTest = (props = {}, userPermissions = [{ scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS, regionId: 1 }]) => {
    const user = {
      id: 1,
      name: 'test user',
      permissions: userPermissions,
    }

    render(
      <UserContext.Provider value={{ user }}>
        <Router history={history}>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <GoalCardsHeader {...defaultProps} {...props} />
        </Router>
      </UserContext.Provider>
    )
  }

  it('renders the title', () => {
    renderTest()
    expect(screen.getByText('Test Goals Header')).toBeInTheDocument()
  })

  it('shows the "Add new goals" button when user has permission and active grants', () => {
    renderTest()
    expect(screen.getByText('Add new goals')).toBeInTheDocument()
  })

  it('hides the "Add new goals" button when user lacks permission', () => {
    renderTest({}, [{ scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS, regionId: 1 }])
    expect(screen.queryByText('Add new goals')).not.toBeInTheDocument()
  })

  it('hides the "Add new goals" button when there are no missing standard goals', () => {
    renderTest({ hasMissingStandardGoals: false })

    expect(screen.queryByText('Add new goals')).not.toBeInTheDocument()
  })

  it('hides the "Add new goals" button when there are no active grants', () => {
    renderTest({ hasActiveGrants: false })
    expect(screen.queryByText('Add new goals')).not.toBeInTheDocument()
  })

  it('calls requestSort when the sort dropdown is changed', () => {
    const requestSortMock = jest.fn()
    renderTest({ requestSort: requestSortMock })

    const sortDropdown = screen.getByTestId('sortGoalsBy')
    userEvent.selectOptions(sortDropdown, 'goalStatus-asc')

    expect(requestSortMock).toHaveBeenCalledWith('goalStatus', 'asc')
  })

  it('displays the selected count when goals are selected', () => {
    renderTest({ numberOfSelectedGoals: 2 })
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('calls selectAllGoalCheckboxSelect when the select all checkbox is clicked', () => {
    const selectAllMock = jest.fn()
    renderTest({ selectAllGoalCheckboxSelect: selectAllMock })

    const selectAllCheckbox = screen.getByLabelText('Select all')
    userEvent.click(selectAllCheckbox)

    expect(selectAllMock).toHaveBeenCalled()
  })
})
