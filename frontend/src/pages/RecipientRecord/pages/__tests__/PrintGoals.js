import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import fetchMock from 'fetch-mock'
import { act } from 'react-dom/test-utils'
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common'
import PrintGoals from '../PrintGoals'
import UserContext from '../../../../UserContext'
import { filtersToQueryString } from '../../../../utils'
import FilterContext from '../../../../FilterContext'
import { GOALS_OBJECTIVES_FILTER_KEY } from '../constants'
import { OBJECTIVE_STATUS } from '../../../../Constants'

const memoryHistory = createMemoryHistory()

const RECIPIENT_ID = '123456'
const REGION_ID = '1'

describe('PrintGoals', () => {
  const goals = [
    {
      id: 4598,
      status: GOAL_STATUS.IN_PROGRESS,
      createdOn: '2021-06-15',
      name: 'This is goal text 1.',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumbers: ['G-4598'],
      grant: { number: 'Rattaché au programme' },
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [],
    },
    {
      id: 4599,
      status: GOAL_STATUS.CLOSED,
      createdOn: '2021-06-15',
      name: 'This is goal text 2.',
      goalTopics: ['Human Resources', 'Safety Practices'],
      objectiveCount: 5,
      goalNumbers: ['G-4598'],
      grant: { number: 'Rattaché au programme' },
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [
        {
          id: 1,
          title: 'this is an objective',
          grantNumber: '123',
          endDate: '01/01/02',
          reasons: ['Empathy', 'Generosity', 'Friendship'],
          status: OBJECTIVE_STATUS.COMPLETE,
          topics: ['Human Resources', 'Safety Practices'],
          activityReports: [
            {
              id: 1,
              displayId: '1234',
              legacyId: null,
            },
            {
              id: 2,
              displayId: '1234',
              legacyId: 'r-1234',
            },
          ],
        },
      ],
    },
  ]

  const user = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  }

  const baseLocation = {
    state: null,
    hash: '',
    pathname: '',
    search: '',
  }

  const renderPrintGoals = (loc = {}) => {
    const location = { ...baseLocation, ...loc }

    render(
      <Router history={memoryHistory}>
        <FilterContext.Provider value={{ filterKey: GOALS_OBJECTIVES_FILTER_KEY(RECIPIENT_ID) }}>
          <UserContext.Provider value={{ user }}>
            <PrintGoals location={location} recipientId={RECIPIENT_ID} regionId={REGION_ID} />
          </UserContext.Provider>
        </FilterContext.Provider>
      </Router>
    )
  }

  const filters = [{ topic: 'status', condition: 'is', query: [GOAL_STATUS.CLOSED] }]
  const baseMock = `/api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=false`
  const filteredMockURL = `${baseMock}&${filtersToQueryString(filters)}`
  // const filteredMockURLGoalOne = `${baseMock}&${filtersToQueryString(filterWithJustGoalOne)}`;
  // FIXME: PrintGoals doesn't build the query string with `goalIds.in[]=`
  const filteredMockURLGoalOne =
    '/api/recipient/123456/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=false&goalIds=4598&status.in[]=Closed'

  beforeEach(async () => {
    fetchMock.get(baseMock, { count: 5, goalRows: goals })
    fetchMock.get(filteredMockURL, { count: 0, goalRows: [] })
    fetchMock.get(filteredMockURLGoalOne, { count: 0, goalRows: [goals[0]] })
  })

  afterEach(async () => {
    fetchMock.restore()
  })

  it('handles a loading error', async () => {
    fetchMock.restore()
    fetchMock.get(baseMock, () => {
      throw new Error()
    })
    act(renderPrintGoals)
    expect(await screen.findByText('Something went wrong')).toBeVisible()
  })

  it('renders goals from API', async () => {
    renderPrintGoals()
    expect(await screen.findByText('This is goal text 1.')).toBeVisible()
    const hr = await screen.findAllByText('Human Resources')
    expect(hr.length).toBe(1)
    hr.forEach((e) => expect(e).toBeVisible())
    const sp = await screen.findAllByText('Safety Practices')
    expect(sp.length).toBe(1)
    sp.forEach((e) => expect(e).toBeVisible())
    expect(await screen.findByText('This is goal text 2.')).toBeVisible()
    expect(await screen.findByText('this is an objective')).toBeVisible()
    expect(await screen.findByText('Empathy')).toBeVisible()
    expect(await screen.findByText('Generosity')).toBeVisible()
    expect(await screen.findByText('Friendship')).toBeVisible()
  })

  it('builds a URL to query based on filters provided by window.location.search', async () => {
    delete window.location
    window.location = {
      search: filtersToQueryString(filters),
      state: {
        sortConfig: {
          sortBy: 'goalStatus',
          direction: 'asc',
          activePage: 1,
          offset: 0,
        },
      },
    }

    act(renderPrintGoals)

    // Expect that the mocked URL, which includes the filtered query was called.
    // This asserts that PrintGoals is respecting filters included in window.location.search.
    expect(fetchMock.called(filteredMockURL)).toBe(true)
  })

  it('uses the sortConfig from the location prop if it exists', async () => {
    const loc = {
      state: {
        sortConfig: {
          sortBy: 'goalStatus',
          direction: 'asc',
          activePage: 1,
          offset: 0,
        },
        selectedGoalIds: [4598],
      },
    }

    act(() => renderPrintGoals(loc))

    expect(fetchMock.called(filteredMockURLGoalOne)).toBe(true)
    expect(await screen.findByText('This is goal text 1.')).toBeVisible()
    expect(screen.queryByText('This is goal text 2.')).not.toBeInTheDocument()
  })
})
