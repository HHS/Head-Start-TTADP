import { renderHook } from '@testing-library/react-hooks'
import { useLocation } from 'react-router-dom'
import useGaPageView, { CONTENT_GROUP_EVENT } from '../useGaPageView'

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}))

describe('useGaPageView', () => {
  beforeEach(() => {
    window.dataLayer = []
    useLocation.mockReturnValue({ pathname: '/test-path' })
  })

  afterEach(() => {
    delete window.dataLayer
    jest.clearAllMocks()
  })

  test('should push event to dataLayer with correct pathname', () => {
    renderHook(() => useGaPageView())

    expect(window.dataLayer).toHaveLength(1)
    expect(window.dataLayer[0].event).toBe(CONTENT_GROUP_EVENT)
    expect(window.dataLayer[0].content_group).toBe('/test-path')
  })

  test('should push new event when pathname changes', () => {
    const { rerender } = renderHook(() => useGaPageView())

    expect(window.dataLayer).toHaveLength(1)
    expect(window.dataLayer[0].content_group).toBe('/test-path')

    // Simulate pathname change
    useLocation.mockReturnValue({ pathname: '/new-path' })
    rerender()

    expect(window.dataLayer).toHaveLength(2)
    expect(window.dataLayer[1].event).toBe(CONTENT_GROUP_EVENT)
    expect(window.dataLayer[1].content_group).toBe('/new-path')
  })

  test('should not push event if dataLayer is missing', () => {
    delete window.dataLayer

    renderHook(() => useGaPageView())

    // Should not throw an error, just silently fail
    expect(window.dataLayer).toBeUndefined()
  })

  test('handles an error in the pushing', () => {
    window.dataLayer.push = jest.fn(() => {
      throw new Error('error')
    })

    renderHook(() => useGaPageView())

    // Should catch error and not crash
    expect(window.dataLayer.push).toHaveBeenCalled()
  })
})
