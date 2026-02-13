import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import RecipientsWithNoTtaWidget from '../RecipientsWithNoTtaWidget'

const rendersRecipientsWithNoTta = (data) => {
  render(<RecipientsWithNoTtaWidget data={data} loading={false} resetPagination={false} setResetPagination={() => {}} perPageNumber={10} />)
}

describe('Recipients with no tta Widget', () => {
  it('renders correctly with  null data', async () => {
    rendersRecipientsWithNoTta({})
    expect(screen.getByText(/recipients with no tta/i)).toBeInTheDocument()
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()
  })
  it('renders correctly without data', async () => {
    const emptyData = {
      headers: ['Recipient', 'Date of Last TTA', 'Days Since Last TTA'],
      RecipientsWithNoTta: [],
    }
    rendersRecipientsWithNoTta(emptyData)
    expect(screen.getByText(/recipients with no tta/i)).toBeInTheDocument()
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()
  })

  it('renders correctly with data', async () => {
    const data = {
      widgetData: {
        total: 1460,
        'recipients without tta': 794,
        '% recipients without tta': 54.38,
      },
      pageData: {
        headers: ['Date of Last TTA', 'Days Since Last TTA'],
        RecipientsWithNoTta: [
          {
            heading: 'Test Recipient 1',
            name: 'Test Recipient 1',
            recipient: 'Test Recipient 1',
            isUrl: true,
            hideLinkIcon: true,
            link: '/recipient-tta-records/376/region/1/profile',
            data: [
              {
                title: 'Date of Last TTA',
                value: '2021-09-01',
              },
              {
                title: 'Days Since Last TTA',
                value: '90',
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
                title: 'Date of Last TTA',
                value: '2021-09-02',
              },
              {
                title: 'Days Since Last TTA',
                value: '91',
              },
            ],
          },
        ],
      },
    }
    rendersRecipientsWithNoTta(data)

    expect(screen.getByText(/recipients with no tta/i)).toBeInTheDocument()
    expect(screen.getByText(/Recipients without Activity Reports or Training Reports for more than 90 days./i)).toBeInTheDocument()
    expect(screen.getByText(/Recipient 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Recipient 2/i)).toBeInTheDocument()

    expect(screen.getByText(/2021-09-01/i)).toBeInTheDocument()
    expect(screen.getByText(/2021-09-02/i)).toBeInTheDocument()

    expect(screen.getByRole('cell', { name: /90/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /91/i })).toBeInTheDocument()
  })
})
