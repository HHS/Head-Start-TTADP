import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FreqGraph } from '../FrequencyGraph'

const TEST_DATA = {
  topics: [
    {
      category: 'first category',
      count: 1,
    },
    {
      category: 'b',
      count: 2,
    },
    {
      category: 'c',
      count: 0,
    },
  ],
}

const renderFrequencyGraph = async () => render(<FreqGraph loading={false} data={TEST_DATA} />)

describe('Frequency Graph', () => {
  it('shows topics', async () => {
    renderFrequencyGraph()
    const topics = await screen.findByRole('heading', { name: /topics in activity reports/i })
    expect(topics).toBeInTheDocument()
  })

  it('can show accessible data', async () => {
    renderFrequencyGraph()
    const accessibleBtn = await screen.findByText('Display table')
    userEvent.click(accessibleBtn)
    expect(await screen.findByText('first category')).toBeInTheDocument()
  })

  it('can toggle back to graph view', async () => {
    renderFrequencyGraph()
    // First toggle to table view
    const tableBtn = await screen.findByText('Display table')
    userEvent.click(tableBtn)

    // Verify we're in table view first
    expect(screen.queryByRole('table')).toBeInTheDocument()

    // Then toggle back to graph view
    const graphBtn = await screen.findByText('Display graph')
    userEvent.click(graphBtn)

    // After toggling back to graph view, the table should no longer be visible
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
