import React from 'react'
import { render, screen } from '@testing-library/react'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router'
import RttapaUpdates from '../RttapaUpdates'

describe('RttapaUpdates', () => {
  const DEFAULT_LOGS = [
    {
      id: 1,
      data: {
        communicationDate: '2022-01-01',
        purpose: 'RTTAPA updates',
        result: 'Success',
      },
    },
    {
      id: 2,
      data: {
        communicationDate: '2022-01-02',
        purpose: 'RTTAPA initial plan / new recipient',
        result: 'Failure',
      },
    },
    {
      id: 3,
      data: {},
    },
    {
      id: 4,
    },
  ]

  const history = createMemoryHistory()

  const renderTest = (logs = DEFAULT_LOGS) =>
    render(
      <Router history={history}>
        <RttapaUpdates regionId={1} recipientId={1} logs={logs} />
      </Router>
    )

  test('renders the widget heading', async () => {
    renderTest()
    expect(await screen.findByRole('heading', { name: 'RTTAPA updates' })).toBeInTheDocument()
  })

  test('renders the "View all communications" link', () => {
    renderTest()
    expect(screen.getByText('View all communications')).toBeInTheDocument()
  })

  test('renders the table with logs', () => {
    renderTest()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Purpose')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
    expect(screen.getByText('2022-01-01')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'RTTAPA updates' })).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('2022-01-02')).toBeInTheDocument()
    expect(screen.getByText('RTTAPA initial plan / new recipient')).toBeInTheDocument()
    expect(screen.getByText('Failure')).toBeInTheDocument()
  })

  test('renders the no logs message', () => {
    renderTest([])
    expect(
      screen.getByText('There are no communication logs with a purpose of “RTTAPA updates” or “RTTAPA initial plan / new recipient”.')
    ).toBeInTheDocument()
  })
})
