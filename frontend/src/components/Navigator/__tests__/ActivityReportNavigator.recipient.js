/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import React, { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { useFormContext, useForm } from 'react-hook-form'
import Navigator from '../ActivityReportNavigator'
import UserContext from '../../../UserContext'
import { NOT_STARTED, COMPLETE } from '../constants'
import NetworkContext from '../../../NetworkContext'
import AppLoadingContext from '../../../AppLoadingContext'
import GoalFormContext from '../../../GoalFormContext'

// user mock
const user = {
  name: 'test@test.com',
}

// eslint-disable-next-line react/prop-types
const Input = ({ name, required, type = 'radio', onUpdatePage = jest.fn(), onSaveDraft = jest.fn() }) => {
  const { register } = useFormContext()
  const { isObjectiveFormClosed } = useContext(GoalFormContext)

  const onClick = () => {
    onUpdatePage(isObjectiveFormClosed ? 'Closed' : 'Open')
  }

  const draft = () => {
    onSaveDraft()
  }

  return (
    <>
      <input type={type} data-testid={name} name={name} ref={register({ required })} />

      <button onClick={onClick} type="button">
        Button
      </button>

      <button onClick={draft} type="button">
        Draft
      </button>
    </>
  )
}

const defaultPages = [
  {
    position: 1,
    path: 'goals-objectives',
    label: 'first page',
    review: false,
    render: (_formData, _additionalData, _reportId, _isAppLoading, onContinue, onSaveDraft, onUpdatePage) => (
      <Input onContinue={onContinue} onSaveDraft={onSaveDraft} onUpdatePage={onUpdatePage} name="first" position={1} path="first" required />
    ),
  },
]

const initialData = {
  pageState: { 1: COMPLETE, 2: NOT_STARTED },
  regionId: 1,
  goals: [],
  activityRecipients: [],
  activityRecipientType: 'recipient',
  goalName: 'test',
  'goalForEditing.objectives': [
    {
      topics: [{}],
      title: 'test',
      ttaProvided: 'test',
      resources: [{ value: 'http://www.test.com' }],
    },
  ],
  objectivesWithoutGoals: [],
  goalPrompts: ['test-prompt', 'test-prompt-error'],
  'test-prompt': ['test'],
}

describe('ActivityReportNavigator - recipient reports', () => {
  beforeAll(async () => {
    jest.useFakeTimers()
  })

  // Wrapper component to create hookForm instance for tests
  const NavigatorWrapper = ({ updatePage = jest.fn(), onSave = jest.fn(), formData = initialData, onUpdateError = jest.fn() }) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: formData,
      shouldUnregister: false,
    })

    return (
      <UserContext.Provider value={{ user }}>
        <NetworkContext.Provider
          value={{
            connectionActive: true,
            localStorageAvailable: true,
          }}
        >
          <AppLoadingContext.Provider
            value={{
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }}
          >
            <Navigator
              editable
              reportId={1}
              submitted={false}
              hookForm={hookForm}
              onReview={() => {}}
              isApprover={false}
              pages={defaultPages}
              currentPage="goals-objectives"
              onFormSubmit={jest.fn()}
              updatePage={updatePage}
              onSave={onSave}
              updateErrorMessage={onUpdateError}
              onResetToDraft={() => {}}
              updateLastSaveTime={() => {}}
              isPendingApprover={false}
              setShouldAutoSave={jest.fn()}
            />
          </AppLoadingContext.Provider>
        </NetworkContext.Provider>
      </UserContext.Provider>
    )
  }

  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (updatePage = jest.fn(), onSave = jest.fn(), formData = initialData, onUpdateError = jest.fn()) => {
    render(<NavigatorWrapper updatePage={updatePage} onSave={onSave} formData={formData} onUpdateError={onUpdateError} />)
  }

  beforeEach(() => {
    fetchMock.post('/api/activity-reports/goals', [])
  })

  afterEach(() => {
    fetchMock.restore()
  })

  it('calls the onUpdatePage function', async () => {
    const onUpdatePage = jest.fn()
    const onSaveDraft = jest.fn()
    renderNavigator(onUpdatePage, onSaveDraft)

    const first = await screen.findByRole('button', { name: 'first page Complete' })
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible())

    const saveAndContinue = await screen.findByRole('button', { name: /button/i })
    userEvent.click(saveAndContinue)
    await waitFor(() => expect(onUpdatePage).toHaveBeenCalledWith('Open'))
  })

  it('saves draft', async () => {
    renderNavigator()

    // assert fetchmock called to be false
    await waitFor(() => expect(fetchMock.called()).toBe(false))

    const first = await screen.findByRole('button', { name: 'first page Complete' })
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible())

    const saveAndContinue = await screen.findByRole('button', { name: /draft/i })
    userEvent.click(saveAndContinue)

    await waitFor(() => expect(fetchMock.called()).toBe(true))
  })

  it('handles fetch error', async () => {
    // clear out fetch mock
    fetchMock.restore()
    fetchMock.post('/api/activity-reports/goals', 500)

    renderNavigator()

    // assert fetchmock called to be false
    await waitFor(() => expect(fetchMock.called()).toBe(false))

    const first = await screen.findByRole('button', { name: 'first page Complete' })
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible())

    const saveAndContinue = await screen.findByRole('button', { name: /draft/i })
    userEvent.click(saveAndContinue)

    await waitFor(() => expect(fetchMock.called()).toBe(true))
  })

  it('runs the auto save', async () => {
    renderNavigator()

    // assert fetchmock called to be false
    await waitFor(() => expect(fetchMock.called()).toBe(false))

    const first = await screen.findByRole('button', { name: 'first page Complete' })
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible())

    // click on first input
    const firstInput = await screen.findByTestId('first')
    userEvent.click(firstInput)

    // wait one year
    act(() => {
      jest.advanceTimersByTime(1000 * 60 * 5)
    })

    await waitFor(() => expect(fetchMock.called()).toBe(true))
  })
})
