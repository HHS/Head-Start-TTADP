import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { MemoryRouter } from 'react-router'
import AccountManagement from '..'
import UserContext from '../../../UserContext'
import AppLoadingContext from '../../../AppLoadingContext'

describe('AccountManagement', () => {
  const now = new Date()

  const normalUser = {
    name: 'user1',
    lastLogin: now,
    validationStatus: [{ type: 'email', validatedAt: now }],
    roles: [{ name: 'ECM' }, { name: 'GMS' }, { name: 'PS' }],
  }

  const keys = [
    'emailWhenAppointedCollaborator',
    'emailWhenChangeRequested',
    'emailWhenReportApproval',
    'emailWhenReportSubmittedForReview',
    'emailWhenRecipientReportApprovedProgramSpecialist',
  ]

  const vals = ['immediately', 'never', 'this month', 'this week', 'today']

  const unsub = keys.map((key) => ({ key, value: 'never' }))
  const sub = keys.map((key) => ({ key, value: 'immediately' }))
  const cust = keys.map((key, index) => ({ key, value: vals[index] }))

  const renderAM = (u) => {
    const user = u || normalUser

    render(
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <UserContext.Provider value={{ user }}>
            <AccountManagement updateUser={() => {}} />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </MemoryRouter>
    )
  }

  describe('email preferences', () => {
    it('should not show when the user is unverified', async () => {
      const unverifiedUser = {
        name: 'user1',
        lastLogin: now,
        validationStatus: [],
        roles: [],
      }
      renderAM(unverifiedUser)
      await screen.findByText('Account Management')
      expect(screen.queryByTestId('email-preferences-form')).toBeNull()
    })

    describe('unsubscribed', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', unsub)
        fetchMock.put('/api/settings/email/unsubscribe', 204)
        renderAM()
        await screen.findByText('Account Management')
      })

      afterEach(() => fetchMock.restore())

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-unsubscribe')
        expect(radio).toBeChecked()
      })

      it('save button hits unsubscribe endpoint', async () => {
        expect(fetchMock.calls().length).toBe(1)
        const button = screen.getByTestId('email-prefs-submit')

        await act(async () => {
          fireEvent.click(button)
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-success-message')
            expect(success).toBeVisible()
          })
        })

        expect(fetchMock.called('/api/settings/email/unsubscribe')).toBeTruthy()
        expect(fetchMock.calls().length).toBe(2)
      })
    })

    describe('renders correct role options', () => {
      it('shows correct options for approval', async () => {
        renderAM({ ...normalUser, roles: [{ name: 'ECM' }] })
        await screen.findByText('Account Management')
        await screen.findByText('Email preferences')
        expect(screen.queryByText('Someone submits an activity report for my approval.')).toBeInTheDocument()
        expect(screen.queryByText('A manager requests changes to an activity report that I created or collaborated on.')).toBeInTheDocument()
        expect(screen.queryByText('Managers approve an activity report that I created or collaborated on.')).toBeInTheDocument()
        expect(screen.queryByText("I'm added as a collaborator on an activity report.")).toBeInTheDocument()
        expect(screen.queryAllByText("One of my recipients' activity reports is available.").length).toBe(0)
      })

      it('shows correct options for collaborators', async () => {
        renderAM({ ...normalUser, roles: [{ name: 'FES' }] })
        await screen.findByText('Account Management')
        await screen.findByText('Email preferences')
        expect(screen.queryAllByText('Someone submits an activity report for my approval.').length).toBe(0)
        expect(screen.queryByText('A manager requests changes to an activity report that I created or collaborated on.')).toBeInTheDocument()
        expect(screen.queryByText('Managers approve an activity report that I created or collaborated on.')).toBeInTheDocument()
        expect(screen.queryByText("I'm added as a collaborator on an activity report.")).toBeInTheDocument()
        expect(screen.queryAllByText("One of my recipients' activity reports is available.").length).toBe(0)
      })

      it('shows correct options for recipients', async () => {
        renderAM({ ...normalUser, roles: [{ name: 'SPS' }] })
        await screen.findByText('Account Management')
        await screen.findByText('Email preferences')
        expect(screen.queryAllByText('Someone submits an activity report for my approval.').length).toBe(0)
        expect(screen.queryAllByText('A manager requests changes to an activity report that I created or collaborated on.').length).toBe(0)
        expect(screen.queryAllByText('Managers approve an activity report that I created or collaborated on.').length).toBe(0)
        expect(screen.queryAllByText("I'm added as a collaborator on an activity report.").length).toBe(0)
        expect(screen.queryByText("One of my recipients' activity reports is available.")).toBeInTheDocument()
      })

      it('hides all options with no roles', async () => {
        renderAM({ ...normalUser, roles: [] })
        await screen.findByText('Account Management')
        expect(await screen.queryAllByText('Email preferences').length).toBe(0)
        expect(screen.queryAllByText('Someone submits an activity report for my approval.').length).toBe(0)
        expect(screen.queryAllByText('A manager requests changes to an activity report that I created or collaborated on.').length).toBe(0)
        expect(screen.queryAllByText('Managers approve an activity report that I created or collaborated on.').length).toBe(0)
        expect(screen.queryAllByText("I'm added as a collaborator on an activity report.").length).toBe(0)
        expect(screen.queryAllByText("One of my recipients' activity reports is available.").length).toBe(0)
      })
    })

    describe('subscribed', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', sub)
        fetchMock.put('/api/settings/email/subscribe', 204)
        renderAM()
        await screen.findByText('Account Management')
      })

      afterEach(() => fetchMock.restore())

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-subscribe')
        expect(radio).toBeChecked()
      })

      it('save button hits subscribe endpoint', async () => {
        expect(fetchMock.calls().length).toBe(1)
        const button = screen.getByTestId('email-prefs-submit')

        await act(async () => {
          fireEvent.click(button)
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-success-message')
            expect(success).toBeVisible()
          })
        })

        expect(fetchMock.called('/api/settings/email/subscribe')).toBeTruthy()
        expect(fetchMock.calls().length).toBe(2)
      })
    })

    describe('custom', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', cust)
        fetchMock.put('/api/settings', 204)
        renderAM({ ...normalUser, roles: [{ name: 'ECM' }, { name: 'GMS' }] })
        await screen.findByText('Account Management')
      })

      afterEach(() => fetchMock.restore())

      it('radio button should be automatically selected', async () => {
        const radio = screen.getByTestId('radio-customized')
        expect(radio).toBeChecked()
      })

      it('dropdowns should have the right values', async () => {
        // for each key value pair of cust, expect the dropdown with
        // the data-testid that matches `${key}-dropdown` to have a value
        // that matches `${val}`
        cust.forEach((c) => {
          const dropdown = screen.getByTestId(`${c.key}-dropdown`)
          expect(dropdown).toHaveValue(c.value)
        })
      })

      it('save button hits updateSettings endpoint', async () => {
        expect(fetchMock.calls().length).toBe(1)
        const button = screen.getByTestId('email-prefs-submit')

        await act(async () => {
          fireEvent.click(button)
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-success-message')
            expect(success).toBeVisible()
          })
        })

        expect(fetchMock.called('/api/settings')).toBeTruthy()
        expect(fetchMock.calls().length).toBe(2)
      })
    })

    describe('failure', () => {
      beforeEach(async () => {
        fetchMock.get('/api/settings/email', cust)
        fetchMock.put('/api/settings', 400)
        renderAM()
        await screen.findByText('Account Management')
      })

      afterEach(() => fetchMock.restore())

      it('fetch failure shows error message', async () => {
        expect(fetchMock.calls().length).toBe(1)
        const button = screen.getByTestId('email-prefs-submit')

        await act(async () => {
          fireEvent.click(button)
          await waitFor(() => {
            const success = screen.getByTestId('email-prefs-save-fail-message')
            expect(success).toBeVisible()
          })
        })

        expect(fetchMock.called('/api/settings')).toBeTruthy()
        expect(fetchMock.calls().length).toBe(2)
      })
    })
  })
})
