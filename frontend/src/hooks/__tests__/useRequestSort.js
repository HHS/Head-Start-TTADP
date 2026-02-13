import { renderHook, act } from '@testing-library/react-hooks'
import useRequestSort from '../useRequestSort'

describe('useRequestSort', () => {
  it('toggles sort direction from desc to asc when clicking same column', () => {
    const mockSetSortConfig = jest.fn()

    const { result } = renderHook(() => useRequestSort(mockSetSortConfig))

    act(() => {
      result.current('name')
    })

    expect(mockSetSortConfig).toHaveBeenCalledWith(expect.any(Function))

    // Call the callback function that was passed to setSortConfig
    const callbackFn = mockSetSortConfig.mock.calls[0][0]
    const previousConfig = { sortBy: 'name', direction: 'desc' }

    act(() => {
      callbackFn(previousConfig)
    })

    // When clicking the same column with desc direction, it should toggle to asc
    expect(mockSetSortConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'name',
        direction: 'asc',
      })
    )
  })

  it('sets direction to desc when clicking different column', () => {
    const mockSetSortConfig = jest.fn()

    const { result } = renderHook(() => useRequestSort(mockSetSortConfig))

    act(() => {
      result.current('date')
    })

    expect(mockSetSortConfig).toHaveBeenCalledWith(expect.any(Function))

    // Call the callback function that was passed to setSortConfig
    const callbackFn = mockSetSortConfig.mock.calls[0][0]
    const previousConfig = { sortBy: 'name', direction: 'asc' }

    act(() => {
      callbackFn(previousConfig)
    })

    // When clicking a different column, direction should be desc
    expect(mockSetSortConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'date',
        direction: 'desc',
      })
    )
  })

  it('keeps desc direction when clicking same column with asc', () => {
    const mockSetSortConfig = jest.fn()

    const { result } = renderHook(() => useRequestSort(mockSetSortConfig))

    act(() => {
      result.current('name')
    })

    const callbackFn = mockSetSortConfig.mock.calls[0][0]
    const previousConfig = { sortBy: 'name', direction: 'asc' }

    act(() => {
      callbackFn(previousConfig)
    })

    // When clicking same column with asc direction, it should stay desc (not toggle)
    expect(mockSetSortConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'name',
        direction: 'desc',
      })
    )
  })
})
