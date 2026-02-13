import React from 'react'
import { render, waitFor, screen, fireEvent, act } from '@testing-library/react'
import SS from '../SS'
import { getSheets, getSheetById } from '../../../fetchers/ss'

jest.mock('../../../fetchers/ss', () => ({
  getSheets: jest.fn(),
  getSheetById: jest.fn(),
}))

const mockSheetListData = {
  id: '1',
  name: 'Test Sheet',
  permalink: 'https://app.smartsheetgov.com/sheets/1',
}

describe('SS', () => {
  it('should render loading message initially', async () => {
    getSheets.mockResolvedValueOnce(null)
    await act(async () => {
      render(<SS />)
    })
    expect(screen.getByText('Loading sheets...')).toBeInTheDocument()
  })

  it('should render sheet list when data is fetched', async () => {
    getSheets.mockResolvedValueOnce({ data: [mockSheetListData] })
    await act(async () => {
      render(<SS />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Sheet')).toBeInTheDocument()
    })
  })
  it('should render sheet details when item is clicked', async () => {
    const mockSheetDetailData = {
      id: '1',
      name: 'Test Sheet',
      columns: [
        { id: 1, title: 'Column 1' },
        { id: 2, title: 'Column 2' },
      ],
      rows: [
        {
          cells: [
            { columnId: 1, value: 'Value 1' },
            { columnId: 2, value: 'Value 2' },
          ],
        },
      ],
    }
    getSheetById.mockResolvedValueOnce(mockSheetDetailData)
    getSheets.mockResolvedValueOnce({ data: [mockSheetListData] })
    await act(async () => {
      render(<SS />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Sheet')).toBeInTheDocument()
    })

    // Simulate a click on the item in the list
    fireEvent.click(screen.getByText('Test Sheet'))

    await waitFor(() => {
      expect(screen.getByText('Value 1')).toBeInTheDocument()
    })
  })
})
