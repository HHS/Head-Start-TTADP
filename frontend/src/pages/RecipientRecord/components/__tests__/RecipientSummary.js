import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import RecipientSummary from '../RecipientSummary'

describe('RecipientSummary', () => {
  const renderRecipientSummary = (summary) => {
    render(
      <div data-testid="recipient-summary-container">
        <RecipientSummary summary={summary} regionId={12} />
      </div>
    )
  }

  it('renders the recipient summary appropriately', async () => {
    const summary = {
      recipientId: '44',
      uei: 'ABCDEFGHIJKL',
      recipientType: 'Frog Stuff',
      grants: [
        {
          number: 'asdfsjkfd',
          status: 'Froglike',
          endDate: '2021-09-28',
        },
      ],
    }
    renderRecipientSummary(summary)

    expect(screen.getByText(summary.uei)).toBeInTheDocument()
    expect(screen.getByText(/frog stuff/i)).toBeInTheDocument()
  })

  it('renders nothing when it receives nothing', async () => {
    const summary = ''
    renderRecipientSummary(summary)
    const container = screen.getByTestId('recipient-summary-container')
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when it receives no grants', async () => {
    const summary = {
      recipientId: '44',
    }
    renderRecipientSummary(summary)
    const container = screen.getByTestId('recipient-summary-container')
    expect(container.innerHTML).toBe('')
  })
})
