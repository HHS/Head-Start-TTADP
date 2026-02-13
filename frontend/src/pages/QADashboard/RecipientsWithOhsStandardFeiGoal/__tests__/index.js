import '@testing-library/jest-dom'
import React from 'react'
import fetchMock from 'fetch-mock'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipientsWithOhsStandardFeiGoal, { mapGoalStatusKey } from '../index'
import UserContext from '../../../../UserContext'
import { mockRSSData } from '../../../../testHelpers'

const history = createMemoryHistory()

const defaultUser = {
  homeRegionId: 14,
  permissions: [
    {
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    },
    {
      regionId: 2,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    },
  ],
}

const recipientsWithOhsStandardFeiGoalEmptyData = [
  {
    data_set: 'with_fei_widget',
    records: '1',
    data: [
      {
        total: 1550,
        '% recipients with fei': 0,
        'grants with fei': 0,
        'recipients with fei': 0,
      },
    ],
  },
  {
    data_set: 'with_fei_page',
    records: '0',
    data: [],
  },
]

const recipientsWithOhsStandardFeiGoalSsdiData = [
  {
    data_set: 'with_fei_widget',
    records: '1',
    data: [
      {
        total: 1550,
        '% recipients with fei': 55.35,
        'grants with fei': 1093,
        'recipients with fei': 858,
      },
    ],
  },
  {
    data_set: 'with_fei_page',
    records: '799',
    data: [
      {
        recipientId: 1,
        recipientName: 'Test Recipient 1',
        createdAt: '2021-09-01T13:05:17.944+00:00',
        goalId: 20628,
        goalStatus: GOAL_STATUS.IN_PROGRESS,
        grantNumber: '234234',
        rootCause: ['Community Partnership', 'Workforce'],
      },
      {
        recipientId: 2,
        recipientName: 'Test Recipient 2',
        createdAt: '2021-09-02T13:05:17.944+00:00',
        goalId: 359813,
        goalStatus: GOAL_STATUS.NOT_STARTED,
        grantNumber: '4234232',
        rootCause: ['Testing'],
      },
      {
        recipientId: 3,
        recipientName: 'Test Recipient 3',
        createdAt: '2021-09-03T13:05:17.944+00:00',
        goalId: 457825,
        goalStatus: GOAL_STATUS.IN_PROGRESS,
        grantNumber: '5678856',
        rootCause: ['Facilities'],
      },
    ],
  },
]

const renderRecipientsWithOhsStandardFeiGoal = (user = defaultUser) => {
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <RecipientsWithOhsStandardFeiGoal />
      </UserContext.Provider>
    </Router>
  )
}

describe('Recipients With Ohs Standard Fei Goal', () => {
  afterEach(() => {
    fetchMock.restore()
  })

  beforeEach(() => {
    fetchMock.get('/api/feeds/item?tag=ttahub-ohs-standard-fei-goal', mockRSSData())
    fetchMock.get('/api/feeds/item?tag=ttahub-qa-dash-fei-filters', mockRSSData())
    fetchMock.get('/api/feeds/item?tag=ttahub-fei-root-causes', mockRSSData())
  })
  it('renders correctly without data', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/fei.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=with_fei_widget&dataSetSelection[]=with_fei_page',
      recipientsWithOhsStandardFeiGoalEmptyData
    )
    renderRecipientsWithOhsStandardFeiGoal()

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 1 }).length).toBe(1)
    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 2 }).length).toBe(1)
    expect(screen.getByText(/root causes were identified through self-reported data\./i)).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/fei.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=with_fei_widget&dataSetSelection[]=with_fei_page',
      recipientsWithOhsStandardFeiGoalSsdiData
    )
    renderRecipientsWithOhsStandardFeiGoal()

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 1 }).length).toBe(1)
    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 2 }).length).toBe(1)
    expect(screen.getByText(/root causes were identified through self-reported data\./i)).toBeInTheDocument()
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/Test Recipient 1/i)).toBeInTheDocument()
        expect(screen.getByText(/Test Recipient 2/i)).toBeInTheDocument()
        expect(screen.getByText(/Test Recipient 3/i)).toBeInTheDocument()

        expect(screen.getByText('09/01/2021')).toBeInTheDocument()
        expect(screen.getByText('09/02/2021')).toBeInTheDocument()
        expect(screen.getByText('09/03/2021')).toBeInTheDocument()

        expect(screen.getByText(/G-20628/i)).toBeInTheDocument()
        expect(screen.getByText(/G-359813/i)).toBeInTheDocument()
        expect(screen.getByText(/G-457825/i)).toBeInTheDocument()

        expect(screen.queryAllByText(/In progress/i).length).toBe(2)
        expect(screen.getByText(/Not started/i)).toBeInTheDocument()
        expect(screen.getByText(/Community Partnership, Workforce/i)).toBeInTheDocument()
        expect(screen.getByText(/Testing/i)).toBeInTheDocument()
        expect(screen.getByText(/Facilities/i)).toBeInTheDocument()

        // Check all grant numbers are displayed.
        expect(screen.getByText(/234234/i)).toBeInTheDocument()
        expect(screen.getByText(/4234232/i)).toBeInTheDocument()
        expect(screen.getByText(/5678856/i)).toBeInTheDocument()
      })
    })
  })

  it('handles a user with only one region', async () => {
    const u = {
      homeRegionId: 14,
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    }
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/fei.sql?region.in[]=2&dataSetSelection[]=with_fei_widget&dataSetSelection[]=with_fei_page',
      recipientsWithOhsStandardFeiGoalSsdiData
    )
    renderRecipientsWithOhsStandardFeiGoal(u)

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 1 }).length).toBe(1)
    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 2 }).length).toBe(1)
    const filters = await screen.findByRole('button', { name: /open filters for this page/i })

    act(() => {
      userEvent.click(filters)
    })

    const select = await screen.findByLabelText(/select a filter/i)

    // expect select not to have "region" as an option
    const option = select.querySelector('option[value="region"]')
    expect(option).toBeNull()
  })

  it('handles error on fetch', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/fei.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=with_fei_widget&dataSetSelection[]=with_fei_page',
      500
    )
    renderRecipientsWithOhsStandardFeiGoal()

    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 1 }).length).toBe(1)
    expect(screen.queryAllByRole('heading', { name: /recipients with ohs standard fei goal/i, level: 2 }).length).toBe(1)
    expect(screen.getByText(/root causes were identified through self-reported data\./i)).toBeInTheDocument()
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText(/unable to fetch qa data/i)).toBeInTheDocument()
      })
    })
  })

  it('returns correct sort order from mapGoalStatusKey', () => {
    expect(mapGoalStatusKey(GOAL_STATUS.NOT_STARTED)).toBe(4)
    expect(mapGoalStatusKey(GOAL_STATUS.IN_PROGRESS)).toBe(3)
    expect(mapGoalStatusKey(GOAL_STATUS.SUSPENDED)).toBe(2)
    expect(mapGoalStatusKey(GOAL_STATUS.CLOSED)).toBe(1)
    expect(mapGoalStatusKey('')).toBe(0)
  })
})
