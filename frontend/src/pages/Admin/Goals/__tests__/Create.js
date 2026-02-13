import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import join from 'url-join'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import Goals from '../Create'
import AppLoadingContext from '../../../../AppLoadingContext'

const REGION_ID = 1

const getGroupsByRegionUrl = join('/', 'api', 'admin', 'groups', 'region', String(REGION_ID))
const templatesUrl = join('/', 'api', 'admin', 'goals', 'curated-templates')
const creatorsUrl = join('/', 'api', 'admin', 'users', 'creators', 'region', String(REGION_ID))
const promptsUrl = join('/', 'api', 'goal-templates', '1', 'prompts?&isForActivityReport=false')

const createGoalsUrl = join('/', 'api', 'admin', 'goals')

describe('Create', () => {
  const history = createMemoryHistory()
  const renderGoals = () => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <Router history={history}>
          <Goals />
        </Router>
      </AppLoadingContext.Provider>
    )
  }

  afterEach(() => fetchMock.restore())

  it('renders page and fetches templates', async () => {
    fetchMock.get(templatesUrl, [])
    act(() => {
      renderGoals()
    })

    expect(await screen.findByRole('heading', { name: 'Create goals' })).toBeInTheDocument()
    expect(fetchMock.called(templatesUrl)).toBe(true)
  })

  it('fetches data when region is updated', async () => {
    fetchMock.get(templatesUrl, [])
    fetchMock.get(getGroupsByRegionUrl, [])
    fetchMock.get(creatorsUrl, [])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)
    expect(fetchMock.called(creatorsUrl)).toBe(true)
  })

  it('selecting a group displays the groups', async () => {
    fetchMock.get(templatesUrl, [])
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
    fetchMock.get(creatorsUrl, [])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    expect(screen.getByText('Grant 2 recipient info')).toBeInTheDocument()
    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()
  })

  it('you can choose a curated goal', async () => {
    fetchMock.get(templatesUrl, [
      {
        id: 1,
        label: 'This is a curated goal template provided by OHS',
      },
    ])
    fetchMock.get(getGroupsByRegionUrl, [
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
    fetchMock.get(creatorsUrl, [])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    const selectInitiativeGoal = await screen.findByRole('checkbox', { name: /Use standard OHS goal/i })
    act(() => {
      userEvent.click(selectInitiativeGoal)
    })

    fetchMock.get(promptsUrl, [])

    const goalSelector = await screen.findByLabelText(/OHS standard goal/i)
    act(() => {
      userEvent.selectOptions(goalSelector, 'This is a curated goal template provided by OHS')
    })

    expect(fetchMock.called(promptsUrl)).toBe(true)
  })

  it('selected create a report displays creator options', async () => {
    fetchMock.get(templatesUrl, [])
    fetchMock.get(getGroupsByRegionUrl, [
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
    fetchMock.get(creatorsUrl, [
      {
        id: 1,
        name: 'A Creative Creator',
      },
    ])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    const createReportCheck = await screen.findByRole('checkbox', { name: /Create a new activity report/i })
    act(() => {
      userEvent.click(createReportCheck)
    })

    const creatorSelector = await screen.findByLabelText(/Activity report creator/i)
    act(() => {
      userEvent.selectOptions(creatorSelector, 'A Creative Creator')
    })

    expect(screen.getByText('Grant 2 recipient info')).toBeInTheDocument()
    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()
  })

  it('displays error messages when returned from API', async () => {
    fetchMock.get(templatesUrl, [])
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])
    fetchMock.get(creatorsUrl, [
      {
        id: 1,
        name: 'A Creative Creator',
      },
    ])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()

    const goalTextarea = document.querySelector('[name="goalText"]')
    act(() => {
      userEvent.type(goalTextarea, 'This is a goal')
    })

    fetchMock.post(createGoalsUrl, { isError: true, message: 'Goal name already exists for grants 2', grantsForWhichGoalWillBeCreated: [4] })

    const submitButton = await screen.findByRole('button', { name: /Submit/i })
    act(() => {
      userEvent.click(submitButton)
    })

    await waitFor(() => expect(fetchMock.called(createGoalsUrl)).toBe(true))
    expect(await screen.findByText(/Goal name already exists for grants 2/i)).toBeInTheDocument()
  })
  it('displays generic error message when an unknown error occurs', async () => {
    fetchMock.get(templatesUrl, [])
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])
    fetchMock.get(creatorsUrl, [
      {
        id: 1,
        name: 'A Creative Creator',
      },
    ])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()

    const goalTextarea = document.querySelector('[name="goalText"]')
    act(() => {
      userEvent.type(goalTextarea, 'This is a goal')
    })

    fetchMock.post(createGoalsUrl, 500)

    const submitButton = await screen.findByRole('button', { name: /Submit/i })
    act(() => {
      userEvent.click(submitButton)
    })

    await waitFor(() => expect(fetchMock.called(createGoalsUrl)).toBe(true))
    expect(await screen.findByText('An error occurred while creating the goals.')).toBeInTheDocument()
  })

  it('displays success info when successful', async () => {
    fetchMock.get(templatesUrl, [])
    fetchMock.get(getGroupsByRegionUrl, [
      {
        id: 2,
        name: 'Group 2',
        grants: [
          {
            id: 4,
            name: 'Grant 4',
            recipientInfo: 'Grant 4 recipient info',
          },
        ],
      },
    ])
    fetchMock.get(creatorsUrl, [
      {
        id: 1,
        name: 'A Creative Creator',
      },
    ])
    act(() => {
      renderGoals()
    })

    expect(fetchMock.called(templatesUrl)).toBe(true)

    const region = await screen.findByLabelText(/Region/i)
    act(() => {
      userEvent.selectOptions(region, '1')
    })

    expect(fetchMock.called(getGroupsByRegionUrl)).toBe(true)

    const groupSelector = await screen.findByLabelText(/Recipient group/i)
    act(() => {
      userEvent.selectOptions(groupSelector, 'Group 2')
    })

    expect(screen.getByText('Grant 4 recipient info')).toBeInTheDocument()

    const goalTextarea = document.querySelector('[name="goalText"]')
    act(() => {
      userEvent.type(goalTextarea, 'This is a goal')
    })

    fetchMock.post(createGoalsUrl, {
      activityReport: {
        id: 1,
        displayId: 'R01-123-01',
      },
      goals: [{ id: 1 }],
      isError: false,
      message: 'A message of confirmation',
    })

    const submitButton = await screen.findByRole('button', { name: /Submit/i })
    act(() => {
      userEvent.click(submitButton)
    })

    await waitFor(() => expect(fetchMock.called(createGoalsUrl)).toBe(true))
    expect(await screen.findByText(/successfully created 1 goals/i)).toBeInTheDocument()
    expect(await screen.findByText(/R01-123-01/i)).toBeInTheDocument()
    expect(await screen.findByText(/A message of confirmation/i)).toBeInTheDocument()
  })
})
