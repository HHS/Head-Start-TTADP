import '@testing-library/jest-dom'
import React from 'react'
import moment from 'moment'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { GOAL_STATUS } from '@ttahub/common/src/constants'
import RecipientsWithClassScoresAndGoalsWidget from '../RecipientsWithClassScoresAndGoalsWidget'
import UserContext from '../../UserContext'

const recipientData = {
  widgetData: {
    '% recipients with class': 18.26,
    'grants with class': 346,
    'recipients with class': 283,
    total: 1550,
  },
  pageData: [
    {
      id: 1,
      name: 'Action for Boston Community Development, Inc.',
      lastARStartDate: '01/02/2021',
      emotionalSupport: 6.043,
      classroomOrganization: 5.043,
      instructionalSupport: 4.043,
      reportDeliveryDate: '03/01/2022',
      goals: [
        {
          goalNumber: 'G-45641',
          status: GOAL_STATUS.IN_PROGRESS,
          creator: 'John Doe',
          collaborator: 'Jane Doe',
        },
        {
          goalNumber: 'G-25858',
          status: GOAL_STATUS.SUSPENDED,
          creator: 'Bill Smith',
          collaborator: 'Bob Jones',
        },
      ],
    },
  ],
}

const renderRecipientsWithClassScoresAndGoalsWidget = (data) => {
  const history = createMemoryHistory()
  render(
    <UserContext.Provider value={{ user: { id: 1 } }}>
      <Router history={history}>
        <RecipientsWithClassScoresAndGoalsWidget data={data} loading={false} />
      </Router>
    </UserContext.Provider>
  )
}

describe('Recipients With Class and Scores and Goals Widget', () => {
  it('renders correctly without data', async () => {
    const emptyData = {
      widgetData: {
        '% recipients with class': 0,
        'grants with class': 0,
        'recipients with class': 0,
        total: 0,
      },
      pageData: [],
    }
    renderRecipientsWithClassScoresAndGoalsWidget(emptyData)

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument()
    expect(screen.getByText(/0-0 of 0/i)).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    renderRecipientsWithClassScoresAndGoalsWidget(recipientData)

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument()
    expect(screen.getByText(/1-1 of 1/i)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].name)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].lastARStartDate)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].emotionalSupport)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].classroomOrganization)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].instructionalSupport)).toBeInTheDocument()
    expect(screen.getByText('03/01/2022')).toBeInTheDocument()

    // Expand the goals.
    const goalsButton = screen.getByRole('button', { name: /view goals for recipient action for boston community development, inc\./i })
    expect(goalsButton).toBeInTheDocument()
    goalsButton.click()

    expect(screen.getByText(recipientData.pageData[0].goals[0].goalNumber)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[0].status)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[0].creator)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[0].collaborator)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[1].goalNumber)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[1].status)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[1].creator)).toBeInTheDocument()
    expect(screen.getByText(recipientData.pageData[0].goals[1].collaborator)).toBeInTheDocument()
  })

  it('updates the page when the per page limit is changed', async () => {
    const numberOfRecipients = 15
    const multipleRecipientData = {
      widgetData: {
        '% recipients with class': 18.26,
        'grants with class': 346,
        'recipients with class': 283,
        total: 1550,
      },
      pageData: Array.from({ length: numberOfRecipients }, (_, i) => ({
        ...recipientData.pageData[0],
        name: `recipient ${i + 1}`,
      })),
    }
    renderRecipientsWithClassScoresAndGoalsWidget(multipleRecipientData)

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument()
    expect(screen.getByText(/1-10 of 15/i)).toBeInTheDocument()

    // Make sure we see 'recipient 1' but we do NOT see 'recipient 15'.
    expect(screen.getByText('recipient 1')).toBeInTheDocument()
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument()

    // Click the perPage dropdown and select 25.
    const perPageDropdown = screen.getByRole('combobox', { name: /select recipients per page/i })
    userEvent.selectOptions(perPageDropdown, '25')
    expect(screen.getByText(/1-15 of 15/i)).toBeInTheDocument()
    expect(screen.getByText('recipient 1')).toBeInTheDocument()
    expect(screen.getByText('recipient 15')).toBeInTheDocument()
  })

  it('sorts the recipients by name', async () => {
    const numberOfRecipients = 15
    const multipleRecipientData = {
      widgetData: {
        '% recipients with class': 18.26,
        'grants with class': 346,
        'recipients with class': 283,
        total: 1550,
      },
      pageData: Array.from({ length: numberOfRecipients }, (_, i) => ({
        ...recipientData.pageData[0],
        name: `recipient ${i + 1}`,
      })),
    }

    renderRecipientsWithClassScoresAndGoalsWidget(multipleRecipientData)

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument()
    expect(screen.getByText(/1-10 of 15/i)).toBeInTheDocument()

    // Make sure we see 'Apple' but we do NOT see 'Zebra'.
    expect(screen.getByText('recipient 1')).toBeInTheDocument()
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument()

    // Click the sort button.
    const sortButton = screen.getByRole('combobox', { name: /sort by/i })
    userEvent.selectOptions(sortButton, 'name-desc')

    // Make sure we see 'Zebra' but we do NOT see 'Apple'.
    expect(screen.getByText('recipient 15')).toBeInTheDocument()
    expect(screen.queryByText('recipient 1')).not.toBeInTheDocument()
  })

  it('sorts the recipients by date', async () => {
    const numberOfRecipients = 15
    const multipleRecipientData = {
      widgetData: {
        '% recipients with class': 18.26,
        'grants with class': 346,
        'recipients with class': 283,
        total: 1550,
      },
      pageData: Array.from({ length: numberOfRecipients }, (_, i) => ({
        ...recipientData.pageData[0],
        name: `recipient ${i + 1}`,
        // Make the date of last TTA increment by 1 day for each recipient.
        lastARStartDate: moment(recipientData.pageData[0].lastARStartDate).add(i, 'days').format('MM/DD/YYYY'),
      })),
    }

    renderRecipientsWithClassScoresAndGoalsWidget(multipleRecipientData)

    expect(screen.getByText(/Recipients with CLASS® scores/i)).toBeInTheDocument()
    expect(screen.getByText(/1-10 of 15/i)).toBeInTheDocument()

    // Make sure we see 'Apple' but we do NOT see 'Zebra'.
    expect(screen.getByText('recipient 1')).toBeInTheDocument()
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument()

    // Click the sort button.
    const sortButton = screen.getByRole('combobox', { name: /sort by/i })
    userEvent.selectOptions(sortButton, 'lastARStartDate-desc')

    // Make sure we see 'Zebra' but we do NOT see 'Apple'.
    expect(screen.getByText('recipient 15')).toBeInTheDocument()
    expect(screen.queryByText('recipient 1')).not.toBeInTheDocument()

    // Click the sort button.
    userEvent.selectOptions(sortButton, 'lastARStartDate-asc')

    expect(screen.getByText('recipient 1')).toBeInTheDocument()
    expect(screen.queryByText('recipient 15')).not.toBeInTheDocument()
  })
})
