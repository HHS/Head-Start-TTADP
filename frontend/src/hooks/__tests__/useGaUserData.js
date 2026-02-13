import { renderHook } from '@testing-library/react-hooks'
import useGaUserData from '../useGaUserData'

describe('useGaUserData', () => {
  beforeEach(() => {
    window.dataLayer = []
  })

  afterEach(() => {
    delete window.dataLayer
  })

  test('should not push event to dataLayer if user is falsy', () => {
    const user = null

    renderHook(() => useGaUserData(user))

    expect(window.dataLayer).toHaveLength(0)
  })

  test('should not push event to dataLayer if userData event already exists', () => {
    const user = { id: '123', roles: [{ fullName: 'admin' }] }
    window.dataLayer.push({ event: 'userData' })

    renderHook(() => useGaUserData(user))

    expect(window.dataLayer).toHaveLength(1)
    expect(window.dataLayer[0].event).toBe('userData')
  })

  test('should not push event to dataLayer if user id or roles are missing', () => {
    const user = { homeRegionId: '123' }

    renderHook(() => useGaUserData(user))

    expect(window.dataLayer).toHaveLength(0)
  })

  test('should push event to dataLayer with correct user data', () => {
    const user = { homeRegionId: '123', roles: [{ fullName: 'admin' }] }

    renderHook(() => useGaUserData(user))
    expect(window.dataLayer).toHaveLength(1)
    expect(window.dataLayer[0].event).toBe('userData')
    expect(window.dataLayer[0].region_id).toBe('123')
    expect(window.dataLayer[0].user_roles).toEqual(['admin'])
  })

  test('handles an error in the pushing', () => {
    const user = { homeRegionId: '123', roles: [{ fullName: 'admin' }] }
    window.dataLayer.push = jest.fn(() => {
      throw new Error('error')
    })

    renderHook(() => useGaUserData(user))
    expect(window.dataLayer).toHaveLength(0)
  })
})
