import React from 'react'
import { render, screen } from '@testing-library/react'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import { StatusActionTag, userDisplayFromStatus } from '../ViewStandardGoals'

describe('ViewStandardGoals helpers', () => {
  describe('StatusActionTag', () => {
    const baseUpdate = {
      newStatus: GOAL_STATUS.NOT_STARTED,
      reason: 'Goal created',
    }

    it('shows "Added on" when goal is first created', () => {
      render(<StatusActionTag update={baseUpdate} goalHistory={[{ status: 'In Progress' }]} currentGoalIndex={0} />)

      expect(screen.getByText('Added on')).toBeInTheDocument()
    })

    it('shows "Reopened on" when a later goal is closed', () => {
      render(<StatusActionTag update={baseUpdate} goalHistory={[{ status: 'In Progress' }, { status: 'Closed' }]} currentGoalIndex={0} />)

      expect(screen.getByText('Reopened on')).toBeInTheDocument()
    })
  })

  describe('userDisplayFromStatus', () => {
    const monitoringGoal = {
      standard: 'Monitoring',
      goalCollaborators: [],
    }

    it('returns OHS tag when monitoring goal is started due to active citations', () => {
      const label = userDisplayFromStatus(monitoringGoal, {
        newStatus: GOAL_STATUS.NOT_STARTED,
        reason: 'Active monitoring citations',
      })

      expect(label).toBe(' by OHS')
    })

    it('returns OHS tag when monitoring goal closes due to no citations', () => {
      const label = userDisplayFromStatus(monitoringGoal, {
        newStatus: 'Closed',
        reason: 'No active monitoring citations',
      })

      expect(label).toBe(' by OHS')
    })
  })
})
