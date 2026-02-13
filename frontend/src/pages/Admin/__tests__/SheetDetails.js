import React from 'react'
import { render, waitFor, screen, act } from '@testing-library/react'
import SheetDetails from '../SheetDetails'
import { getSheetById } from '../../../fetchers/ss'

jest.mock('../../../fetchers/ss', () => ({
  getSheetById: jest.fn(),
}))

describe('SheetDetails', () => {
  it('should render loading message initially', async () => {
    getSheetById.mockResolvedValueOnce(null)

    await act(async () => {
      render(<SheetDetails sheetId="1" />)
    })

    expect(screen.getByText('Sheet details will show here...')).toBeInTheDocument()
  })

  it('should render sheet details when data is fetched', async () => {
    const mockSheetData = {
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
    getSheetById.mockResolvedValueOnce(mockSheetData)

    await act(async () => {
      render(<SheetDetails sheetId="1" />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Sheet')).toBeInTheDocument()
      expect(screen.getByText('Column 1')).toBeInTheDocument()
      expect(screen.getByText('Column 2')).toBeInTheDocument()
      expect(screen.getByText('Value 1')).toBeInTheDocument()
      expect(screen.getByText('Value 2')).toBeInTheDocument()
    })
  })

  it('should handle error', async () => {
    getSheetById.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<SheetDetails sheetId="1" />)
    })

    await waitFor(() => {
      const errorText = screen.queryByText(/Error fetching sheet/)
      expect(errorText).toBeInTheDocument()
    })
  })
})
