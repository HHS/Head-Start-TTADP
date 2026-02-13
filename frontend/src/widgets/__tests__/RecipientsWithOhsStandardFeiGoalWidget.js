import '@testing-library/jest-dom'
import moment from 'moment'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import RecipientsWithOhsStandardFeiGoalWidget from '../RecipientsWithOhsStandardFeiGoalWidget'
import UserContext from '../../UserContext'
import { OBJECTIVE_STATUS } from '../../Constants'

const renderRecipientsWithOhsStandardFeiGoalWidget = (data) => {
  render(
    <UserContext.Provider value={{ user: {} }}>
      <RecipientsWithOhsStandardFeiGoalWidget data={data} loading={false} resetPagination={false} setResetPagination={() => {}} perPageNumber={10} />
    </UserContext.Provider>
  )
}

describe('Recipients with ohs standard fei goal widget', () => {
  it('renders correctly with null data', async () => {
    renderRecipientsWithOhsStandardFeiGoalWidget({})
    expect(screen.getByText(/recipients with/i)).toBeInTheDocument()
    expect(screen.getByText(/Root causes were identified through self-reported data/i)).toBeInTheDocument()
  })
  it('renders correctly without data', async () => {
    const emptyData = {
      headers: ['Recipient', 'Date of Last TTA', 'Days Since Last TTA'],
      RecipientsWithNoTta: [],
    }
    renderRecipientsWithOhsStandardFeiGoalWidget(emptyData)
    expect(screen.getByText(/recipients with/i)).toBeInTheDocument()
    expect(screen.getByText(/Root causes were identified through self-reported data./i)).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    const data = {
      widgetData: {
        total: 1550,
        '% recipients with fei': 55.35,
        'grants with fei': 1093,
        'recipients with fei': 858,
      },
      pageData: {
        headers: ['Goal created on', 'Goal number', 'Goal status', 'Root cause'],
        RecipientsWithOhsStandardFeiGoal: [
          {
            heading: 'Recipient 1',
            name: 'Test Recipient 1',
            recipient: 'Test Recipient 1',
            isUrl: true,
            hideLinkIcon: true,
            link: '/recipient-tta-records/376/region/1/profile',
            data: [
              {
                title: 'Goal_created_on',
                value: moment('2021-09-01').format('MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: 'G-20628',
              },
              {
                title: 'Goal_status',
                value: OBJECTIVE_STATUS.IN_PROGRESS,
              },
              {
                title: 'Root_cause',
                value: 'Community Partnership, Workforce',
              },
            ],
          },
          {
            heading: 'Test Recipient 2',
            name: 'Test Recipient 2',
            recipient: 'Test Recipient 2',
            isUrl: true,
            hideLinkIcon: true,
            link: '/recipient-tta-records/376/region/1/profile',
            data: [
              {
                title: 'Goal_created_on',
                value: moment('2021-09-02').format('MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: 'G-359813',
              },
              {
                title: 'Goal_status',
                value: GOAL_STATUS.NOT_STARTED,
              },
              {
                title: 'Root_cause',
                value: 'Testing',
              },
            ],
          },
          {
            heading: 'Test Recipient 3',
            name: 'Test Recipient 3',
            recipient: 'Test Recipient 3',
            isUrl: true,
            hideLinkIcon: true,
            link: '/recipient-tta-records/376/region/1/profile',
            data: [
              {
                title: 'Goal_created_on',
                value: moment('2021-09-03').format('MM/DD/YYYY'),
              },
              {
                title: 'Goal_number',
                value: 'G-457825',
              },
              {
                title: 'Goal_status',
                value: 'Unavailable',
              },
              {
                title: 'Root_cause',
                value: 'Facilities',
              },
            ],
          },
        ],
      },
    }
    renderRecipientsWithOhsStandardFeiGoalWidget(data)

    expect(screen.getByText(/recipients with/i)).toBeInTheDocument()
    expect(screen.getByText(/Root causes were identified through self-reported data./i)).toBeInTheDocument()
    expect(screen.getByText(/Recipient 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Recipient 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Recipient 3/i)).toBeInTheDocument()

    expect(screen.getByText('09/01/2021')).toBeInTheDocument()
    expect(screen.getByText('09/02/2021')).toBeInTheDocument()
    expect(screen.getByText('09/03/2021')).toBeInTheDocument()

    expect(screen.getByText(/G-20628/i)).toBeInTheDocument()
    expect(screen.getByText(/G-359813/i)).toBeInTheDocument()
    expect(screen.getByText(/G-457825/i)).toBeInTheDocument()

    expect(screen.getByText(/In progress/i)).toBeInTheDocument()
    expect(screen.getByText(/Not started/i)).toBeInTheDocument()
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument()

    expect(screen.getByText(/Community Partnership, Workforce/i)).toBeInTheDocument()
    expect(screen.getByText(/Testing/i)).toBeInTheDocument()
    expect(screen.getByText(/Facilities/i)).toBeInTheDocument()
  })
})
