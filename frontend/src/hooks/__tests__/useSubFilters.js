import { renderHook } from '@testing-library/react-hooks'
import useSubFilters from '../useSubFilters'

describe('useSubFilters', () => {
  it('should return all filters if no allowedFilters are provided', () => {
    const filters = [{ topic: 'region' }, { topic: 'startDate' }, { topic: 'endDate' }]
    const filterConfig = [{ id: 'region' }, { id: 'startDate' }, { id: 'endDate' }]
    const { result } = renderHook(() => useSubFilters(filters, filterConfig))

    expect(result.current.subFilters).toEqual(filters)
    expect(result.current.filteredFilterConfig).toEqual(filterConfig)
  })

  it('should return all filters if allowedFilters is empty', () => {
    const filters = [{ topic: 'region' }, { topic: 'startDate' }, { topic: 'endDate' }]
    const filterConfig = [{ id: 'region' }, { id: 'startDate' }, { id: 'endDate' }]
    const { result } = renderHook(() => useSubFilters(filters, filterConfig, []))

    expect(result.current.subFilters).toEqual(filters)
    expect(result.current.filteredFilterConfig).toEqual(filterConfig)
  })

  it('should filter out filters not in allowedFilters', () => {
    const filters = [{ topic: 'region' }, { topic: 'startDate' }, { topic: 'endDate' }]
    const filterConfig = [{ id: 'region' }, { id: 'startDate' }, { id: 'endDate' }]
    const allowedFilters = ['region', 'startDate']
    const { result } = renderHook(() => useSubFilters(filters, filterConfig, allowedFilters))

    expect(result.current.subFilters).toEqual([{ topic: 'region' }, { topic: 'startDate' }])
    expect(result.current.filteredFilterConfig).toEqual([{ id: 'region' }, { id: 'startDate' }])
  })

  it('should update subFilters when filters change', () => {
    const filters = [{ topic: 'region' }, { topic: 'startDate' }, { topic: 'endDate' }]
    const filterConfig = [{ id: 'region' }, { id: 'startDate' }, { id: 'endDate' }]
    const allowedFilters = ['region', 'startDate']
    const { result, rerender } = renderHook(() => useSubFilters(filters, filterConfig, allowedFilters))

    expect(result.current.subFilters).toEqual([{ topic: 'region' }, { topic: 'startDate' }])
    expect(result.current.filteredFilterConfig).toEqual([{ id: 'region' }, { id: 'startDate' }])

    rerender({
      filters: [{ topic: 'region' }, { topic: 'startDate' }],
      filterConfig,
      allowedFilters,
    })

    expect(result.current.subFilters).toEqual([{ topic: 'region' }, { topic: 'startDate' }])
  })
})
