/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { DashboardOverviewWidget } from '../DashboardOverview'

const baseData = {
  numReports: '5',
  numGrants: '2',
  numTotalGrants: '2',
  numParticipants: '10',
  sumDuration: '2,623.0',
  inPerson: '1.0',
}

const baseFields = ['Activity reports', 'Grants served', 'Participants', 'Hours of TTA', 'In person activities']

const renderDashboardOverview = ({ fields = baseFields, data = baseData, loading = false, showTooltips = false }) => {
  render(<DashboardOverviewWidget loading={loading} data={data} fields={fields || baseFields} showTooltips={showTooltips} />)
}

describe('Dashboard Overview Widget', () => {
  it('handles undefined data', async () => {
    renderDashboardOverview({ data: undefined })
    expect(screen.getByText('Activity reports')).toBeInTheDocument()
  })

  it('shows the correct data', async () => {
    renderDashboardOverview({ data: baseData })
    expect(screen.getByText(/5/i)).toBeInTheDocument()
    expect(screen.getByText(/activity reports/i)).toBeInTheDocument()
    expect(screen.getByText(/participants/i)).toBeInTheDocument()
    expect(screen.getByText(/10/i)).toBeInTheDocument()
    expect(screen.getByText(/2,623.0/i)).toBeInTheDocument()
    expect(screen.getByText(/hours of tta/i)).toBeInTheDocument()
    expect(screen.getByText(/in person activities/i)).toBeInTheDocument()
  })

  it('renders loading when loading', async () => {
    renderDashboardOverview({ loading: true })

    expect(await screen.findByText('Loading')).toBeInTheDocument()
  })

  it('shows the correct recipient label with 1 recipient', async () => {
    const data = {
      numRecipients: 1,
      recipientPercentage: '100%',
      totalRecipients: 1,
    }

    const fields = ['Recipients served']

    renderDashboardOverview({ data, fields })
    expect(screen.getByText(/1 recipient/i)).toBeInTheDocument()
  })

  it('shows the correct recipient label with multiple recipients', async () => {
    const data = {
      numRecipients: 2,
      recipientPercentage: '100%',
      totalRecipients: 2,
    }

    const fields = ['Recipients served']

    renderDashboardOverview({ data, fields })
    expect(screen.getByText(/2 recipients/i)).toBeInTheDocument()
  })

  it('shows tooltips', async () => {
    renderDashboardOverview({ showTooltips: true })
    expect(screen.getAllByTestId('tooltip')).toHaveLength(baseFields.length)
  })
})
