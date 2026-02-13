import React from 'react'
import '@testing-library/jest-dom'
import { SCOPE_IDS } from '@ttahub/common'
import fetchMock from 'fetch-mock'
import join from 'url-join'
import { screen, render, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { mockRSSData, mockWindowProperty, mockDocumentProperty } from '../../testHelpers'

const mockBuildInfo = {
  branch: 'main',
  commit: 'abcdef12345',
  buildNumber: '123',
  timestamp: '2024-11-13 12:34:56',
}

describe('HeaderUserMenu', () => {
  const user = { name: 'harry potter', permissions: [] }
  const adminUser = {
    name: 'harry potter',
    permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }],
  }
  const userUrl = join('api', 'user')
  const logoutUrl = join('api', 'logout')
  const cleanupUrl = join('api', 'activity-reports', 'storage-cleanup')
  const feedUrl = join('api', 'feeds', 'whats-new')
  const groupsUrl = join('api', 'groups')
  const buildInfoUrl = '/api/admin/buildInfo' // Add build info URL here

  const before = async (admin = false) => {
    if (admin) {
      fetchMock.get(userUrl, { ...adminUser })
    } else {
      fetchMock.get(userUrl, { ...user })
    }

    fetchMock.get(logoutUrl, 200)
    fetchMock.get(cleanupUrl, [])
    fetchMock.get(feedUrl, mockRSSData())
    fetchMock.get(groupsUrl, [])
    fetchMock.get(buildInfoUrl, mockBuildInfo) // Mock build info response

    render(<App />)

    // Use BrowserRouter to go to the home page '/'.
    // This is necessary because the 404 hides the avatar (as it should).
    window.history.pushState({}, 'Home page', '/')

    await screen.findByText('Office of Head Start TTA Hub')
    fireEvent.click(screen.getByTestId('header-avatar'))
  }

  mockDocumentProperty('documentElement', {
    scrollTo: jest.fn(),
  })

  describe('when authenticated', () => {
    describe('as non-admin user', () => {
      beforeEach(async () => before())
      afterEach(() => fetchMock.restore())

      it('displays the logout button', async () => {
        const logoutLink = screen.getByRole('link', { name: 'Log out' })
        expect(logoutLink).toBeVisible()
      })
    })

    describe('as admin user', () => {
      beforeEach(async () => before(true))
      afterEach(() => fetchMock.restore())

      it('displays the admin button', async () => {
        const adminLink = screen.getByRole('link', { name: 'Admin' })
        expect(adminLink).toBeVisible()
      })

      describe('as admin user doing an impersonation', () => {
        const setItem = jest.fn()
        const getItem = jest.fn(() => true)
        const removeItem = jest.fn()

        jest.mock('../../hooks/helpers', () => ({
          storageAvailable: jest.fn(() => true),
        }))

        mockWindowProperty('sessionStorage', {
          setItem,
          getItem,
          removeItem,
        })

        afterAll(() => jest.restoreAllMocks())

        it('displays the admin button', async () => {
          const btn = await screen.findByRole('button', { name: /stop impersonating/i })
          expect(btn).toBeVisible()
          userEvent.click(btn)
          expect(removeItem).toHaveBeenCalled()
        })
      })
    })

    describe('when navigating', () => {
      beforeEach(async () => before(true))
      afterEach(() => fetchMock.restore())

      it('closes', async () => {
        const adminLink = screen.getByRole('link', { name: 'Admin' })
        expect(adminLink).toBeVisible()
        fireEvent.click(adminLink)
        expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
      })
    })

    describe('logout button', () => {
      beforeEach(async () => before())
      afterEach(() => fetchMock.restore())

      it('points to the RP-initiated logout endpoint', () => {
        const logoutLink = screen.getByRole('link', { name: /log out/i })
        expect(logoutLink).toHaveAttribute('href', '/api/logout-oidc')

        expect(logoutLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
        expect(logoutLink).not.toHaveAttribute('data-router-link')
      })
    })
  })

  describe('when unauthenticated', () => {
    beforeEach(async () => {
      fetchMock.get(userUrl, 401)
      fetchMock.get(buildInfoUrl, mockBuildInfo) // Ensure buildInfo mock exists here too
      render(<App />)
      await screen.findByText('Office of Head Start TTA Hub')
    })
    afterEach(() => fetchMock.restore())

    it("doesn't show the user menu", async () => {
      // item with testid 'header-avatar' is not on the dom
      expect(screen.queryByTestId('header-avatar')).toBeNull()
    })
  })
})
