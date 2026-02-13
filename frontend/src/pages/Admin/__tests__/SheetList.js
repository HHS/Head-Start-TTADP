import React from 'react'
import { render, waitFor, screen, act } from '@testing-library/react'
import SheetList from '../SheetList'
import { getSheets } from '../../../fetchers/ss'

jest.mock('../../../fetchers/ss', () => ({
  getSheets: jest.fn(),
}))

describe('SheetList', () => {
  it('should render loading message initially', async () => {
    getSheets.mockResolvedValueOnce(null)

    await act(async () => {
      render(<SheetList />)
    })

    expect(screen.getByText('Loading sheets...')).toBeInTheDocument()
  })

  it('should render sheet list when data is fetched', async () => {
    const mockSheetData = {
      data: [
        { id: '1', name: 'Sheet 1' },
        { id: '2', name: 'Sheet 2' },
      ],
    }
    getSheets.mockResolvedValueOnce(mockSheetData)

    await act(async () => {
      render(<SheetList />)
    })

    await waitFor(() => {
      expect(screen.getByText('Sheet 1')).toBeInTheDocument()
      expect(screen.getByText('Sheet 2')).toBeInTheDocument()
    })
  })

  it('displays an error when fetching sheets fails', async () => {
    getSheets.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<SheetList onSelectSheet={() => {}} />)
    })

    expect(getSheets).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.queryByText('Error fetching sheets')).toBeInTheDocument()
    })
  })
})
