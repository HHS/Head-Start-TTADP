import '@testing-library/jest-dom'
import { renderHook } from '@testing-library/react-hooks'
import usePossibleGrants from '../usePossibleGrants'

describe('usePossibleGrants', () => {
  it('handles falsy or missing recipient.grants', async () => {
    const { result } = renderHook(() => usePossibleGrants({ id: 1 }))
    expect(result.current).toEqual([])
  })

  it('handles active grants', async () => {
    const { result } = renderHook(() => usePossibleGrants({ id: 1, grants: [{ id: 1, status: 'Active' }] }))
    expect(result.current).toEqual([{ id: 1, status: 'Active' }])
  })

  it('filters inactive grants', async () => {
    const { result } = renderHook(() =>
      usePossibleGrants({
        id: 1,
        grants: [
          { id: 1, status: 'Active' },
          { id: 2, status: 'Inactive' },
        ],
      })
    )
    expect(result.current).toEqual([{ id: 1, status: 'Active' }])
  })
})
