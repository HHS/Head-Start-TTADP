import '@testing-library/jest-dom'
import React from 'react'
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import ObjectiveCard from '../ObjectiveCard'
import UserContext from '../../../UserContext'
import { OBJECTIVE_STATUS } from '../../../Constants'

describe('ObjectiveCard', () => {
  const history = createMemoryHistory()
  const renderObjectiveCard = (objectiveToRender, dispatchStatusChange = jest.fn(), isMonitoringGoal = false, forceReadOnly = false) => {
    render(
      <UserContext.Provider
        value={{
          user: {
            permissions: [
              {
                scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
                regionId: 1,
              },
            ],
          },
        }}
      >
        <Router history={history}>
          <ObjectiveCard
            objective={objectiveToRender}
            regionId={1}
            goalStatus={GOAL_STATUS.IN_PROGRESS}
            objectivesExpanded
            dispatchStatusChange={dispatchStatusChange}
            isMonitoringGoal={isMonitoringGoal}
            forceReadOnly={forceReadOnly}
          />
        </Router>
      </UserContext.Provider>
    )
  }

  afterEach(() => fetchMock.restore())

  const objective = {
    id: 123,
    ids: [123],
    title: 'This is an objective',
    endDate: '2020-01-01',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
    grantNumbers: ['grant1', 'grant2'],
    topics: [{ name: 'Topic 1' }],
    citations: [],
    activityReports: [
      {
        displayId: 'r-123',
        legacyId: '123',
        number: '678',
        id: 678,
        endDate: '2020-01-01',
      },
    ],
    supportType: 'Planning',
  }

  const objectiveNoSupportType = {
    ...objective,
    supportType: '',
    activityReports: [],
  }

  const objectiveNoTopics = {
    id: 456,
    ids: [456],
    title: 'Objective without topics',
    endDate: '2022-02-02',
    status: OBJECTIVE_STATUS.NOT_STARTED,
    citations: [],
    activityReports: [],
    supportType: 'Technical Assistance',
  }

  const objectiveNoStatus = {
    id: 789,
    ids: [789],
    title: 'Objective without status',
    endDate: '2023-03-03',
    topics: [{ name: 'Topic 2' }],
    citations: [],
    activityReports: [],
    supportType: 'Training',
  }

  it('renders legacy reports', async () => {
    renderObjectiveCard(objective)
    expect(screen.getByText('This is an objective')).toBeInTheDocument()
    expect(screen.getByText('2020-01-01')).toBeInTheDocument()
    const link = screen.getByText('r-123')
    expect(link).toHaveAttribute('href', '/activity-reports/legacy/123')
    expect(screen.getByText('Planning')).toBeInTheDocument()
  })

  it('renders without support type', async () => {
    renderObjectiveCard(objectiveNoSupportType)
    expect(screen.getByText('This is an objective')).toBeInTheDocument()
    expect(screen.queryByText('Support type')).not.toBeInTheDocument()
  })

  it('renders without topics', async () => {
    renderObjectiveCard(objectiveNoTopics)
    expect(screen.getByText('Objective without topics')).toBeInTheDocument()
    const topicsLabel = screen.getByText('Topics')
    expect(topicsLabel).toBeInTheDocument()
    expect(topicsLabel.nextSibling.textContent.trim()).toBe('')
  })

  it('renders with default status when status is missing', async () => {
    const dispatchStatusChange = jest.fn()
    renderObjectiveCard(objectiveNoStatus, dispatchStatusChange)
    expect(screen.getByText('Objective without status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change status for objective objective without status/i })).toHaveTextContent(
      OBJECTIVE_STATUS.NOT_STARTED
    ) // Fixed capitalization
    expect(dispatchStatusChange).toHaveBeenCalledWith([789], OBJECTIVE_STATUS.NOT_STARTED)
  })

  it('updates objective status', async () => {
    const dispatchStatusChange = jest.fn()
    renderObjectiveCard(objectiveNoSupportType, dispatchStatusChange)

    expect(screen.getByText('This is an objective')).toBeInTheDocument()

    const changeButton = await screen.findByRole('button', { name: /change status/i })
    act(() => {
      userEvent.click(changeButton)
    })

    expect(dispatchStatusChange).toHaveBeenCalledWith([123], OBJECTIVE_STATUS.IN_PROGRESS)
    fetchMock.put('/api/objectives/status', { ids: [123], status: OBJECTIVE_STATUS.COMPLETE })

    const completeButton = await screen.findByRole('button', { name: /complete/i })
    await act(async () => {
      await userEvent.click(completeButton)
    })

    expect(fetchMock.called('/api/objectives/status')).toBe(true)
    await waitFor(() => {
      expect(dispatchStatusChange).toHaveBeenCalledWith([123], OBJECTIVE_STATUS.COMPLETE)
    })
  })

  it('handles error updating objective status', async () => {
    const dispatchStatusChange = jest.fn()
    renderObjectiveCard(objectiveNoSupportType, dispatchStatusChange)

    expect(screen.getByText('This is an objective')).toBeInTheDocument()

    const changeButton = await screen.findByRole('button', { name: /change status/i })
    act(() => {
      userEvent.click(changeButton)
    })

    expect(dispatchStatusChange).toHaveBeenCalledWith([123], OBJECTIVE_STATUS.IN_PROGRESS)
    fetchMock.put('/api/objectives/status', 500)

    const completeButton = await screen.findByRole('button', { name: /complete/i })
    await act(async () => {
      await userEvent.click(completeButton)
    })

    expect(fetchMock.called('/api/objectives/status')).toBe(true)
    await waitFor(() => {
      expect(dispatchStatusChange).not.toHaveBeenCalledWith([123], OBJECTIVE_STATUS.COMPLETE)
      expect(screen.getByText(/error updating the status/i)).toBeInTheDocument()
    })
  })

  it('shows citations addressed field when the prop isMonitoringGoal is true', async () => {
    const monitoringObjective = {
      ...objectiveNoSupportType,
      citations: ['citation1', 'citation2'],
    }

    renderObjectiveCard(monitoringObjective, jest.fn(), true)

    expect(screen.getByText('This is an objective')).toBeInTheDocument()
    expect(screen.getByText('2020-01-01')).toBeInTheDocument()
    expect(screen.getByText('Citations addressed')).toBeInTheDocument()
    expect(screen.getByText('citation1, citation2')).toBeInTheDocument()
  })

  it('hides citations addressed field when the prop isMonitoringGoal is false', async () => {
    renderObjectiveCard(objectiveNoSupportType, jest.fn(), false)
    expect(screen.getByText('This is an objective')).toBeInTheDocument()
    expect(screen.getByText('2020-01-01')).toBeInTheDocument()
    expect(screen.queryAllByText('Citations addressed').length).toBe(0)
    expect(screen.queryAllByText('citation1, citation2').length).toBe(0)
  })

  it('suspends an objective and allows context entry', async () => {
    const dispatchStatusChange = jest.fn()
    renderObjectiveCard(objectiveNoSupportType, dispatchStatusChange)

    expect(screen.getByText('This is an objective')).toBeInTheDocument()

    const changeButton = await screen.findByRole('button', { name: /change status/i })
    act(() => {
      userEvent.click(changeButton)
    })

    expect(dispatchStatusChange).toHaveBeenCalledWith([123], OBJECTIVE_STATUS.IN_PROGRESS)
    fetchMock.put('/api/objectives/status', { ids: [123], status: OBJECTIVE_STATUS.SUSPENDED })

    const suspendButton = await screen.findByRole('button', { name: /Suspended/i })
    act(() => {
      userEvent.click(suspendButton)
    })

    const radio = await screen.findByRole('radio', { name: /Regional Office request/i })
    act(() => {
      userEvent.click(radio)
    })

    const contextInput = await screen.findByLabelText(/Additional context/i)
    await act(async () => {
      await userEvent.type(contextInput, 'This is some context')
    })

    const submitButton = await screen.findByRole('button', { name: /submit/i })
    await act(async () => {
      await userEvent.click(submitButton)
    })

    expect(fetchMock.called('/api/objectives/status')).toBe(true)
    const fetchCall = fetchMock.lastCall('/api/objectives/status')
    const [, options] = fetchCall
    const body = JSON.parse(options.body)
    expect(body.closeSuspendReason).toBe('Regional Office request')

    await waitFor(() => {
      expect(dispatchStatusChange).toHaveBeenCalledWith([123], OBJECTIVE_STATUS.SUSPENDED)
    })
  })

  it('renders in read only mode', async () => {
    renderObjectiveCard(objective, jest.fn(), false, true)
    expect(screen.getByText('This is an objective')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /change status/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /suspended/i })).not.toBeInTheDocument()
  })
})
