import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import NewVersionAvailable from '../NewVersionAvailable'

const renderNewVersionAvailable = () =>
  render(
    <MemoryRouter>
      <NewVersionAvailable />
    </MemoryRouter>
  )

describe('NewVersionAvailable component', () => {
  it('renders the new version available message', async () => {
    renderNewVersionAvailable()

    expect(screen.getByRole('heading', { name: /new version available/i })).toBeInTheDocument()
    expect(screen.getByText(/A newer version of this report is available or its status has changed./i)).toBeInTheDocument()
    expect(screen.getByText(/Go back to/i)).toBeInTheDocument()
    expect(screen.getByText(/Activity Reports/i)).toBeInTheDocument()
  })

  it('includes a link to activity reports', async () => {
    renderNewVersionAvailable()

    const link = screen.getByText('Activity Reports')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/activity-reports')
  })
})
