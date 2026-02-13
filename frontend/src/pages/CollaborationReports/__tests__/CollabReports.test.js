/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import CollabReports from '../components/CollabReports'
import { getReports, getAlerts } from '../../../fetchers/collaborationReports'
import AppLoadingContext from '../../../AppLoadingContext'
import { NOOP } from '../../../Constants'
import UserContext from '../../../UserContext'

jest.mock('../../../fetchers/collaborationReports')

describe('CollabReports', () => {
  const mockReports = [
    { id: 1, name: 'Report 1', regionId: 1 },
    { id: 2, name: 'Report 2', regionId: 1 },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderTest = (props) => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: NOOP }}>
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <CollabReports {...props} />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    )
  }

  test('Renders loading state and then reports table', async () => {
    getReports.mockResolvedValue({ count: 0, rows: mockReports })

    renderTest({ title: 'Test Title' })

    expect(screen.getByText('Test Title')).toBeInTheDocument()

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })
  })

  test('Renders empty message when no reports', async () => {
    getReports.mockResolvedValue({ count: 0, rows: [] })

    renderTest({ emptyMsg: 'No reports found' })

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled()
      expect(screen.getByText('No reports found')).toBeInTheDocument()
    })
  })

  test('Renders error alert on fetch failure', async () => {
    getReports.mockRejectedValue(new Error('Network error'))

    renderTest()

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to fetch reports')
    })
  })

  test('Passes showCreateMsgOnEmpty prop to table', async () => {
    getReports.mockResolvedValue({ count: 0, rows: [] })

    renderTest({ showCreateMsgOnEmpty: true })

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled()
      // The empty message should still be present
      expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument()
    })
  })

  test('Passes isAlerts prop to table', async () => {
    getAlerts.mockResolvedValue({ count: 0, rows: [] })

    renderTest({ isAlerts: true })

    await waitFor(() => {
      expect(getAlerts).toHaveBeenCalled()
      // The empty message should still be present
      expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument()
    })
  })
})
