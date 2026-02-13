/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import moment from 'moment'
import reactSelectEvent from 'react-select-event'
import React from 'react'
import userEvent from '@testing-library/user-event'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { FormProvider, useForm } from 'react-hook-form'
import { REPORT_STATUSES } from '@ttahub/common'
import UserContext from '../../../../../UserContext'
import NetworkContext from '../../../../../NetworkContext'
import ReviewSubmit from '../index'
import AppLoadingContext from '../../../../../AppLoadingContext'

const availableApprovers = [
  { id: 1, name: 'approver 1' },
  { id: 2, name: 'approver 2' },
]

const reportCreator = {
  name: 'Walter Burns',
  role: ['Reporter'],
}

const user = {
  id: 1,
  name: 'test@test.com',
  permissions: [
    {
      scopeId: 3,
      regionId: 1,
    },
  ],
}

const approversToPass = [{ id: 1, status: null, user: { id: 1, fullName: 'approver 1' } }]

const RenderReview = ({
  // eslint-disable-next-line react/prop-types
  allComplete,
  formData,
  onSubmit,
  onReview,
  isApprover,
  isPendingApprover,
  pages,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goalsAndObjectives: [],
      ...formData,
    },
  })

  return (
    <FormProvider {...hookForm}>
      <ReviewSubmit
        allComplete={allComplete}
        onSubmit={onSubmit}
        reviewItems={[]}
        availableApprovers={availableApprovers}
        onReview={onReview}
        onSaveForm={() => {}}
        isApprover={isApprover}
        isPendingApprover={isPendingApprover}
        pages={pages}
        reportCreator={reportCreator}
        lastSaveTime={moment()}
      />
    </FormProvider>
  )
}

const completePages = [
  {
    label: 'label',
    state: 'Complete',
    review: false,
  },
]

const incompletePages = [
  {
    label: 'incomplete',
    state: 'In progress',
    review: false,
  },
]

const renderReview = (
  allComplete,
  isApprover = false,
  isPendingApprover = false,
  calculatedStatus = REPORT_STATUSES.DRAFT,
  formData = {
    userId: 1,
    additionalNotes: '',
    goalsAndObjectives: [],
  },
  onSubmit = jest.fn(),
  onReview = jest.fn(),
  onResetToDraft = jest.fn(),
  complete = true,
  approvers = null,
  activityReportCollaborators = []
) => {
  const history = createMemoryHistory()
  const pages = complete ? completePages : incompletePages
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        {/* eslint-disable-next-line max-len */}
        <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
          <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
            <RenderReview
              allComplete={allComplete}
              onSubmit={onSubmit}
              onResetToDraft={onResetToDraft}
              formData={{
                ...formData,
                calculatedStatus,
                submissionStatus: calculatedStatus,
                author: { name: 'user' },
                approvers,
                id: 1,
                displayId: '1',
                activityReportCollaborators,
              }}
              isApprover={isApprover}
              isPendingApprover={isPendingApprover}
              onReview={onReview}
              pages={pages}
            />
          </NetworkContext.Provider>
        </AppLoadingContext.Provider>
      </UserContext.Provider>
    </Router>
  )
  return history
}

const selectLabel = 'Approving manager *'

describe('ReviewSubmit', () => {
  describe('when the user is the approving manager', () => {
    it('shows the manager UI', async () => {
      const allComplete = true
      const isApprover = true
      const isPendingApprover = true
      const calculatedStatus = REPORT_STATUSES.SUBMITTED

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus)
      const header = await screen.findByText('Review and approve')
      expect(header).toBeVisible()
      expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Submit for approval' })).toBeNull()
    })

    it('allows creator to modify draft when also an approver', async () => {
      const allComplete = true
      const isApprover = true
      const isPendingApprover = true
      const calculatedStatus = REPORT_STATUSES.DRAFT

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus)
      const header = await screen.findByText(/review and submit/i)
      expect(header).toBeVisible()
      expect(screen.queryAllByRole('button', { name: 'Submit' }).length).toBe(0)
      expect(screen.queryByRole('button', { name: 'Submit for approval' })).toBeVisible()
    })

    it('allows collaborator to modify draft when also an approver', async () => {
      const allComplete = true
      const isApprover = true
      const isPendingApprover = true
      const calculatedStatus = REPORT_STATUSES.DRAFT

      renderReview(
        allComplete,
        isApprover,
        isPendingApprover,
        calculatedStatus,
        {
          userId: 2,
          additionalNotes: '',
          goalsAndObjectives: [],
        },
        jest.fn(),
        jest.fn(),
        jest.fn(),
        true,
        null,
        [{ userId: 1 }]
      )
      const header = await screen.findByText(/review and submit/i)
      expect(header).toBeVisible()
      expect(screen.queryAllByRole('button', { name: 'Submit' }).length).toBe(0)
      expect(screen.queryByRole('button', { name: 'Submit for approval' })).toBeVisible()
    })

    it('allows collaborator to modify draft when not an approver', async () => {
      const allComplete = true
      const isApprover = false
      const isPendingApprover = true
      const calculatedStatus = REPORT_STATUSES.DRAFT

      renderReview(
        allComplete,
        isApprover,
        isPendingApprover,
        calculatedStatus,
        {
          userId: 2,
          additionalNotes: '',
          goalsAndObjectives: [],
        },
        jest.fn(),
        jest.fn(),
        jest.fn(),
        true,
        null,
        [{ userId: 1 }]
      )
      const header = await screen.findByText(/review and submit/i)
      expect(header).toBeVisible()
      expect(screen.queryAllByRole('button', { name: 'Submit' }).length).toBe(0)
      expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeVisible()
    })

    it('allows collaborator to approve', async () => {
      const allComplete = true
      const isApprover = true
      const isPendingApprover = true
      const calculatedStatus = REPORT_STATUSES.SUBMITTED

      renderReview(
        allComplete,
        isApprover,
        isPendingApprover,
        calculatedStatus,
        {
          userId: 2,
          additionalNotes: '',
          goalsAndObjectives: [],
        },
        jest.fn(),
        jest.fn(),
        jest.fn(),
        true,
        null,
        [{ userId: 1 }]
      )
      const header = await screen.findByText('Review and approve')
      expect(header).toBeVisible()
      expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Submit for approval' })).toBeNull()
    })

    it('allows the approving manager to review the report', async () => {
      const allComplete = true
      const isApprover = true
      const isPendingApprover = true
      const calculatedStatus = REPORT_STATUSES.SUBMITTED
      const formData = { additionalNotes: '' }
      const onSubmit = jest.fn()
      const onReview = jest.fn()

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus, { ...formData, userId: 4 }, onSubmit, onReview)
      userEvent.selectOptions(document.querySelector('.usa-select'), ['approved'])
      const reviewButton = await screen.findByRole('button', { name: 'Submit' })
      userEvent.click(reviewButton)
      await waitFor(() => expect(onReview).toHaveBeenCalled())
    })

    it('the review button handles errors', async () => {
      const allComplete = true
      const isApprover = true
      const isPendingApprover = false
      const calculatedStatus = REPORT_STATUSES.SUBMITTED
      const formData = { additionalNotes: '' }
      const onSubmit = jest.fn()
      const onReview = jest.fn()

      onReview.mockImplementation(() => {
        throw new Error()
      })

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus, formData, onSubmit, onReview)
      userEvent.selectOptions(document.querySelector('.usa-select'), ['approved'])
      const reviewButton = await screen.findByRole('button', { name: 'Submit' })
      userEvent.click(reviewButton)
      const error = await screen.findByText('Unable to review report')
      expect(error).toBeVisible()
    })
  })

  describe('when the form is not complete', () => {
    it('an error message is shown when the report is submitted', async () => {
      const allComplete = false
      const isApprover = false
      const isPendingApprover = false

      renderReview(allComplete, isApprover, isPendingApprover)
      const button = await screen.findByRole('button', { name: 'Submit for approval' })
      userEvent.click(button)
      const error = await screen.findByTestId('errorMessage')
      expect(error).toBeVisible()
    })
  })

  describe('when the form is complete', () => {
    it('no modal is shown', async () => {
      const allComplete = true
      const isApprover = false

      renderReview(allComplete, isApprover)
      const alert = screen.queryByTestId('alert')
      expect(alert).toBeNull()
      await waitFor(() => expect(screen.getByLabelText(selectLabel)).toBeEnabled())
    })

    it('the submit button calls onSubmit', async () => {
      const allComplete = true
      const isApprover = false
      const isPendingApprover = false
      const calculatedStatus = REPORT_STATUSES.DRAFT
      const formData = { additionalNotes: '', goalsAndObjectives: [] }
      const onSubmit = jest.fn()
      const onReview = jest.fn()
      const onResetToDraft = jest.fn()
      const complete = true

      renderReview(
        allComplete,
        isApprover,
        isPendingApprover,
        calculatedStatus,
        formData,
        onSubmit,
        onReview,
        onResetToDraft,
        complete,
        approversToPass
      )
      const button = await screen.findByRole('button', { name: 'Submit for approval' })
      expect(button).toBeEnabled()
      userEvent.click(button)
      await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    })

    it('the submit button handles errors', async () => {
      const allComplete = true
      const isApprover = false
      const isPendingApprover = false
      const calculatedStatus = REPORT_STATUSES.DRAFT
      const formData = {}
      const onReview = jest.fn()
      const onResetToDraft = jest.fn()
      const complete = true

      const onSubmit = jest.fn()
      onSubmit.mockImplementation(() => {
        throw new Error()
      })

      renderReview(
        allComplete,
        isApprover,
        isPendingApprover,
        calculatedStatus,
        formData,
        onSubmit,
        onReview,
        onResetToDraft,
        complete,
        approversToPass
      )
      const button = await screen.findByRole('button', { name: 'Submit for approval' })
      expect(button).toBeEnabled()
      userEvent.click(button)
      const error = await screen.findByText('Unable to submit report')
      expect(error).toBeVisible()
    })
  })

  it('Once submitted, user is redirected', async () => {
    const allComplete = true
    const isApprover = false
    const isPendingApprover = false
    const calculatedStatus = REPORT_STATUSES.DRAFT
    const formData = {}
    const onSubmit = jest.fn()
    const onReview = jest.fn()
    const onResetToDraft = jest.fn()
    const complete = true

    const history = renderReview(
      allComplete,
      isApprover,
      isPendingApprover,
      calculatedStatus,
      formData,
      onSubmit,
      onReview,
      onResetToDraft,
      complete,
      approversToPass
    )
    userEvent.click(await screen.findByRole('button', { name: 'Submit for approval' }))
    await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'))
  })

  it('initializes the form with "initialData"', async () => {
    const allComplete = true
    const isApprover = false
    const isPendingApprover = false
    const calculatedStatus = REPORT_STATUSES.DRAFT

    renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus)
    const approver = screen.getByLabelText(/approving manager/i)
    reactSelectEvent.openMenu(approver)
    expect(await screen.findByText(/approver 1/i)).toBeVisible()
    expect(await screen.findByText(/approver 2/i)).toBeVisible()
  })
})
