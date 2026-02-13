/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { Router } from 'react-router'
import { createMemoryHistory } from 'history'
import fetchMock from 'fetch-mock'
import { FormProvider, useForm } from 'react-hook-form'
import selectEvent from 'react-select-event'
import userEvent from '@testing-library/user-event'
import AppLoadingContext from '../../../../../AppLoadingContext'
import GoalPicker from '../GoalPicker'
import UserContext from '../../../../../UserContext'
import { mockRSSData } from '../../../../../testHelpers'

const defaultSelectedGoals = [
  {
    label: 'Goal 2',
    value: 2,
    goalIds: [2],
    goalTemplateId: 2,
  },
]

const defaultGoalForEditing = {
  objectives: [],
  goalIds: [],
}

const GP = ({ selectedGoals, goalForEditing, goalTemplates, additionalRecipients = [] }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      startDate: '2024-12-03',
      regionId: 1,
      goals: selectedGoals,
      goalForEditing,
      author: {
        role: 'central office',
      },
      collaborators: [],
      activityRecipients: [...additionalRecipients, { activityRecipientId: 1, name: 'Grant 1 Name' }],
    },
  })
  const history = createMemoryHistory()
  return (
    <AppLoadingContext.Provider
      value={{
        setIsAppLoading: jest.fn(),
        setAppLoadingText: jest.fn(),
        isAppLoading: false,
      }}
    >
      <UserContext.Provider
        value={{
          user: {
            id: 1,
            permissions: [],
            name: 'Ted User',
            flags: [],
          },
        }}
      >
        <FormProvider {...hookForm}>
          <Router history={history}>
            <GoalPicker goalTemplates={goalTemplates} grantIds={[1]} reportId={1} />
          </Router>
        </FormProvider>
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  )
}

const renderGoalPicker = (selectedGoals = defaultSelectedGoals, goalForEditing = defaultGoalForEditing, goalTemplates = []) => {
  render(<GP selectedGoals={selectedGoals} goalForEditing={goalForEditing} goalTemplates={goalTemplates} />)
}

describe('GoalPicker', () => {
  beforeEach(async () => {
    fetchMock.get('/api/topic', [])
    fetchMock.get('/api/goals?reportId=1&goalTemplateId=1', [{ objectives: [] }])
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData())
  })

  afterEach(() => fetchMock.restore())

  it('you can select a goal', async () => {
    const availableGoals = [
      {
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        name: 'Goal 1',
      },
    ]

    renderGoalPicker(defaultSelectedGoals, defaultGoalForEditing, availableGoals)

    const selectContainer = screen.getByTestId('goal-selector')
    const selector = selectContainer.querySelector('input[name="goal-selector"]')
    const [availableGoal] = availableGoals

    await selectEvent.select(selector, [availableGoal.label])

    const input = document.querySelector('[name="goal-selector"]')
    expect(input.value).toBe(availableGoal.value.toString())
  })

  it('you can select a goal that has objectives, keeping the objectives', async () => {
    const availableGoals = [
      {
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        name: 'Goal 1',
      },
    ]

    const goalForEditing = {
      objectives: [
        {
          topics: [],
          id: 1,
          label: 'Objective 1',
          title: 'Objective 1',
          resources: [],
          ttaProvided: '',
          objectiveCreatedHere: true,
        },
      ],
      goalIds: [],
    }

    renderGoalPicker(defaultSelectedGoals, goalForEditing, availableGoals)

    const selectContainer = screen.getByTestId('goal-selector')
    const selector = selectContainer.querySelector('input[name="goal-selector"]')
    const [availableGoal] = availableGoals

    await selectEvent.select(selector, [availableGoal.label])

    expect(await screen.findByText('You have selected a different goal.')).toBeVisible()

    const button = await screen.findByRole('button', { name: /keep objective/i })
    userEvent.click(button)

    const input = document.querySelector('[name="goal-selector"]')
    expect(input.value).toBe(availableGoal.value.toString())

    const objective = await screen.findByText('Objective 1', { selector: 'textarea' })
    expect(objective).toBeVisible()
    expect(objective).toHaveAttribute('name', 'goalForEditing.objectives[0].title')
  })

  it('you can select a goal that has objectives, losing the objectives', async () => {
    const availableGoals = [
      {
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        name: 'Goal 1',
        goalTemplateId: 1,
      },
      {
        label: 'Goal 2',
        value: 2,
        goalIds: [2],
        name: 'Goal 2',
        goalTemplateId: 2,
      },
    ]

    const goalForEditing = {
      objectives: [
        {
          topics: [],
          id: 1,
          title: 'Objective 1',
          resources: [],
          ttaProvided: '',
          objectiveCreatedHere: true,
        },
      ],
      goalIds: [],
    }

    renderGoalPicker(defaultSelectedGoals, goalForEditing, availableGoals)

    const selectContainer = screen.getByTestId('goal-selector')
    const selector = selectContainer.querySelector('input[name="goal-selector"]')
    const [availableGoal] = availableGoals

    await selectEvent.select(selector, [availableGoal.label])

    expect(await screen.findByText('You have selected a different goal.')).toBeVisible()

    const button = await screen.findByRole('button', { name: /remove objective/i })
    userEvent.click(button)

    const input = document.querySelector('[name="goal-selector"]')
    expect(input.value).toBe(availableGoal.value.toString())

    const objective = document.querySelector('[name="goalForEditing.objectives[0].title"]')
    expect(objective).not.toBeNull()
  })

  it('you can select a goal with no selected goals', async () => {
    const availableGoals = [
      {
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
      },
    ]

    renderGoalPicker(null, defaultGoalForEditing, availableGoals)

    const selectContainer = screen.getByTestId('goal-selector')
    const selector = selectContainer.querySelector('input[name="goal-selector"]')
    const [availableGoal] = availableGoals

    await selectEvent.select(selector, [availableGoal.label])

    const input = document.querySelector('[name="goal-selector"]')
    expect(input.value).toBe(availableGoal.value.toString())
  })

  it('properly renders when there is no goal for editing selected', async () => {
    renderGoalPicker(null)
    const selector = await screen.findByText(/Select goal/i)
    expect(selector).toBeVisible()
  })

  describe('curated goals', () => {
    it('with no prompts', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', [
        [
          {
            type: 'multiselect',
            title: 'prompt-1',
            options: ['Option 1', 'Option 2'],
            prompt: 'WHYYYYYYYY?',
          },
        ],
        [],
      ])
      fetchMock.get('/api/goal-templates/1/source?grantIds=1', {
        source: 'source',
      })

      const availableGoals = [
        {
          label: 'Goal 1',
          value: 1,
          goalIds: [1],
          isCurated: true,
          goalTemplateId: 1,
        },
      ]

      act(() => {
        renderGoalPicker(null, defaultGoalForEditing, availableGoals)
      })

      const selectContainer = screen.getByTestId('goal-selector')
      const selector = selectContainer.querySelector('input[name="goal-selector"]')
      const [availableGoal] = availableGoals

      await act(async () => {
        await selectEvent.select(selector, [availableGoal.label])
      })

      const input = document.querySelector('[name="goal-selector"]')
      expect(input.value).toBe(availableGoal.value.toString())
    })
    it('with prompts', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', [
        [
          {
            type: 'multiselect',
            title: 'prompt-1',
            options: ['Option 1', 'Option 2'],
            prompt: 'WHYYYYYYYY?',
          },
        ],
        [],
      ])
      const availableGoals = [
        {
          label: 'Goal 1',
          value: 1,
          goalIds: [1],
          isCurated: true,
          goalTemplateId: 1,
        },
      ]

      act(() => {
        renderGoalPicker(null, defaultGoalForEditing, availableGoals)
      })

      const selectContainer = screen.getByTestId('goal-selector')
      const selector = selectContainer.querySelector('input[name="goal-selector"]')
      const [availableGoal] = availableGoals

      await act(async () => {
        await selectEvent.select(selector, [availableGoal.label])
      })

      const input = document.querySelector('[name="goal-selector"]')
      expect(input.value).toBe(availableGoal.value.toString())
    })
  })
  describe('monitoring goals', () => {
    it('correctly retrieves citations for monitoring goals', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', [[], []])

      fetchMock.get('/api/citations/region/1?grantIds=1&reportStartDate=2024-12-03', [
        {
          citation: 'test citation 1',
          grants: [
            {
              acro: 'DEF',
              citation: 'test citation 1',
              findingId: 1,
              findingSource: 'source',
              findingType: 'Deficiency',
              grantId: 1,
              grantNumber: '123',
              monitoringFindingStatusName: 'Active',
              reportDeliveryDate: '2024-12-03',
              reviewName: 'review name',
              severity: 1,
            },
          ],
          standardId: 1,
        },
      ])

      const availableGoalTemplates = [
        {
          label: 'Monitoring Goal',
          value: 1,
          goalIds: [1],
          isCurated: true,
          goalTemplateId: 1,
          source: 'Federal monitoring issues, including CLASS and RANs',
          standard: 'Monitoring',
          goals: [
            {
              grantId: 1,
            },
          ],
        },
      ]

      act(() => {
        renderGoalPicker(null, { objectives: [], goalIds: [] }, availableGoalTemplates)
      })
      const selectContainer = screen.getByTestId('goal-selector')
      const selector = selectContainer.querySelector('input[name="goal-selector"]')
      const [availableGoal] = availableGoalTemplates

      await act(async () => {
        await selectEvent.select(selector, [availableGoal.label])
      })

      const input = document.querySelector('[name="goal-selector"]')
      expect(input.value).toBe(availableGoal.value.toString())

      // Select 'Create a new objective' from the dropdown.
      const objectiveSelector = await screen.findByLabelText(/Select TTA objective/i)
      await selectEvent.select(objectiveSelector, 'Create a new objective')

      // Open the citations dropdown.
      const citationSelector = await screen.findByRole('combobox', { name: /citation/i })
      await selectEvent.select(citationSelector, /test citation 1/i)

      // Check that the citation is displayed.
      const citation = await screen.findByText(/test citation 1/i)
      expect(citation).toBeVisible()
    })

    it('correctly displays the monitoring warning if non monitoring recipients are selected', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1&goalIds=2', [[], []])
      fetchMock.get('/api/citations/region/1?grantIds=1&reportStartDate=2024-12-03', [
        {
          citation: 'Not your citation',
          grants: [
            {
              acro: 'DEF',
              citation: 'test citation 1',
              findingId: 1,
              findingSource: 'source',
              findingType: 'Not your citation type',
              grantId: 2,
              grantNumber: '123',
              monitoringFindingStatusName: 'Active',
              reportDeliveryDate: '2024-12-03',
              reviewName: 'review name',
              severity: 1,
            },
          ],
          standardId: 1,
        },
      ])

      fetchMock.get('/api/citations/region/1?grantIds=1&grantIds=2&reportStartDate=2024-12-03', [
        {
          citation: 'Not your citation',
          grants: [
            {
              acro: 'DEF',
              citation: 'test citation 1',
              findingId: 1,
              findingSource: 'source',
              findingType: 'Not your citation type',
              grantId: 2,
              grantNumber: '123',
              monitoringFindingStatusName: 'Active',
              reportDeliveryDate: '2024-12-03',
              reviewName: 'review name',
              severity: 1,
            },
          ],
          standardId: 1,
        },
      ])

      const availableTemplates = [
        {
          label: 'Monitoring Template Goal',
          value: 1,
          goalIds: [1, 2],
          isCurated: true,
          goalTemplateId: 1,
          standard: 'Monitoring',
          objectives: [],
          goals: [
            {
              grantId: 2,
            },
          ],
        },
      ]

      const goalForEditing = {
        standard: 'Monitoring',
        objectives: [
          {
            topics: [],
            id: 1,
            title: 'Objective 1',
            resources: [],
            ttaProvided: '',
            objectiveCreatedHere: true,
          },
        ],
        goalIds: [],
      }

      act(() => {
        renderGoalPicker(null, goalForEditing, availableTemplates)
      })

      const selectContainer = screen.getByTestId('goal-selector')
      const selector = selectContainer.querySelector('input[name="goal-selector"]')

      // Select first template goal.
      fireEvent.focus(selector)
      await act(async () => {
        // arrow down to the first option and select it.
        fireEvent.keyDown(selector, {
          key: 'ArrowDown',
          keyCode: 40,
          code: 40,
        })
      })

      await act(async () => {
        await waitFor(async () => {
          const option = await screen.findByText('Monitoring Template Goal')
          expect(option).toBeVisible()
        })
      })
      expect(await screen.findByText(/this grant does not have the standard monitoring goal/i)).toBeVisible()
      expect(await screen.findByText(/grant 1 name/i)).toBeVisible()
      expect(await screen.findByText(/to avoid errors when submitting the report, you can either/i)).toBeVisible()
    })

    it('correctly hides the monitoring warning if non monitoring recipients are selected with another goal', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1&goalIds=2', [])
      fetchMock.get('/api/citations/region/1?grantIds=1&reportStartDate=2024-12-03', [
        {
          citation: 'Not your citation',
          grants: [
            {
              acro: 'DEF',
              citation: 'test citation 1',
              findingId: 1,
              findingSource: 'source',
              findingType: 'Not your citation type',
              grantId: 2,
              grantNumber: '123',
              monitoringFindingStatusName: 'Active',
              reportDeliveryDate: '2024-12-03',
              reviewName: 'review name',
              severity: 1,
            },
          ],
          standardId: 1,
        },
      ])

      fetchMock.get('/api/citations/region/1?grantIds=1&grantIds=2&reportStartDate=2024-12-03', [
        {
          citation: 'Not your citation',
          grants: [
            {
              acro: 'DEF',
              citation: 'test citation 1',
              findingId: 1,
              findingSource: 'source',
              findingType: 'Not your citation type',
              grantId: 2,
              grantNumber: '123',
              monitoringFindingStatusName: 'Active',
              reportDeliveryDate: '2024-12-03',
              reviewName: 'review name',
              severity: 1,
            },
          ],
          standardId: 1,
        },
      ])

      const availableTemplates = [
        {
          label: 'Monitoring Template Goal',
          value: 1,
          goalIds: [1, 2],
          isCurated: true,
          goalTemplateId: 1,
          source: 'Federal monitoring issues, including CLASS and RANs',
          standard: 'Monitoring',
          objectives: [],
          goals: [
            {
              grantId: 1,
            },
            {
              grantId: 2,
            },
          ],
        },
      ]
      const goalForEditing = {
        standard: 'Monitoring',
        objectives: [
          {
            topics: [],
            id: 1,
            title: 'Objective 1',
            resources: [],
            ttaProvided: '',
            objectiveCreatedHere: true,
          },
        ],
        goalIds: [],
      }
      act(() => {
        renderGoalPicker([{ id: 1, grantId: 1 }], goalForEditing, availableTemplates)
      })

      //
      const goalLabel = await screen.findByText(/select goal/i)
      expect(goalLabel).toBeVisible()
      const selectContainer = screen.getByTestId('goal-selector')
      const selector = selectContainer.querySelector('input[name="goal-selector"]')
      await act(async () => {
        await selectEvent.select(selector, ['Monitoring Template Goal'])
      })

      // Select first template goal.
      fireEvent.focus(selector)
      await act(async () => {
        // arrow down to the first option and select it.
        fireEvent.keyDown(selector, {
          key: 'ArrowDown',
          keyCode: 40,
          code: 40,
        })
      })

      await act(async () => {
        await waitFor(async () => {
          const option = await screen.findByText('Monitoring Template Goal')
          expect(option).toBeVisible()
        })
      })
      expect(screen.queryAllByText(/this grant does not have the standard monitoring goal/i).length).toBe(0)
      expect(screen.queryAllByText(/grant 1 name/i).length).toBe(0)
      expect(screen.queryAllByText(/to avoid errors when submitting the report, you can either/i).length).toBe(0)
    })
  })
})
