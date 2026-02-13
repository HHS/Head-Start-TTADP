/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'
import React from 'react'
import MissingCitationAlerts from '../components/MissingCitationAlerts'

describe('PrintSummary', () => {
  let history

  beforeEach(() => {
    history = createMemoryHistory()
  })

  it('hides messages when both the grantsMissingMonitoring and  grantsMissingCitations are emtpy', () => {
    render(
      <Router history={history}>
        <MissingCitationAlerts reportId={1} grantsMissingMonitoring={[]} grantsMissingCitations={[]} />
      </Router>
    )

    expect(screen.queryByText('This grant does not have the standard monitoring goal:')).not.toBeInTheDocument()
    expect(screen.queryByText('These grants do not have the standard monitoring goal:')).not.toBeInTheDocument()

    expect(screen.queryByText('These grants do not have any of the citations selected:')).not.toBeInTheDocument()
    expect(screen.queryByText('These grants do not have the standard monitoring goal:')).not.toBeInTheDocument()
  })

  it('shows messages when grantsMissingMonitoring is not empty', () => {
    render(
      <Router history={history}>
        <MissingCitationAlerts reportId={1} grantsMissingMonitoring={['grant1']} grantsMissingCitations={[]} />
      </Router>
    )

    expect(screen.getByText(/This grant does not have the standard monitoring goal/i)).toBeInTheDocument()
    expect(screen.getByText('grant1')).toBeInTheDocument()
  })

  it('shows messages when grantsMissingCitations is not empty', () => {
    render(
      <Router history={history}>
        <MissingCitationAlerts reportId={1} grantsMissingMonitoring={[]} grantsMissingCitations={['grant2']} />
      </Router>
    )

    expect(screen.getByText(/This grant does not have any of the citations selected/i)).toBeVisible()
    expect(screen.getByText('grant2')).toBeInTheDocument()
  })
})
