import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import PrintableGoal from '../PrintableGoal'
import { OBJECTIVE_STATUS } from '../../../../../Constants'

describe('PrintableGoal', () => {
  const renderPrintableGoal = (goal) => render(<PrintableGoal goal={goal} />)

  it('will display a goal with an uncertain status', async () => {
    const goal = {
      status: 'Uncertain',
      goalNumbers: ['2'],
      name: 'asdfasdf',
      grant: { number: '3' },
      goalTopics: ['Topic'],
      objectives: [],
    }
    renderPrintableGoal(goal)
    expect(await screen.findByText('Uncertain')).toBeInTheDocument()
  })

  it('will display a goal with no status', async () => {
    const goal = {
      goalNumbers: ['2'],
      name: 'asdfasdf',
      grant: { number: '3' },
      goalTopics: ['Topic'],
      objectives: [],
    }
    renderPrintableGoal(goal)
    expect(await screen.findByText(/Needs Status/i)).toBeInTheDocument()
  })

  it('displays objectives and topics', async () => {
    const goal = {
      id: 123,
      status: GOAL_STATUS.IN_PROGRESS,
      goalNumbers: ['G-1'],
      name: 'Goal with objectives',
      grant: { number: 'Grant-1' },
      objectives: [
        {
          id: 1,
          title: 'Objective 1',
          ttaProvided: 'TTA for objective 1',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          topics: ['Topic A', 'Topic B'],
          resources: [],
          files: [],
          activityReports: [],
          reasons: [],
        },
        {
          id: 2,
          title: 'Objective 2',
          ttaProvided: 'TTA for objective 2',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          topics: ['Topic B', 'Topic C'],
          resources: [],
          files: [],
          activityReports: [],
          reasons: [],
        },
        {
          id: 3,
          title: 'Objective 3 - No Topics',
          ttaProvided: 'TTA for objective 3',
          status: OBJECTIVE_STATUS.COMPLETE,
          resources: [],
          files: [],
          activityReports: [],
          reasons: [],
        },
      ],
    }
    renderPrintableGoal(goal)
    expect(await screen.findByText('Objective 1')).toBeInTheDocument()
    expect(await screen.findByText('Objective 2')).toBeInTheDocument()
    expect(await screen.findByText('Topics')).toBeInTheDocument()
    expect(await screen.findByText('Topic A')).toBeInTheDocument()
    expect(await screen.findByText('Topic B')).toBeInTheDocument()
    expect(await screen.findByText('Topic C')).toBeInTheDocument()
    // check that Topic B only appears once
    expect(screen.queryAllByText('Topic B').length).toBe(1)
    // check objective heading
    expect(await screen.findByText(/Objectives for goal G-123/i)).toBeInTheDocument()
  })

  it('displays goal id when goalNumbers is missing', async () => {
    const goal = {
      id: 456,
      status: GOAL_STATUS.CLOSED,
      name: 'Goal without goalNumbers',
      grant: { number: 'Grant-2' },
      objectives: [],
    }
    renderPrintableGoal(goal)
    expect(await screen.findByText('Goal G-456')).toBeInTheDocument()
  })
})
