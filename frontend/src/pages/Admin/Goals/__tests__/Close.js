import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import selectEvent from 'react-select-event'
import join from 'url-join'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import Close from '../Close'
import AppLoadingContext from '../../../../AppLoadingContext'

const REGION_ID = 1

const getGroupsByRegionUrl = join('/', 'api', 'admin', 'groups', 'region', String(REGION_ID))
const goalsForGrantsUrl = join('/', 'api', 'activity-reports', 'goals')
const closeGoalsUrl = join('/', 'api', 'admin', 'goals', 'close')

describe('Close', () => {
  const history = createMemoryHistory()
  const renderCloseGoals = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <Router history={history}>
          <Close />
        </Router>
      </AppLoadingContext.Provider>
    )
  }

  afterEach(() => fetchMock.restore())

  it('fetches data when region is updated', async () => {
    fetchMock.get(getGroupsByRegionUrl, [])

    act(() => {
      renderCloseGoals()
    })

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)
  })

  it('selecting a group displays the groups and fetches the goals', async () => {
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 1,
        name: 'Group 1',
        grants: [
          {
            id: 1,
            name: 'Grant 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 2,
            name: 'Grant 2',
            recipientInfo: 'Grant 2 recipient info',
          },
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])

    act(() => {
      renderCloseGoals()
    })

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    fetchMock.get(`${goalsForGrantsUrl}?grantIds=2&grantIds=4`, [])

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    expect(screen.getByText('Grant 2 recipient info')).toBeInTheDocument()
    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()
  })

  it('handles an error fetching the goals', async () => {
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 1,
        name: 'Group 1',
        grants: [
          {
            id: 1,
            name: 'Grant 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 2,
            name: 'Grant 2',
            recipientInfo: 'Grant 2 recipient info',
          },
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])

    act(() => {
      renderCloseGoals()
    })

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    fetchMock.get(`${goalsForGrantsUrl}?grantIds=2&grantIds=4`, 500)

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    expect(screen.getByText('Grant 2 recipient info')).toBeInTheDocument()
    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()
  })

  it('you can submit the form', async () => {
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 1,
        name: 'Group 1',
        grants: [
          {
            id: 1,
            name: 'Grant 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 2,
            name: 'Grant 2',
            recipientInfo: 'Grant 2 recipient info',
          },
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])

    act(() => {
      renderCloseGoals()
    })

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    fetchMock.get(`${goalsForGrantsUrl}?grantIds=2&grantIds=4`, [
      {
        status: GOAL_STATUS.IN_PROGRESS,
        name: 'Hey hey hey hey hey',
        goalIds: [1],
        grantIds: [2],
      },
      {
        status: GOAL_STATUS.IN_PROGRESS,
        name: 'Hey hey hey hey hey',
        goalIds: [2],
        grantIds: [4],
      },
      {
        status: GOAL_STATUS.IN_PROGRESS,
        name: 'Hey hey hey hey hey 2',
        goalIds: [3],
        grantIds: [4],
      },
    ])

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    const goalSelect = await screen.findByLabelText(/Select goal to close/i)
    await selectEvent.select(goalSelect, 'Hey hey hey hey hey')

    const radioButton = await screen.findByRole('radio', { name: /recipient request/i })
    act(() => {
      userEvent.click(radioButton)
    })

    expect(radioButton.checked).toBe(true)

    const textarea = await screen.findByRole('textbox')
    act(() => {
      userEvent.type(textarea, 'This is some healthy context')
    })

    const submitButton = await screen.findByRole('button', { name: /Submit/i })
    act(() => {
      userEvent.click(submitButton)
    })

    fetchMock.put(closeGoalsUrl, { isError: false, goals: [{}] })

    const confirm = await screen.findByRole('button', { name: /close goals/i })
    act(() => {
      userEvent.click(confirm)
    })

    await waitFor(() => {
      expect(fetchMock.called(closeGoalsUrl)).toBe(true)
    })

    const closeMoreGoals = await screen.findByRole('button', { name: /close more goals/i })
    act(() => {
      userEvent.click(closeMoreGoals)
    })
  })

  it('handles an error with form submission', async () => {
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 1,
        name: 'Group 1',
        grants: [
          {
            id: 1,
            name: 'Grant 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 2,
            name: 'Grant 2',
            recipientInfo: 'Grant 2 recipient info',
          },
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])

    act(() => {
      renderCloseGoals()
    })

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    fetchMock.get(`${goalsForGrantsUrl}?grantIds=2&grantIds=4`, [
      {
        status: GOAL_STATUS.IN_PROGRESS,
        name: 'Hey hey hey hey hey',
        goalIds: [1],
        grantIds: [2],
      },
      {
        status: GOAL_STATUS.IN_PROGRESS,
        name: 'Hey hey hey hey hey',
        goalIds: [2],
        grantIds: [4],
      },
      {
        status: GOAL_STATUS.IN_PROGRESS,
        name: 'Hey hey hey hey hey 2',
        goalIds: [3],
        grantIds: [4],
      },
    ])

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    const goalSelect = await screen.findByLabelText(/Select goal to close/i)
    await selectEvent.select(goalSelect, 'Hey hey hey hey hey')

    const radioButton = await screen.findByRole('radio', { name: /recipient request/i })
    act(() => {
      userEvent.click(radioButton)
    })

    expect(radioButton.checked).toBe(true)

    const textarea = await screen.findByRole('textbox')
    act(() => {
      userEvent.type(textarea, 'This is some healthy context')
    })

    const submitButton = await screen.findByRole('button', { name: /Submit/i })
    act(() => {
      userEvent.click(submitButton)
    })

    fetchMock.put(closeGoalsUrl, 500)

    const confirm = await screen.findByRole('button', { name: /close goals/i })
    act(() => {
      userEvent.click(confirm)
    })

    await waitFor(() => {
      expect(fetchMock.called(closeGoalsUrl)).toBe(true)
    })

    const alert = await screen.findByText(/An error occurred while closing the goals/i)
    expect(alert).toBeInTheDocument()
  })
})
