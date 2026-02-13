/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import NetworkContext from '../../../../NetworkContext'
import activitySummary, { isPageComplete, citationsDiffer, checkRecipientsAndGoals } from '../activitySummary'
import { getGoalTemplates } from '../../../../fetchers/goalTemplates'
import { fetchCitationsByGrant } from '../../../../fetchers/citations'

jest.mock('../../../../fetchers/goalTemplates')
jest.mock('../../../../fetchers/citations')

const RenderActivitySummary = ({
  passedGroups = null,
  passedGoals = [],
  recipientsOverride = null,
  formDataOverride = {},
  setShouldAutoSave = jest.fn(),
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: passedGoals,
      goalsAndObjectives: passedGoals,
      objectivesWithoutGoals: [],
      participants: [],
      activityRecipients: [],
      targetPopulations: [],
      activityReportCollaborators: [],
      activityReason: null,
      ...formDataOverride,
    },
  })

  const additionalData = {
    recipients: recipientsOverride || {
      grants: [
        {
          id: 1,
          name: 'Recipient A',
          grants: [{ name: 'Grant 1', activityRecipientId: 101, grantId: 201 }],
        },
        {
          id: 2,
          name: 'Recipient B',
          grants: [{ name: 'Grant 2', activityRecipientId: 102, grantId: 202 }],
        },
      ],
      otherEntities: [],
    },
    collaborators: [
      { id: 1, name: 'test', roles: [] },
      { id: 2, name: 'test2', roles: [] },
    ],
    availableApprovers: [],
    groups: passedGroups || [
      { id: 1, name: 'group 1' },
      { id: 2, name: 'group 2' },
    ],
  }

  const mockFormData = {
    regionId: 1,
    ...formDataOverride,
  }

  return (
    <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
      <FormProvider {...hookForm}>
        {activitySummary.render(
          additionalData,
          mockFormData, // formData (unused but required for signature)
          1, // reportId
          false, // isAppLoading
          jest.fn(),
          jest.fn(),
          jest.fn(),
          false,
          '',
          jest.fn(),
          () => (
            <></>
          ),
          setShouldAutoSave
        )}
      </FormProvider>
    </NetworkContext.Provider>
  )
}

const passedGoalsWithCitations = [
  {
    id: 1,
    name: '(monitoring) goal 1',
    standard: 'Monitoring',
    objectives: [
      {
        id: 1,
        title: 'objective 1',
        citations: [
          {
            id: 1,
            monitoringReferences: [
              {
                reportDeliveryDate: '2024-08-07T04:00:00+00:00',
              },
            ],
          },
        ],
      },
    ],
  },
]

describe('activity summary', () => {
  describe('duration validation', () => {
    it('shows an error for values < 0.5', async () => {
      const { container } = render(<RenderActivitySummary />)
      const input = container.querySelector('#duration')
      userEvent.type(input, '0')
      expect(await screen.findByText('Duration must be greater than 0 hours')).toBeInTheDocument()
    })

    it('shows an error for numbers > 99', async () => {
      const { container } = render(<RenderActivitySummary />)
      const input = container.querySelector('#duration')
      userEvent.type(input, '99.5')
      expect(await screen.findByText('Duration must be less than or equal to 99 hours')).toBeInTheDocument()
    })
  })

  describe('start date citations validation', () => {
    it('correctly displays the start date citations validation', async () => {
      const { container } = render(<RenderActivitySummary passedGoals={passedGoalsWithCitations} />)
      const input = container.querySelector('#startDate')
      userEvent.type(input, '01/01/2024')
      // trigger blur.
      userEvent.tab()
      expect(await screen.findByText('The date entered is not valid with the selected citations.')).toBeInTheDocument()
    })

    it('does not show the start date citations validation when the date is valid', async () => {
      const { container } = render(<RenderActivitySummary passedGoals={passedGoalsWithCitations} />)
      const input = container.querySelector('#startDate')
      userEvent.type(input, '08/08/2024')
      // trigger blur.
      userEvent.tab()
      expect(screen.queryByText('The date entered is not valid with the selected citations.')).not.toBeInTheDocument()
    })
  })

  describe('handleRecipientChange', () => {
    it('fetches goal templates, citations, and triggers modal when needed', async () => {
      getGoalTemplates.mockResolvedValue([{ id: 1, standard: 'Monitoring' }])
      fetchCitationsByGrant.mockResolvedValue([{ citation: 'ABC' }])

      const { findByText } = render(
        <RenderActivitySummary
          formDataOverride={{
            startDate: '08/01/2024',
            recipients: [
              {
                activityRecipientId: 101,
                grantNumber: 'Grant 1',
                grantId: 201,
                recipientId: 1,
                name: 'Recipient A',
              },
            ],
          }}
          passedGoals={passedGoalsWithCitations}
        />
      )

      const dropdowns = await screen.findAllByRole('combobox')
      const recipientDropdown = dropdowns[0]
      userEvent.click(recipientDropdown)
      const grantOption = await findByText('Recipient B')
      userEvent.click(grantOption)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('closes modal and resets state on confirm', async () => {
      getGoalTemplates.mockResolvedValue([{ id: 1, standard: 'Monitoring' }])
      fetchCitationsByGrant.mockResolvedValue([{ citation: 'ABC' }])
      const { findByText, findByRole } = render(
        <RenderActivitySummary
          formDataOverride={{
            startDate: '08/01/2024',
            recipients: [
              {
                activityRecipientId: 101,
                grantNumber: 'Grant 1',
                grantId: 201,
                recipientId: 1,
                name: 'Recipient A',
              },
            ],
          }}
          passedGoals={passedGoalsWithCitations}
        />
      )

      const dropdowns = await screen.findAllByRole('combobox')
      const recipientDropdown = dropdowns[0]
      userEvent.click(recipientDropdown)
      const option = await findByText('Recipient B')
      userEvent.click(option)

      const confirmBtn = await findByRole('button', { name: /change/i })
      userEvent.click(confirmBtn)

      // Modal should now be closed
      expect(screen.queryByText('change')).not.toBeInTheDocument()
    })
    it('reverts recipient and resets state on cancel', async () => {
      getGoalTemplates.mockResolvedValue([{ id: 1, standard: 'Monitoring' }])
      fetchCitationsByGrant.mockResolvedValue([{ citation: 'ABC' }])

      const { findByText, findByRole, queryByText } = render(
        <RenderActivitySummary
          formDataOverride={{
            startDate: '08/01/2024',
            recipients: [
              {
                id: 1,
                name: 'Recipient A',
                grants: [
                  {
                    activityRecipientId: 101,
                    name: 'Recipient A - Grant1 number - EHS',
                    number: 'Grant1 number',
                    programs: [],
                    recipient: {},
                  },
                ],
              },
              {
                id: 2,
                name: 'Recipient B',
                grants: [
                  {
                    activityRecipientId: 102,
                    name: 'Recipient B - Grant2 number - EHS',
                    number: 'Grant2 number',
                    programs: [],
                    recipient: {},
                  },
                ],
              },
            ],
            activityRecipients: [
              {
                activityRecipientId: 101,
                grantNumber: 'Grant 1',
                grantId: 201,
                recipientId: 1,
                recipientIdForLookUp: 1,
                name: 'Recipient A',
              },
            ],
          }}
          passedGoals={passedGoalsWithCitations}
        />
      )

      const dropdowns = await screen.findAllByRole('combobox')
      const recipientDropdown = dropdowns[0]
      userEvent.click(recipientDropdown)
      const option = await findByText('Recipient B')
      userEvent.click(option)

      const cancelBtn = await findByRole('button', { name: /cancel/i })
      userEvent.click(cancelBtn)

      // Wait for modal to disappear
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Verify that Recipient A is still selected
      await waitFor(() => {
        expect(screen.getByText('Recipient A')).toBeInTheDocument()
      })

      expect(queryByText('Recipient B')).not.toBeInTheDocument()
    })
  })
})

describe('ReviewSection', () => {
  it('should display both participant fields when deliveryMethod is hybrid', () => {
    // Create a wrapper component to use the hook
    const TestComponent = () => {
      const hookForm = useForm({
        mode: 'onChange',
        defaultValues: {
          deliveryMethod: 'hybrid',
          numberOfParticipants: 10,
          numberOfParticipantsVirtually: 15,
        },
      })

      return (
        <FormProvider {...hookForm}>
          <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
            <activitySummary.reviewSection />
          </NetworkContext.Provider>
        </FormProvider>
      )
    }

    render(<TestComponent />)

    expect(screen.getByText('Number of participants attending in person')).toBeInTheDocument()
    expect(screen.getByText('Number of participants attending virtually')).toBeInTheDocument()

    const inPersonValue = screen.getByText('10')
    const virtualValue = screen.getByText('15')

    expect(inPersonValue).toBeInTheDocument()
    expect(virtualValue).toBeInTheDocument()
  })
})

describe('isPageComplete', () => {
  const FORM_DATA = {
    activityRecipientType: 'specialist',
    requester: 'specialist',
    deliveryMethod: 'test',
    virtualDeliveryType: '',
    activityRecipients: [{}],
    targetPopulations: ['people'],
    ttaType: ['tta'],
    participants: ['participant'],
    duration: 1,
    numberOfParticipants: 3,
    startDate: '09/01/2020',
    endDate: '09/01/2020',
    language: ['English'],
    activityReason: 'recipient requested',
  }

  it('returns true if validated by hook form', async () => {
    const result = isPageComplete({}, { isValid: true })
    expect(result).toBe(true)
  })

  it('validates strings', async () => {
    const result = isPageComplete({ ...FORM_DATA, activityReason: null }, { isValid: false })
    expect(result).toBe(false)
  })

  it('validates arrays', async () => {
    const result = isPageComplete({ ...FORM_DATA, activityRecipients: [] }, { isValid: false })
    expect(result).toBe(false)
  })

  it('validates numbers', async () => {
    const result = isPageComplete({ ...FORM_DATA, duration: null }, { isValid: false })
    expect(result).toBe(false)
  })

  it('validates dates', async () => {
    const result = isPageComplete({ ...FORM_DATA, startDate: null }, { isValid: false })
    expect(result).toBe(false)
  })

  it('validates delivery method', async () => {
    const result = isPageComplete({ ...FORM_DATA, deliveryMethod: 'virtual' }, { isValid: false })
    expect(result).toBe(true)
  })

  it('validates language', async () => {
    const result = isPageComplete({ ...FORM_DATA, language: [] }, { isValid: false })
    expect(result).toBe(false)
  })

  it('validates language has value', async () => {
    const result = isPageComplete({ ...FORM_DATA, language: null }, { isValid: false })
    expect(result).toBe(false)
  })

  it('validates both participant fields when deliveryMethod is hybrid', async () => {
    const result = isPageComplete(
      {
        ...FORM_DATA,
        deliveryMethod: 'hybrid',
        numberOfParticipants: 3,
        numberOfParticipantsInPerson: null,
        numberOfParticipantsVirtually: null,
      },
      { isValid: false }
    )
    expect(result).toBe(false)
  })
})

describe('citationsDiffer', () => {
  it('returns false when no existing goals have different citations', () => {
    const existingGoals = [
      {
        objectives: [
          {
            citations: [{ citation: 'ABC' }, { citation: 'DEF' }],
          },
        ],
      },
    ]
    const fetchedCitations = [{ citation: 'ABC' }, { citation: 'DEF' }]
    expect(citationsDiffer(existingGoals, fetchedCitations)).toBe(false)
  })

  it('returns true when existing goals have different citations', () => {
    const existingGoals = [
      {
        objectives: [
          {
            citations: [{ citation: 'XYZ' }],
          },
        ],
      },
    ]
    const fetchedCitations = [{ citation: 'ABC' }]
    expect(citationsDiffer(existingGoals, fetchedCitations)).toBe(true)
  })
})

describe('checkRecipientsAndGoals', () => {
  it('returns EMPTY_RECIPIENTS_WITH_GOALS when no recipients but has goals', () => {
    const data = {
      goalsAndObjectives: [{ id: 1 }],
      activityRecipients: [],
      goalTemplates: [],
      citationsByGrant: [],
    }
    expect(checkRecipientsAndGoals(data, false)).toBe('EMPTY_RECIPIENTS_WITH_GOALS')
  })

  it('returns MISSING_MONITORING_GOAL when monitoring goals exist but no monitoring goal templates', () => {
    const data = {
      goalsAndObjectives: [{ name: '(monitoring) goal' }],
      activityRecipients: [{ id: 1 }],
      goalTemplates: [{ standard: 'Other' }],
      citationsByGrant: [],
    }
    expect(checkRecipientsAndGoals(data, true)).toBe('MISSING_MONITORING_GOAL')
  })

  it('returns null when no modal is needed', () => {
    const data = {
      goalsAndObjectives: [],
      activityRecipients: [{ id: 1 }],
      goalTemplates: [],
      citationsByGrant: [],
    }
    expect(checkRecipientsAndGoals(data, false)).toBe(null)
  })
})
