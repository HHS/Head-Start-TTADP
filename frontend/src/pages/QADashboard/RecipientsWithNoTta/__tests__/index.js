import '@testing-library/jest-dom'
import React from 'react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import { SCOPE_IDS } from '@ttahub/common'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import RecipientsWithNoTta from '../index'
import UserContext from '../../../../UserContext'

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

const RecipientsWithNoTtaDataEmpty = [
  {
    data_set: 'no_tta_widget',
    records: '1',
    data: [
      {
        total: 0,
        'recipients without tta': 0,
        '% recipients without tta': 0,
      },
    ],
  },
  {
    data_set: 'no_tta_page',
    records: '0',
    data: [],
  },
]

const RecipientsWithNoTtaDataSSdi = [
  {
    data_set: 'no_tta_widget',
    records: '1',
    data: [
      {
        total: 1460,
        'recipients without tta': 794,
        '% recipients without tta': 54.38,
      },
    ],
  },
  {
    data_set: 'no_tta_page',
    records: '799',
    data: [
      {
        'recipient id': 1,
        'recipient name': 'Test Recipient 1',
        'last tta': '2021-09-01',
        'days since last tta': 90,
      },
      {
        'recipient id': 2,
        'recipient name': 'Test Recipient 2',
        'last tta': '2021-09-02',
        'days since last tta': 91,
      },
      {
        'recipient id': 3,
        'recipient name': 'Test Recipient 3',
        'last tta': '2021-09-03',
        'days since last tta': 92,
      },
    ],
  },
]

const renderRecipientsWithNoTta = (user = defaultUser) => {
  render(
    <UserContext.Provider value={{ user }}>
      <Router history={history}>
        <RecipientsWithNoTta />
      </Router>
    </UserContext.Provider>
  )
}

describe('Recipients With Ohs Standard Fei Goal', () => {
  afterEach(() => fetchMock.restore())

  it('renders correctly without data', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget&dataSetSelection[]=no_tta_page',
      RecipientsWithNoTtaDataEmpty
    )
    renderRecipientsWithNoTta()
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2)
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget&dataSetSelection[]=no_tta_page',
      RecipientsWithNoTtaDataSSdi
    )
    renderRecipientsWithNoTta()
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2)
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()

    await act(async () => {
      await waitFor(async () => {
        expect(screen.getByText(/test recipient 1/i)).toBeInTheDocument()
        expect(screen.getByText(/test recipient 2/i)).toBeInTheDocument()

        expect(screen.getByText(/date of last tta/i)).toBeInTheDocument()
        expect(screen.getByText(/days since last tta/i)).toBeInTheDocument()

        expect(screen.getByText('09/01/2021')).toBeInTheDocument()
        expect(screen.getByText('09/02/2021')).toBeInTheDocument()

        expect(screen.getByRole('cell', { name: /90/i })).toBeInTheDocument()
        expect(screen.getByRole('cell', { name: /91/i })).toBeInTheDocument()
      })
    })
  })

  it('handles a user with only one region', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=2&dataSetSelection[]=no_tta_widget&dataSetSelection[]=no_tta_page',
      RecipientsWithNoTtaDataSSdi
    )
    const u = {
      homeRegionId: 14,
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    }
    renderRecipientsWithNoTta(u)
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2)
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()
    const filters = await screen.findByRole('button', { name: /open filters for this page/i })

    act(() => {
      userEvent.click(filters)
    })

    const select = await screen.findByLabelText(/select a filter/i)

    // expect select not to have "region" as an option
    const option = select.querySelector('option[value="region"]')
    expect(option).toBeNull()
  })

  it('correctly handles an error on fetch', async () => {
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget&dataSetSelection[]=no_tta_page',
      500
    )
    renderRecipientsWithNoTta()
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2)
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()

    await act(async () => {
      await waitFor(async () => {
        expect(screen.getByText(/unable to fetch qa data/i)).toBeInTheDocument()
      })
    })
  })

  it('displays a dash when there is no date or days since last tta', async () => {
    const data = [
      {
        data_set: 'no_tta_widget',
        records: '1',
        data: [
          {
            total: 1,
            'recipients without tta': 1,
            '% recipients without tta': 100,
          },
        ],
      },
      {
        data_set: 'no_tta_page',
        records: '1',
        data: [
          {
            'recipient id': 1,
            'recipient name': 'Test Recipient 1',
            'last tta': null,
            'days since last tta': null,
          },
        ],
      },
    ]
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget&dataSetSelection[]=no_tta_page',
      data
    )
    renderRecipientsWithNoTta()
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2)
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()

    await act(async () => {
      await waitFor(async () => {
        expect(screen.getByText(/test recipient 1/i)).toBeInTheDocument()
        expect(screen.getByText(/date of last tta/i)).toBeInTheDocument()
        expect(screen.getByText(/days since last tta/i)).toBeInTheDocument()
        expect(screen.queryAllByText('-').length).toBe(2)
      })
    })
  })

  it('displays a dash when the last tta date is invalid or days since is negative', async () => {
    const data = [
      {
        data_set: 'no_tta_widget',
        records: '1',
        data: [
          {
            total: 1,
            'recipients without tta': 1,
            '% recipients without tta': 100,
          },
        ],
      },
      {
        data_set: 'no_tta_page',
        records: '1',
        data: [
          {
            'recipient id': 1,
            'recipient name': 'Test Recipient Invalid',
            'last tta': 'not-a-real-date',
            'days since last tta': -5,
          },
        ],
      },
    ]
    fetchMock.get(
      '/api/ssdi/api/dashboards/qa/no-tta.sql?region.in[]=1&region.in[]=2&dataSetSelection[]=no_tta_widget&dataSetSelection[]=no_tta_page',
      data
    )
    renderRecipientsWithNoTta()
    expect(screen.queryAllByText(/recipients with no tta/i).length).toBe(2)

    await act(async () => {
      await waitFor(async () => {
        expect(screen.getByText(/test recipient invalid/i)).toBeInTheDocument()
        expect(screen.queryAllByText('-').length).toBe(2)
      })
    })
  })
})
