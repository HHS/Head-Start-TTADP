import '@testing-library/jest-dom'
import React from 'react'
import fetchMock from 'fetch-mock'
import { render, screen, act, waitFor } from '@testing-library/react'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import RecipientsWithClassScoresAndGoals from '../index'
import UserContext from '../../../../UserContext'
import { mockRSSData } from '../../../../testHelpers'

const dashboardApi = '/api/ssdi/api/dashboards/qa/class.sql?&dataSetSelection[]=with_class_widget&dataSetSelection[]=with_class_page'

const recipientsWithClassScoresAndGoalsData = [
  {
    data_set: 'with_class_widget',
    records: 1,
    data: [
      {
        total: 2,
        'recipients with class': 2,
        '% recipients with class': 50,
        'grants with class': 3,
      },
    ],
  },
  {
    data_set: 'with_class_page',
    records: 3,
    data: [
      {
        classroomOrganization: 5.043,
        emotionalSupport: 6.043,
        grantNumber: '90CI010073',
        instructionalSupport: 4.043,
        lastARStartDate: '2021-01-02',
        recipientId: 1,
        recipientName: 'Abernathy, Mraz and Bogan',
        reportDeliveryDate: '2022-03-01T04:00:00+00:00',
        'region id': 1,
        collaborators: 'Jane Doe',
        creator: 'John Doe',
        goalCreatedAt: '2021-01-02T18:41:32.028+00:00',
        goalId: 45641,
        goalStatus: GOAL_STATUS.IN_PROGRESS,
      },
      {
        classroomOrganization: 5.043,
        emotionalSupport: 6.043,
        grantNumber: '90CI010073',
        instructionalSupport: 4.043,
        lastARStartDate: '2021-01-02',
        recipientId: 1,
        recipientName: 'Abernathy, Mraz and Bogan',
        reportDeliveryDate: '2022-03-01T04:00:00+00:00',
        'region id': 1,
        collaborators: 'Bob Jones',
        creator: 'Bill Smith',
        goalCreatedAt: '2021-01-02T18:41:32.028+00:00',
        goalId: 25858,
        goalStatus: GOAL_STATUS.SUSPENDED,
      },
      {
        classroomOrganization: 8.458,
        emotionalSupport: 5.254,
        grantNumber: '90CI010073',
        instructionalSupport: 1.214,
        lastARStartDate: '2021-04-02',
        recipientId: 2,
        recipientName: 'Recipient 2',
        reportDeliveryDate: '2022-05-01T04:00:00+00:00',
        'region id': 2,
        collaborators: 'Jack Jones',
        creator: 'Bill Parks',
        goalCreatedAt: '2021-04-02T18:41:32.028+00:00',
        goalId: 68745,
        goalStatus: GOAL_STATUS.CLOSED,
      },
      {
        classroomOrganization: 8.459,
        emotionalSupport: 5.256,
        grantNumber: '90CI010074',
        instructionalSupport: 1.215,
        lastARStartDate: null,
        recipientId: 2,
        recipientName: 'Recipient 2',
        reportDeliveryDate: '2022-05-01T04:00:00+00:00',
        'region id': 2,
        collaborators: 'Jill Jones',
        creator: 'Nadia Parks',
        goalCreatedAt: '2021-04-02T18:41:32.028+00:00',
        goalId: 68746,
        goalStatus: GOAL_STATUS.NOT_STARTED,
      },
      {
        classroomOrganization: 1.1,
        emotionalSupport: 2.2,
        grantNumber: '90CI010075',
        instructionalSupport: 3.3,
        lastARStartDate: null,
        recipientId: 4,
        recipientName: 'Recipient With Null Dates',
        reportDeliveryDate: null,
        'region id': 4,
        collaborators: 'Null Collaborator',
        creator: 'Null Creator',
        goalCreatedAt: '2023-01-01T18:41:32.028+00:00',
        goalId: 99999,
        goalStatus: GOAL_STATUS.DRAFT,
      },
    ],
  },
]

const renderRecipientsWithClassScoresAndGoals = () => {
  const history = createMemoryHistory()
  render(
    <UserContext.Provider value={{ user: { id: 1 } }}>
      <Router history={history}>
        <RecipientsWithClassScoresAndGoals />
      </Router>
    </UserContext.Provider>
  )
}

describe('Recipients With Class and Scores and Goals', () => {
  afterEach(() => {
    fetchMock.restore()
  })

  beforeEach(() => {
    fetchMock.get('/api/feeds/item?tag=ttahub-qa-dash-class-filters', mockRSSData())
    fetchMock.get('/api/feeds/item?tag=ttahub-class-thresholds', mockRSSData())
    fetchMock.get('/api/feeds/item?tag=ttahub-ohs-standard-class-goal', mockRSSData())
  })

  it('renders correctly with data', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData)
    renderRecipientsWithClassScoresAndGoals()

    expect(screen.queryAllByText(/Recipients with CLASS® scores/i).length).toBe(2)

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-3 of 3/i)).toBeInTheDocument()
      })
    })

    expect(screen.getByText('Abernathy, Mraz and Bogan')).toBeInTheDocument()
    expect(screen.getByText('01/02/2021')).toBeInTheDocument()
    expect(screen.getByText(/6\.043/i)).toBeInTheDocument()
    expect(screen.getByText(/5\.043/i)).toBeInTheDocument()
    expect(screen.getByText(/4\.043/i)).toBeInTheDocument()
    expect(screen.getByText('03/01/2022')).toBeInTheDocument()

    // Expand goals.
    let goalsButton = screen.getByRole('button', { name: /view goals for recipient Abernathy, Mraz and Bogan/i })
    goalsButton.click()

    expect(screen.getByText('G-45641')).toBeInTheDocument()
    expect(screen.getByText(GOAL_STATUS.IN_PROGRESS)).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('G-25858')).toBeInTheDocument()
    expect(screen.getByText(GOAL_STATUS.SUSPENDED)).toBeInTheDocument()
    expect(screen.getByText('Bill Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()

    expect(screen.getByText('Recipient 2')).toBeInTheDocument()
    expect(screen.getByText('04/02/2021')).toBeInTheDocument()
    expect(screen.getByText('5.254')).toBeInTheDocument()
    expect(screen.getByText('8.458')).toBeInTheDocument()
    expect(screen.getByText('1.214')).toBeInTheDocument()
    expect(screen.getByText('05/01/2022')).toBeInTheDocument()

    // Expand goals.
    goalsButton = screen.getByRole('button', { name: /view goals for recipient recipient 2/i })
    goalsButton.click()

    expect(screen.getByText('G-68745')).toBeInTheDocument()
    expect(screen.getByText(GOAL_STATUS.CLOSED)).toBeInTheDocument()
    expect(screen.getByText('Bill Parks')).toBeInTheDocument()
    expect(screen.getByText('Jack Jones')).toBeInTheDocument()
  })

  it('selects and unselects all recipients', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData)
    renderRecipientsWithClassScoresAndGoals()

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-3 of 3/i)).toBeInTheDocument()
      })
    })

    const selectAllButton = screen.getByRole('checkbox', { name: /select all recipients/i })
    selectAllButton.click()
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument()
    selectAllButton.click()
    expect(screen.queryAllByText(/3 selected/i).length).toBe(0)
  })

  it('Shows the selected pill and unselects when pill is removed', async () => {
    fetchMock.get(dashboardApi, recipientsWithClassScoresAndGoalsData)
    renderRecipientsWithClassScoresAndGoals()
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/1-3 of 3/i)).toBeInTheDocument()
      })
    })
    const selectAllButton = screen.getByRole('checkbox', { name: /select all recipients/i })
    selectAllButton.click()
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument()
    const pillRemoveButton = screen.getByRole('button', { name: /deselect all goals/i })
    pillRemoveButton.click()
    expect(screen.queryAllByText(/3 selected/i).length).toBe(0)
  })

  it('handles error on fetch', async () => {
    fetchMock.get(dashboardApi, 500)
    renderRecipientsWithClassScoresAndGoals()

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/Unable to fetch QA data/i)).toBeInTheDocument()
      })
    })
  })
})
