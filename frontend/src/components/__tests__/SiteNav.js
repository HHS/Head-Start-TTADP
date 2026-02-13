import '@testing-library/jest-dom'
import React from 'react'
import join from 'url-join'
import { screen, render, act } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { MemoryRouter, Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { SCOPE_IDS } from '@ttahub/common'
import SiteNav from '../SiteNav'
import UserContext from '../../UserContext'

const history = createMemoryHistory()

describe('SiteNav', () => {
  describe('when authenticated & pathname = "activity-reports', () => {
    afterEach(() => fetchMock.restore())

    const logoutUrl = join('api', 'logout')
    const userUrl = join('api', 'user')

    beforeEach(() => {
      const user = {
        name: 'name',
        id: 1,
        flags: [],
        roles: [],
        permissions: [],
      }
      fetchMock.get(userUrl, { ...user })
      fetchMock.get(logoutUrl, 200)

      render(
        <Router history={history}>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated admin user={user} hasAlerts={false} />
          </UserContext.Provider>
        </Router>
      )
    })
    test('survey button is visible', async () => {
      history.push('/activity-reports')
      const surveyButton = await screen.findByText(/Please leave feedback/i)
      expect(surveyButton).toBeVisible()
    })
  })

  describe('when authenticated', () => {
    afterEach(() => fetchMock.restore())

    const userUrl = join('api', 'user')

    beforeEach(() => {
      const user = {
        // since I have no home region id, the `defaultRegion` falls back
        // to `regions.split(', ')[0] (or however else you want to implement this fix)
        homeRegionId: null,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 10,
          },
        ],
      }

      fetchMock.get(userUrl, { ...user, permissions: [] })

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated user={user} hasAlerts={false} />
          </UserContext.Provider>
        </MemoryRouter>
      )
    })

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0)
    })
    test('has no home region', async () => {
      // this verifies `hasMultipleRegions` works as expected
      // because the heading is `Region` and not `Regions`, as we
      // only have one region.
      expect(await screen.findByText('Region 10')).toBeVisible()
    })
  })

  describe('when unauthenticated', () => {
    beforeEach(() => {
      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user: {}, authenticated: false, logout: () => {} }}>
            <SiteNav authenticated={false} hasAlerts={false} />
          </UserContext.Provider>
        </MemoryRouter>
      )
    })

    test('nav items are not visible', () => {
      expect(screen.queryAllByRole('link').length).toBe(1)
    })
  })

  describe('when authenticated & hasAlerts && no header', () => {
    afterEach(() => fetchMock.restore())

    const userUrl = join('api', 'user')

    beforeEach(() => {
      const user = { name: 'name' }
      fetchMock.get(userUrl, { ...user, permissions: [] })

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <SiteNav authenticated user={user} hasAlerts />
          </UserContext.Provider>
        </MemoryRouter>
      )
    })

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0)
    })
  })

  describe('when authenticated & hasAlerts && a header', () => {
    afterEach(() => fetchMock.restore())

    const userUrl = join('api', 'user')

    beforeEach(() => {
      const user = { name: 'name', permissions: [] }
      fetchMock.get(userUrl, { ...user })

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <header className="smart-hub-header.has-alerts">
              <SiteNav authenticated user={user} hasAlerts />
            </header>
          </UserContext.Provider>
        </MemoryRouter>
      )
    })

    test('nav items are visible', () => {
      expect(screen.queryAllByRole('link').length).not.toBe(0)
    })
  })

  describe('site nav label', () => {
    afterEach(() => fetchMock.restore())

    const userUrl = join('api', 'user')

    const renderSiteNav = (u) => {
      const user = { ...u, name: 'name' }
      fetchMock.get(userUrl, { ...user })

      render(
        <MemoryRouter>
          <UserContext.Provider value={{ user, authenticated: true, logout: () => {} }}>
            <header className="smart-hub-header.has-alerts">
              <SiteNav authenticated user={user} hasAlerts />
            </header>
          </UserContext.Provider>
        </MemoryRouter>
      )
    }

    test('has multiple regions', async () => {
      const user = {
        homeRegionId: 1,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 2,
          },
        ],
      }

      act(() => {
        renderSiteNav(user)
      })

      expect(await screen.findByText('Regions 1, 2')).toBeVisible()
    })

    test('has sinle region', async () => {
      const user = {
        homeRegionId: 1,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      }

      act(() => {
        renderSiteNav(user)
      })

      expect(await screen.findByText('Region 1')).toBeVisible()
    })

    test('is central office', async () => {
      const user = {
        homeRegionId: 14,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 2,
          },
        ],
      }

      act(() => {
        renderSiteNav(user)
      })

      expect(await screen.findByText('All Regions')).toBeVisible()
    })
  })
})
