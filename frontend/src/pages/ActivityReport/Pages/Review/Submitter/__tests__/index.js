/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { REPORT_STATUSES, SCOPE_IDS } from '@ttahub/common'
import userEvent from '@testing-library/user-event'
import selectEvent from 'react-select-event'
import React from 'react'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import { useForm, FormProvider } from 'react-hook-form'
import Submitter from '../index'
import NetworkContext from '../../../../../../NetworkContext'

import UserContext from '../../../../../../UserContext'

const defaultUser = {
  id: 1,
  name: 'Walter Burns',
  roles: [{ fullName: 'Reporter' }],
  permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS }],
}

const RenderSubmitter = ({
  // eslint-disable-next-line react/prop-types
  onFormSubmit,
  formData,
  pages,
  onResetToDraft,
  onSave,
}) => {
  const defaultValues = {
    ...formData,
    goalsAndObjectives: formData.goalsAndObjectives || [],
    approvers: formData.approvers || [],
    additionalNotes: formData.additionalNotes || '',
    activityRecipients: formData.activityRecipients || [],
  }

  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  })

  return (
    <FormProvider {...hookForm}>
      <Submitter
        pages={pages}
        onFormSubmit={onFormSubmit}
        onResetToDraft={onResetToDraft}
        onSaveForm={onSave}
        availableApprovers={[
          { name: 'test', id: 1 },
          { id: 2, name: 'Test2' },
          { id: 3, name: 'Test3' },
        ]}
        reviewItems={[]}
      >
        <div />
      </Submitter>
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
  calculatedStatus,
  onFormSubmit,
  complete = true,
  onSave = jest.fn(),
  resetToDraft = jest.fn(),
  approvers = [{ status: calculatedStatus, note: '', user: { fullName: 'name' } }],
  user = defaultUser,
  creatorRole = 'Reporter',
  hasIncompleteGoalPrompts = false,
  hasGrantsMissingMonitoring = false,
  goalsAndObjectives = [],
  additionalCitations = [],
  grantIds = [2],
  additionalObjectives = [],
  hasMultipleGrantsMissingMonitoring = false
) => {
  const formData = {
    approvers,
    calculatedStatus,
    displayId: 'R01-AR-23424',
    id: 1,
    creatorRole,
    regionId: 1,
  }

  if (hasIncompleteGoalPrompts) {
    formData.goalsAndObjectives = [
      {
        isCurated: true,
        prompts: [
          {
            title: 'FEI Goal',
          },
        ],
        goalIds: [1, 2],
      },
    ]
  }

  if (hasGrantsMissingMonitoring) {
    formData.activityRecipients = [
      {
        activityRecipientId: 1,
        name: 'recipient missing monitoring',
      },
      {
        activityRecipientId: 2,
        name: 'recipient with monitoring 2',
      },
    ]

    if (hasMultipleGrantsMissingMonitoring) {
      formData.activityRecipients.push({
        activityRecipientId: 3,
        name: 'recipient with monitoring 3',
      })
    }

    formData.goalsAndObjectives = [
      ...goalsAndObjectives,
      {
        isCurated: true,
        prompts: [
          {
            title: 'FEI Goal',
          },
        ],
        standard: 'Monitoring',
        objectives: [
          ...additionalObjectives,
          {
            id: 1,
            citations: [
              ...additionalCitations,
              {
                id: 1,
                text: 'citation 1',
                monitoringReferences: [
                  {
                    grantId: 2,
                  },
                ],
              },
            ],
          },
        ],
        goalIds: [1, 2],
        grantIds,
      },
    ]

    if (hasMultipleGrantsMissingMonitoring) {
      formData.goalsAndObjectives[0].grantIds.push(3)
    }
  }

  const history = createMemoryHistory()
  const pages = complete ? completePages : incompletePages
  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
          <RenderSubmitter onFormSubmit={onFormSubmit} formData={formData} onResetToDraft={resetToDraft} onSave={onSave} pages={pages} />
        </NetworkContext.Provider>
      </UserContext.Provider>
    </Router>
  )

  return history
}

describe('Submitter review page', () => {
  describe('when the report is a draft', () => {
    it('displays the draft review component', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => {})
      expect(await screen.findByText(/review and submit/i)).toBeVisible()
    })

    it('allows the author to submit for review', async () => {
      const mockSubmit = jest.fn()
      renderReview(REPORT_STATUSES.DRAFT, mockSubmit)
      const button = await screen.findByRole('button', { name: 'Submit for approval' })
      userEvent.click(button)
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    })

    it('displays an error if the report is not complete', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => {}, false)
      const alert = await screen.findByTestId('alert')
      expect(alert.textContent).toContain('Incomplete report')
    })

    it('shows pages that are not completed', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => {}, false)
      const alert = await screen.findByText('Incomplete report')
      expect(alert).toBeVisible()
    })

    it("shows an error that some grants don't have monitoring", async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        [],
        [
          {
            id: 1,
            text: 'additional citation',
            monitoringReferences: [
              {
                grantId: 1,
              },
            ],
          },
        ]
      )
      expect(await screen.findByText(/this grant does not have the standard monitoring goal/i)).toBeVisible()
      expect(await screen.findByText(/recipient missing monitoring/i)).toBeVisible()
    })

    it("shows an error if multiple grants don't have monitoring", async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        [],
        [
          {
            id: 1,
            text: 'additional citation',
            monitoringReferences: [
              {
                grantId: 1,
              },
            ],
          },
        ],
        [],
        [2, 3]
      )
      expect(await screen.findByText(/these grants do not have the standard monitoring goal/i)).toBeVisible()
      expect(await screen.findByText(/recipient missing monitoring/i)).toBeVisible()
    })

    it('shows an error if some of the grants are missing citations', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => {}, false, jest.fn(), jest.fn(), [], defaultUser, null, false, true, [], [], [1, 2])
      expect(await screen.findByText(/This grant does not have any of the citations selected/i)).toBeVisible()
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(1)
    })

    it('shows an error when more than one grant is missing citations', async () => {
      renderReview(REPORT_STATUSES.DRAFT, () => {}, false, jest.fn(), jest.fn(), [], defaultUser, null, false, true, [], [], [1, 2, 3], [], true)

      expect(await screen.findByText(/these grants do not have any of the citations selected/i)).toBeVisible()
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(1)
      // expect(true).toBe(false);
    })

    it('shows an error if some of the objectives are missing citations', async () => {
      const objectiveMissingCitation = [
        {
          id: 2,
          citations: [],
        },
      ]
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        [],
        [],
        [2],
        objectiveMissingCitation
      )
      expect(await screen.findByText(/This grant does not have any of the citations selected/i)).toBeVisible()
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(1)
      // expect(true).toBe(false);
    })

    it('shows an error if missing citations with multiple goals', async () => {
      const additionalGoals = [
        {
          isCurated: false,
          prompts: [],
          standard: 'normal',
          objectives: [
            {
              id: 1,
              citations: null,
            },
          ],
          goalIds: [3],
          grantIds: [3],
        },
      ]

      renderReview(REPORT_STATUSES.DRAFT, () => {}, false, jest.fn(), jest.fn(), [], defaultUser, null, false, true, additionalGoals, [], [1])
      expect(await screen.findByText(/This grant does not have any of the citations selected/i)).toBeVisible()
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(1)
    })

    it('hides an error if some of the grants are missing citations', async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        [
          {
            isCurated: false,
            prompts: [
              {
                title: 'A regular goal',
              },
            ],
            objectives: [
              {
                id: 1,
                citations: null,
              },
            ],
            goalIds: [1],
          },
        ],
        [
          {
            id: 1,
            text: 'additional citation',
            monitoringReferences: [
              {
                grantId: 1,
              },
            ],
          },
        ]
      )
      expect(screen.queryAllByText(/This grant does not have any of the citations selected/i).length).toBe(0)
    })

    it("hides error that some grants don't have monitoring if we have more than one goal", async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        [
          {
            isCurated: false,
            prompts: [
              {
                title: 'A regular goal',
              },
            ],
            objectives: [
              {
                id: 1,
                citations: null,
              },
            ],
            goalIds: [1],
          },
        ],
        [
          {
            id: 1,
            text: 'additional citation',
            monitoringReferences: [
              {
                grantId: 1,
              },
            ],
          },
        ]
      )
      expect(screen.queryAllByText(/this grant does not have the standard monitoring goal/i).length).toBe(0)
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(0)
    })

    it('shows an error if goals are missing prompts', async () => {
      fetchMock.get('/api/goals/region/1/incomplete?goalIds=1&goalIds=2', [
        {
          id: 2,
          recipientId: 1,
          regionId: 1,
          recipientName: 'recipient1',
          grantNumber: 'grant1',
        },
        {
          id: 3,
          recipientId: 1,
          regionId: 1,
          recipientName: 'recipient1',
          grantNumber: 'grant1',
        },
      ])

      renderReview(REPORT_STATUSES.DRAFT, jest.fn(), false, jest.fn(), jest.fn(), [], defaultUser, null, true)

      const alert = await screen.findByText('Incomplete report')
      expect(alert).toBeVisible()

      expect(await screen.findByText(/some goals are incomplete/i)).toBeVisible()
      expect(await screen.findByText(/fei goal/i)).toBeVisible()
    })

    it('fails to submit if there are pages that have not been completed', async () => {
      const mockSubmit = jest.fn()
      renderReview(REPORT_STATUSES.DRAFT, mockSubmit, false)
      const button = await screen.findByRole('button', { name: 'Submit for approval' })
      userEvent.click(button)
      await waitFor(() => expect(mockSubmit).not.toHaveBeenCalled())
    })

    it('displays success if the report has been submitted', async () => {
      const mockSubmit = jest.fn()
      const history = renderReview(REPORT_STATUSES.DRAFT, mockSubmit, true)
      const button = await screen.findByRole('button', { name: 'Submit for approval' })

      userEvent.click(button)
      await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'))
    })

    it('can be saved', async () => {
      const mockSave = jest.fn()
      renderReview(REPORT_STATUSES.DRAFT, () => {}, true, mockSave)
      const button = await screen.findByRole('button', { name: 'Save Draft' })
      userEvent.click(button)
      await waitFor(() => expect(mockSave).toHaveBeenCalled())
    })
  })

  describe('when the report is approved', () => {
    it('displays the approved component', async () => {
      renderReview(REPORT_STATUSES.APPROVED, () => {})
      expect(await screen.findByText('Report approved')).toBeVisible()
    })
  })

  describe('when the report needs action', () => {
    it('displays the needs action component', async () => {
      renderReview(REPORT_STATUSES.NEEDS_ACTION, () => {})
      expect(await screen.findByText('Review and submit')).toBeVisible()
    })

    it('displays approvers requesting action', async () => {
      const approvers = [
        { status: REPORT_STATUSES.NEEDS_ACTION, note: 'Report needs action.', user: { fullName: 'Needs Action 1' } },
        { status: REPORT_STATUSES.APPROVED, note: 'Report is approved.', user: { fullName: 'Approved User' } },
        { status: REPORT_STATUSES.NEEDS_ACTION, note: 'Report needs action2.', user: { fullName: 'Needs Action 2' } },
      ]
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        () => {},
        true,
        () => {},
        () => {},
        approvers
      )
      expect(await screen.findByText('Review and submit')).toBeVisible()
      expect(
        screen.getByText(/the following approving manager\(s\) have requested changes to this activity report: needs action 1, needs action 2/i)
      ).toBeVisible()
    })

    it('displays correctly when no approver is requesting action', async () => {
      const approvers = [
        { status: null, note: 'Report is approved.', user: { fullName: 'Approved User 1' } },
        { status: null, note: 'Report is approved.', user: { fullName: 'Approved User 2' } },
      ]
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        () => {},
        true,
        () => {},
        () => {},
        approvers
      )
      expect(await screen.findByText(/the following approving manager\(s\) have requested changes to this activity report:/i)).toBeVisible()
    })

    it('fails to re-submit if there are pages that have not been completed', async () => {
      const mockSubmit = jest.fn()
      renderReview(REPORT_STATUSES.NEEDS_ACTION, mockSubmit, false)
      const button = await screen.findByRole('button', { name: /update/i })
      userEvent.click(button)
      await waitFor(() => expect(mockSubmit).not.toHaveBeenCalled())
    })

    it('allows the user to resubmit the report', async () => {
      const mockSubmit = jest.fn()
      renderReview(REPORT_STATUSES.NEEDS_ACTION, mockSubmit)
      const button = await screen.findByRole('button', { name: /update/i })
      userEvent.click(button)
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    })

    it('allows the user to add an approver', async () => {
      const approvers = [{ status: REPORT_STATUSES.NEEDS_ACTION, note: 'Report needs action.', user: { fullName: 'Needs Action 1' } }]
      const mockSubmit = jest.fn()
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        true,
        () => {},
        () => {},
        approvers
      )
      await selectEvent.select(document.querySelector('#approvers'), ['Test2', 'Test3'])
      const button = await screen.findByRole('button', { name: /update/i })
      userEvent.click(button)
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    })

    it('creator role auto populates on needs_action', async () => {
      const mockSubmit = jest.fn()
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        true,
        () => {},
        () => {},
        [],
        { ...defaultUser, roles: [{ fullName: 'COR' }] }
      )

      // Resubmit.
      const reSubmit = await screen.findByRole('button', { name: /update/i })
      userEvent.click(reSubmit)
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    })

    it('requires creator role on needs_action multiple roles', async () => {
      const mockSubmit = jest.fn()
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        true,
        () => {},
        () => {},
        [],
        { ...defaultUser, roles: [{ fullName: 'COR' }, { fullName: 'Health Specialist' }, { fullName: 'TTAC' }] },
        null
      )

      // Shows creator role.
      expect(await screen.findByText(/creator role/i)).toBeVisible()
      const roleSelector = await screen.findByLabelText(/creator role/i)

      // Resubmit without selecting creator roles shows validation error.
      const reSubmit = await screen.findByRole('button', { name: /update/i })
      userEvent.click(reSubmit)

      // Verify validation message.
      const validationError = await screen.findByText('Please select a creator role.')
      expect(validationError).toBeVisible()

      // Select creator role.
      expect(roleSelector.length).toBe(4)
      userEvent.selectOptions(roleSelector, 'COR')
      userEvent.selectOptions(roleSelector, 'Health Specialist')
      userEvent.selectOptions(roleSelector, 'TTAC')

      // Resubmit after setting creator role.
      expect(validationError).not.toBeVisible()
      userEvent.click(reSubmit)
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    })

    it('hides creator role on needs_action single role', async () => {
      const mockSubmit = jest.fn()
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        true,
        () => {},
        () => {},
        [],
        { ...defaultUser }
      )

      // Hides creator role.
      expect(screen.queryByRole('combobox', { name: /creator role/i })).toBeNull()

      // Resubmit without validation error.
      const reSubmit = await screen.findByRole('button', { name: /Update/i })
      userEvent.click(reSubmit)
      await waitFor(() => expect(mockSubmit).toHaveBeenCalled())
    })

    it('shows an error if some of the objectives are missing citations', async () => {
      const mockSubmit = jest.fn()
      const objectiveMissingCitation = [
        {
          id: 2,
          citations: [],
        },
      ]
      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        [],
        [],
        [2],
        objectiveMissingCitation
      )
      expect(await screen.findByText(/This grant does not have any of the citations selected/i)).toBeVisible()
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(1)

      // Get the 'Update report' button.
      const button = await screen.findByRole('button', { name: 'Update report' })
      userEvent.click(button)

      // Expect submit not to be called.
      await waitFor(() => expect(mockSubmit).not.toHaveBeenCalled())
    })

    it('shows an error if missing citations with multiple goals', async () => {
      const mockSubmit = jest.fn()
      const additionalGoals = [
        {
          isCurated: false,
          prompts: [],
          standard: 'normal',
          objectives: [
            {
              id: 1,
              citations: null,
            },
          ],
          goalIds: [3],
          grantIds: [3],
        },
      ]

      renderReview(
        REPORT_STATUSES.NEEDS_ACTION,
        mockSubmit,
        false,
        jest.fn(),
        jest.fn(),
        [],
        defaultUser,
        null,
        false,
        true,
        additionalGoals,
        [],
        [1]
      )
      expect(await screen.findByText(/This grant does not have any of the citations selected/i)).toBeVisible()
      expect(screen.queryAllByText(/recipient missing monitoring/i).length).toBe(1)

      // Get the 'Update report' button.
      const button = await screen.findByRole('button', { name: 'Update report' })
      userEvent.click(button)

      // Expect submit not to be called.
      await waitFor(() => expect(mockSubmit).not.toHaveBeenCalled())
    })
  })

  describe('creator role when report is draft', () => {
    it('hides with single role', async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        true,
        () => {},
        () => {},
        [],
        { ...defaultUser, roles: [{ fullName: 'Health Specialist' }] }
      )
      expect(screen.queryByRole('combobox', { name: /creator role */i })).toBeNull()
    })

    it('displays with multiple roles', async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        true,
        () => {},
        () => {},
        [],
        { ...defaultUser, roles: [{ fullName: 'COR' }, { fullName: 'Health Specialist' }, { fullName: 'TTAC' }] }
      )
      const roleSelector = await screen.findByRole('combobox', { name: /creator role */i })
      userEvent.selectOptions(roleSelector, 'COR')
      userEvent.selectOptions(roleSelector, 'Health Specialist')
      userEvent.selectOptions(roleSelector, 'TTAC')
      expect(roleSelector).toHaveValue('TTAC')
    })

    it('adds now missing role', async () => {
      renderReview(
        REPORT_STATUSES.DRAFT,
        () => {},
        true,
        () => {},
        () => {},
        [],
        { ...defaultUser, roles: [{ fullName: 'Health Specialist' }, { fullName: 'TTAC' }] },
        'COR'
      )
      const roleSelector = await screen.findByRole('combobox', { name: /creator role */i })
      expect(await screen.findByText(/cor/i)).toBeVisible()
      userEvent.selectOptions(roleSelector, 'COR')
      userEvent.selectOptions(roleSelector, 'Health Specialist')
      userEvent.selectOptions(roleSelector, 'TTAC')
      expect(roleSelector).toHaveValue('TTAC')
    })
  })
})
