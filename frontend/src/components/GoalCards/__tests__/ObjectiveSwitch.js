import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import { ObjectiveSwitch } from '../StandardGoalCard'
import UserContext from '../../../UserContext'
import { OBJECTIVE_STATUS } from '../../../Constants'

describe('ObjectiveSwitch', () => {
  const history = createMemoryHistory()

  it('renders goal objectives', async () => {
    const objective = {
      id: 123,
      ids: [123],
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: OBJECTIVE_STATUS.IN_PROGRESS,
      grantNumbers: ['grant1', 'grant2'],
      topics: [{ name: 'Topic 1' }],
      activityReports: [
        {
          displayId: 'r-123',
          legacyId: '123',
          number: '678',
          id: 678,
          endDate: '2020-01-01',
        },
      ],
    }
    render(
      <UserContext.Provider value={{ user: {} }}>
        <Router history={history}>
          <ObjectiveSwitch
            objective={objective}
            objectivesExpanded
            regionId={1}
            goalStatus={GOAL_STATUS.IN_PROGRESS}
            dispatchStatusChange={jest.fn()}
            isMonitoringGoal={false}
          />
        </Router>
      </UserContext.Provider>
    )
    expect(screen.getByText('This is an objective')).toBeInTheDocument()
    expect(screen.getByText('2020-01-01')).toBeInTheDocument()
    const link = screen.getByText('r-123')
    expect(link).toHaveAttribute('href', '/activity-reports/legacy/123')
  })
})
