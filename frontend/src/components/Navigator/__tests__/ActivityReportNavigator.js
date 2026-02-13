/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom'
import React from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import { useFormContext, useForm } from 'react-hook-form'
import ActivityReportNavigator, { getPrompts, getPromptErrors, formatEndDate } from '../ActivityReportNavigator'
import { shouldUpdateFormData } from '../../../utils/formRichTextEditorHelper'
import UserContext from '../../../UserContext'
import { NOT_STARTED, IN_PROGRESS } from '../constants'
import NetworkContext from '../../../NetworkContext'
import AppLoadingContext from '../../../AppLoadingContext'
import NavigatorButtons from '../components/NavigatorButtons'
import RichEditor from '../../RichEditor'
import * as goalValidator from '../../../pages/ActivityReport/Pages/components/goalValidator'
import { saveGoalsForReport } from '../../../fetchers/activityReports'

jest.mock('../../../fetchers/activityReports', () => ({
  saveGoalsForReport: jest.fn(),
}))

jest.mock('../../../pages/ActivityReport/Pages/components/goalValidator', () => ({
  validateGoals: jest.fn().mockReturnValue(true),
  validatePrompts: jest.fn().mockReturnValue(true),
  OBJECTIVE_RESOURCES: 'Resources are required',
}))

// user mock
const user = {
  name: 'test@test.com',
}

// eslint-disable-next-line react/prop-types
const Input = ({ name, required, type = 'radio', position, path, onUpdatePage = jest.fn(), onSaveDraft = jest.fn(), onContinue = jest.fn() }) => {
  const { register } = useFormContext()
  return (
    <>
      <input type={type} data-testid={name} name={name} ref={register({ required })} />
      <NavigatorButtons
        isAppLoading={false}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        position={position}
        path={path}
      />
    </>
  )
}

const defaultPages = [
  {
    position: 1,
    path: 'first',
    label: 'first page',
    review: false,
    render: (_formData, _additionalData, _reportId, _isAppLoading, onContinue, onSaveDraft, onUpdatePage) => (
      <Input onContinue={onContinue} onSaveDraft={onSaveDraft} onUpdatePage={onUpdatePage} name="first" position={1} path="first" required />
    ),
  },
  {
    position: 2,
    path: 'second',
    label: 'second page',
    review: false,
    isPageComplete: () => false,
    render: (_formData, _additionalData, _reportId, _isAppLoading, onContinue, onSaveDraft, onUpdatePage) => (
      <Input onContinue={onContinue} onSaveDraft={onSaveDraft} onUpdatePage={onUpdatePage} name="second" position={2} path="second" required />
    ),
  },
  {
    position: 3,
    path: 'third',
    label: 'third page',
    review: false,
    render: (_formData, _additionalData, _reportId, _isAppLoading, onContinue, onSaveDraft, onUpdatePage) => (
      <Input onContinue={onContinue} onSaveDraft={onSaveDraft} onUpdatePage={onUpdatePage} name="third" position={3} path="third" required />
    ),
  },
  {
    position: 4,
    label: 'review page',
    path: 'review',
    review: true,
    render: (_formData, onFormSubmit) => (
      <div>
        <Input name="fourth" position={4} path="review" required />
        <button type="button" data-testid="review" onClick={onFormSubmit}>
          Continue
        </button>
      </div>
    ),
  },
]

const initialData = {
  pageState: { 1: NOT_STARTED, 2: NOT_STARTED },
  regionId: 1,
  goals: [],
  objectivesWithoutGoals: [],
  activityRecipients: [],
  activityRecipientType: 'recipient',
  'goalForEditing.objectives': [],
  goalPrompts: ['test-prompt', 'test-prompt-error'],
  'test-prompt': ['test'],
}

describe('ActivityReportNavigator', () => {
  beforeAll(async () => {
    jest.useFakeTimers()
  })

  // Wrapper component to create hookForm instance for tests
  const NavigatorWrapper = ({
    currentPage = 'first',
    onSubmit = jest.fn(),
    onSave = jest.fn(),
    updatePage = jest.fn(),
    pages = defaultPages,
    formData = initialData,
    onUpdateError = jest.fn(),
    editable = true,
    autoSaveInterval = 500,
    shouldAutoSave = true,
    onHookForm,
  }) => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: formData,
      shouldUnregister: false,
    })

    if (onHookForm) {
      onHookForm(hookForm)
    }

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
            <ActivityReportNavigator
              draftSaver={jest.fn()}
              editable={editable}
              reportId={1}
              submitted={false}
              hookForm={hookForm}
              onReview={() => {}}
              isApprover={false}
              pages={pages}
              currentPage={currentPage}
              onFormSubmit={onSubmit}
              updatePage={updatePage}
              onSave={onSave}
              updateErrorMessage={onUpdateError}
              onResetToDraft={() => {}}
              updateLastSaveTime={() => {}}
              isPendingApprover={false}
              autoSaveInterval={autoSaveInterval}
              shouldAutoSave={shouldAutoSave}
              setShouldAutoSave={jest.fn()}
            />
          </AppLoadingContext.Provider>
        </NetworkContext.Provider>
      </UserContext.Provider>
    )
  }

  // eslint-disable-next-line arrow-body-style
  const renderNavigator = async ({
    currentPage = 'first',
    onSubmit = jest.fn(),
    onSave = jest.fn(),
    updatePage = jest.fn(),
    pages = defaultPages,
    formData = initialData,
    onUpdateError = jest.fn(),
    editable = true,
    autoSaveInterval = 500,
    shouldAutoSave = true,
    onHookForm,
  } = {}) => {
    await act(() =>
      waitFor(() => {
        render(
          <NavigatorWrapper
            currentPage={currentPage}
            onSubmit={onSubmit}
            onSave={onSave}
            updatePage={updatePage}
            pages={pages}
            formData={formData}
            onUpdateError={onUpdateError}
            editable={editable}
            autoSaveInterval={autoSaveInterval}
            shouldAutoSave={shouldAutoSave}
            onHookForm={onHookForm}
          />
        )
      })
    )
  }

  beforeEach(() => {
    fetchMock.post('/api/activity-reports/goals', [])
  })

  afterEach(() => {
    fetchMock.restore()
  })

  it('sets dirty forms as "in progress"', async () => {
    await renderNavigator({})
    const firstInput = screen.getByTestId('first')
    userEvent.click(firstInput)
    const first = await screen.findByRole('button', { name: 'first page In Progress' })
    await waitFor(() => expect(within(first).getByText('In Progress')).toBeVisible())
  })

  it('does not allow saving if the form is not editable', async () => {
    await renderNavigator({ editable: false })

    fetchMock.restore()
    expect(fetchMock.called()).toBe(false)

    await act(async () => userEvent.click(await screen.findByRole('button', { name: 'Save draft' })))
    expect(fetchMock.called()).toBe(false)
  })

  it('prevents autosaving if set to false', async () => {
    const onSave = jest.fn()
    await renderNavigator({ shouldAutoSave: false, onSave })

    await act(() =>
      waitFor(() => {
        jest.advanceTimersByTime(800)
      })
    )

    expect(onSave).not.toHaveBeenCalled()
  })

  it('onContinue calls onSave with correct page position', async () => {
    const onSave = jest.fn()
    await renderNavigator({ currentPage: 'second', onSave })

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'))

    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        {
          ...initialData,
          pageState: {
            ...initialData.pageState,
            2: IN_PROGRESS,
          },
          second: 'on',
        },
        false
      )
    )
  })

  it('submits data when "continuing" from the review page', async () => {
    const onSubmit = jest.fn()
    await renderNavigator({ currentPage: 'review', onSubmit })
    userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('onBack calls onUpdatePage', async () => {
    const updatePage = jest.fn()
    await renderNavigator({ currentPage: 'third', updatePage })
    const button = await screen.findByRole('button', { name: 'Back' })
    userEvent.click(button)
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(2))
  })

  it('calls onSave on navigation', async () => {
    const updatePage = jest.fn()
    const onSave = jest.fn()
    await renderNavigator({ currentPage: 'second', onSave, updatePage })

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'))
    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        {
          ...initialData,
          pageState: { ...initialData.pageState, 2: IN_PROGRESS },
          second: 'on',
        },
        false
      )
    )
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1))
  })

  it('shows an error when save fails', async () => {
    const onSubmit = jest.fn()
    const onSave = jest.fn()

    onSave.mockImplementationOnce(async () => {
      throw new Error()
    })

    const onUpdateError = jest.fn()

    await renderNavigator({
      currentPage: 'second',
      onSubmit,
      onSave,
      onUpdateError,
    })

    // mark the form as dirty so that onSave is called
    await act(() =>
      waitFor(() => {
        userEvent.click(screen.getByTestId('second'))
      })
    )

    await act(() =>
      waitFor(async () => {
        userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }))
      })
    )

    expect(onSave).toHaveBeenCalled()
    expect(onUpdateError).toHaveBeenCalled()
  })

  it('runs the autosave', async () => {
    const onSave = jest.fn()
    await renderNavigator({ currentPage: 'second', onSave })

    // mark the form as dirty
    const input = screen.getByTestId('second')
    userEvent.click(input)

    jest.advanceTimersByTime(800)
    expect(onSave).toHaveBeenCalled()
  })

  it('does not run the autosave when the form is clean', async () => {
    const onSave = jest.fn()
    await renderNavigator({ currentPage: 'second', onSave })
    jest.advanceTimersByTime(800)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('navigates between pages and preserves form data', async () => {
    const updatePage = jest.fn()
    const onSave = jest.fn()
    const updateForm = jest.fn()

    await renderNavigator({
      currentPage: 'first',
      onSave,
      updatePage,
      updateForm,
    })

    // Fill out the first page
    const firstInput = screen.getByTestId('first')
    userEvent.click(firstInput)

    // Click continue to go to the second page
    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    // Verify updatePage was called to go to page 2
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(2))

    // Verify onSave was called with the correct data
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        {
          ...initialData,
          pageState: {
            ...initialData.pageState,
            1: IN_PROGRESS,
          },
          first: 'on',
        },
        false
      )
    )

    // Reset mocks for further testing
    onSave.mockClear()
    updatePage.mockClear()

    // Render the second page
    await renderNavigator({
      currentPage: 'second',
      onSave,
      updatePage,
      updateForm,
      formData: {
        ...initialData,
        pageState: {
          ...initialData.pageState,
          1: IN_PROGRESS,
        },
        first: 'on',
      },
    })

    // Fill out the second page
    const secondInput = screen.getByTestId('second')
    userEvent.click(secondInput)

    // Navigate back to the first page
    userEvent.click(screen.getByRole('button', { name: 'Back' }))

    // Verify updatePage was called to go to page 1
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1))

    // Verify onSave was called with the correct data including both pages
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        {
          ...initialData,
          pageState: {
            ...initialData.pageState,
            1: IN_PROGRESS,
            2: IN_PROGRESS,
          },
          first: 'on',
          second: 'on',
        },
        false
      )
    )
  })
})

describe('shouldUpdateFormData', () => {
  it('if isAutoSave is false, returns true', () => {
    expect(shouldUpdateFormData(false)).toBe(true)
  })

  it('if we are focused on a rich editor, return false', async () => {
    const previousContains = HTMLDivElement.prototype.contains
    HTMLDivElement.prototype.contains = () => true

    render(
      <div>
        <label>
          Rich Editor
          <RichEditor ariaLabel="rich editor" value="test" onChange={jest.fn()} onBlur={jest.fn()} />
        </label>
      </div>
    )

    const richEditor = await screen.findByRole('textbox', { name: 'rich editor' })
    act(() => {
      richEditor.focus()
    })

    expect(shouldUpdateFormData(true)).toBe(false)
    HTMLDivElement.prototype.contains = previousContains
  })
})

describe('formatEndDate', () => {
  it('returns the formEndDate if it is not invalid', () => {
    expect(formatEndDate('09/01/2020')).toBe('09/01/2020')
  })

  it('returns an empty string if the formEndDate is invalid', () => {
    expect(formatEndDate('invalid date')).toBe('')
  })
})

describe('getPrompts', () => {
  it('returns an empty array if there are no prompt titles', () => {
    const getValues = jest.fn(() => ['test'])
    const prompts = getPrompts(null, getValues)
    expect(prompts).toEqual([])
  })

  it('returns prompts with responses', () => {
    const getValues = jest.fn(() => ['test'])
    const prompts = getPrompts(
      [
        {
          promptId: 1,
          title: 'test',
          fieldName: 'test',
        },
      ],
      getValues
    )

    expect(prompts).toEqual([
      {
        promptId: 1,
        title: 'test',
        response: ['test'],
      },
    ])
  })
})

describe('getPromptErrors', () => {
  const oldQuerySelector = document.querySelector
  afterAll(() => {
    document.querySelector = oldQuerySelector
  })

  it('returns true if there are errors', async () => {
    document.querySelector = jest.fn(() => null)
    const errors = { prompt: 'error' }
    const prompts = [{ fieldName: 'prompt' }]
    expect(getPromptErrors(prompts, errors)).toBe(true)
  })

  it('focuses if there are errors', async () => {
    const focus = jest.fn()
    document.querySelector = jest.fn(() => ({ focus }))
    const errors = { prompt: 'error' }
    const prompts = [{ fieldName: 'prompt' }]
    expect(getPromptErrors(prompts, errors)).toBe(true)
    expect(focus).toHaveBeenCalled()
  })

  it('returns false if there are no errors', async () => {
    document.querySelector = jest.fn(() => null)
    const errors = {}
    const prompts = [{ fieldName: 'prompt' }]
    expect(getPromptErrors(prompts, errors)).toBe(false)
  })

  it('returns false if there are no prompts', async () => {
    document.querySelector = jest.fn(() => null)
    const errors = {}
    expect(getPromptErrors(null, errors)).toBe(false)
  })
})

describe('ActivityReportNavigator goals page saves', () => {
  const defaultProps = {
    editable: true,
    currentPage: 'goals-objectives',
    additionalData: {},
    reportId: 1,
    isApprover: false,
    isPendingApprover: false,
    onFormSubmit: jest.fn(),
    onSave: jest.fn(),
    onReview: jest.fn(),
    updatePage: jest.fn(),
    updateLastSaveTime: jest.fn(),
    updateErrorMessage: jest.fn(),
    setShouldAutoSave: jest.fn(),
    pages: [
      {
        path: 'goals-objectives',
        label: 'Goals',
        position: 2,
        review: false,
        isPageComplete: jest.fn().mockReturnValue(false),
        render: (_additionalData, _formData, _reportId, _isAppLoading, onContinue, onSaveDraft, onUpdatePage) => (
          <NavigatorButtons
            isAppLoading={false}
            onContinue={onContinue}
            onSaveDraft={onSaveDraft}
            onUpdatePage={onUpdatePage}
            position={2}
            path="goals-objectives"
          />
        ),
      },
      {
        path: 'review',
        label: 'Review',
        position: 3,
        review: true,
        render: () => <div />,
      },
    ],
  }

  const mockAppLoadingContext = {
    isAppLoading: false,
    setIsAppLoading: jest.fn(),
    setAppLoadingText: jest.fn(),
  }

  const createMockHookForm = (overrides = {}) => ({
    getValues: jest.fn((field) => {
      const values = {
        regionId: 1,
        goalName: 'Test Goal',
        goalPrompts: [],
        activityRecipients: [],
        ...overrides.values,
      }
      return field ? values[field] : values
    }),
    setValue: jest.fn(),
    setError: jest.fn(),
    errors: overrides.errors || {},
    watch: jest.fn((field) => {
      if (field === 'goalForEditing') return overrides.goalForEditing || null
      if (field === 'goals') return overrides.goals || []
      if (field === 'activityRecipients') return overrides.activityRecipients || []
      if (field === 'pageState') return overrides.pageState || {}
      return null
    }),
    trigger: jest.fn().mockResolvedValue(true),
    reset: jest.fn(),
    formState: overrides.formState || { isDirty: true, errors: {} },
  })

  const renderWithContext = (hookForm, props = {}) =>
    render(
      <AppLoadingContext.Provider value={mockAppLoadingContext}>
        <ActivityReportNavigator {...defaultProps} {...props} hookForm={hookForm} />
      </AppLoadingContext.Provider>
    )

  beforeEach(() => {
    jest.clearAllMocks()
    defaultProps.onSave.mockReset()
    defaultProps.updateErrorMessage.mockReset()
    mockAppLoadingContext.setIsAppLoading.mockReset()
    mockAppLoadingContext.setAppLoadingText.mockReset()
    goalValidator.validateGoals.mockReturnValue(true)
    goalValidator.validatePrompts.mockResolvedValue(true)
  })

  it('saves goal draft when navigating away from goals page', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, objectives: [], originalIndex: 0 },
      values: { goalPrompts: [] },
    })

    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    renderWithContext(hookForm)

    const reviewLink = screen.getByRole('button', { name: /Review/i })
    userEvent.click(reviewLink)

    await waitFor(() => {
      // Verifies goalOrder extraction and navigation save
      expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({ goalOrder: expect.any(Array) }))
      expect(hookForm.reset).toHaveBeenCalled()
      expect(mockAppLoadingContext.setIsAppLoading).toHaveBeenCalled()
    })
  })

  it('does not save draft goal when prompts have errors', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, objectives: [], originalIndex: 0 },
      values: {
        goalPrompts: [{ fieldName: 'prompt-one' }],
        'goalForEditing.objectives': [],
      },
      errors: { 'prompt-one': { type: 'manual', message: 'Error' } },
    })

    renderWithContext(hookForm)

    const saveDraftButton = screen.getByRole('button', { name: /save draft/i })
    userEvent.click(saveDraftButton)

    expect(saveGoalsForReport).not.toHaveBeenCalled()
  })

  it('does not save draft goal when resources are invalid', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, objectives: [], originalIndex: 0 },
      values: {
        goalPrompts: [],
        'goalForEditing.objectives': [
          {
            resources: [{ value: 'http://test' }],
          },
        ],
      },
    })

    renderWithContext(hookForm)

    const saveDraftButton = screen.getByRole('button', { name: /save draft/i })
    userEvent.click(saveDraftButton)

    expect(saveGoalsForReport).not.toHaveBeenCalled()
  })

  it('autosave marks invalid resources when goal is being edited', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, objectives: [], originalIndex: 0 },
      values: {
        goalPrompts: [],
        'goalForEditing.objectives': [
          {
            resources: [{ value: 'http://test' }],
          },
        ],
      },
    })

    saveGoalsForReport.mockResolvedValueOnce([])

    renderWithContext(hookForm, { autoSaveInterval: 200, shouldAutoSave: true })

    act(() => {
      jest.advanceTimersByTime(400)
    })

    await waitFor(() =>
      expect(hookForm.setError).toHaveBeenCalledWith('goalForEditing.objectives[0].resources', { message: 'Resources are required' })
    )
  })

  it('focuses and exits when goals are invalid', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, objectives: [], originalIndex: 0 },
      values: { goalPrompts: [] },
    })
    const focus = jest.fn()
    const originalQuerySelector = document.querySelector
    document.querySelector = jest.fn(() => ({ focus }))
    goalValidator.validateGoals.mockReturnValueOnce(false)

    renderWithContext(hookForm)

    const continueBtn = document.getElementById('draft-goals-objectives-save-continue')
    fireEvent.click(continueBtn)

    await waitFor(() => expect(focus).toHaveBeenCalled())

    document.querySelector = originalQuerySelector
  })

  it('stops save when prompts have errors on continue', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, objectives: [], originalIndex: 0 },
      values: {
        goalPrompts: [{ fieldName: 'prompt-two' }],
      },
      errors: { 'prompt-two': { type: 'manual', message: 'Error' } },
    })

    renderWithContext(hookForm)

    const continueBtn = document.getElementById('draft-goals-objectives-save-continue')
    fireEvent.click(continueBtn)

    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })

  it('resets goal form fields after successful Save and Continue', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, name: 'Goal' },
      values: { goalPrompts: [] },
      formState: { isDirty: true, errors: {} }, // No errors to block getPromptErrors
    })

    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    renderWithContext(hookForm)

    const continueBtn = document.getElementById('draft-goals-objectives-save-continue')
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(hookForm.setValue).toHaveBeenCalledWith('goalName', '')
      expect(hookForm.setValue).toHaveBeenCalledWith('goalForEditing', '')
      expect(hookForm.reset).toHaveBeenCalled()
    })
  })

  it('shows an error when Save and Continue returns no data', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1, name: 'Goal' },
      values: { goalPrompts: [] },
      formState: { isDirty: true, errors: {} },
    })

    defaultProps.onSave.mockResolvedValue(null)

    renderWithContext(hookForm)

    const continueBtn = document.getElementById('draft-goals-objectives-save-continue')
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(defaultProps.updateErrorMessage).toHaveBeenCalledWith(expect.stringContaining('A network error has prevented us from saving'))
    })
  })

  it('handles errors when onSaveAndContinue fails', async () => {
    const hookForm = createMockHookForm({
      goalForEditing: { id: 1 },
      values: { goalPrompts: [] },
      formState: { isDirty: true, errors: {} },
    })

    defaultProps.onSave.mockRejectedValue(new Error('API Failure'))

    renderWithContext(hookForm)

    const continueBtn = document.getElementById('draft-goals-objectives-save-continue')
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(defaultProps.updateErrorMessage).toHaveBeenCalledWith(expect.stringContaining('A network error has prevented us from saving'))
    })
  })
})

describe('ActivityReportNavigator autosave with shouldUpdateFormData', () => {
  const defaultProps = {
    editable: true,
    currentPage: 'activity-summary',
    additionalData: {},
    reportId: 1,
    isApprover: false,
    isPendingApprover: false,
    onFormSubmit: jest.fn(),
    onSave: jest.fn(),
    onReview: jest.fn(),
    updatePage: jest.fn(),
    updateLastSaveTime: jest.fn(),
    updateErrorMessage: jest.fn(),
    setShouldAutoSave: jest.fn(),
    shouldAutoSave: true,
    autoSaveInterval: 200,
    pages: [
      {
        path: 'activity-summary',
        label: 'Activity Summary',
        position: 0,
        review: false,
        isPageComplete: jest.fn().mockReturnValue(false),
        render: (_additionalData, _formData, _reportId, _isAppLoading, onContinue, onSaveDraft, onUpdatePage) => (
          <>
            <div>Activity Summary</div>
            <NavigatorButtons
              isAppLoading={false}
              onContinue={onContinue}
              onSaveDraft={onSaveDraft}
              onUpdatePage={onUpdatePage}
              position={0}
              path="activity-summary"
            />
          </>
        ),
      },
      {
        path: 'goals-objectives',
        label: 'Goals',
        position: 2,
        review: false,
        isPageComplete: jest.fn().mockReturnValue(false),
        render: () => <div>Goals</div>,
      },
      {
        path: 'review',
        label: 'Review',
        position: 3,
        review: true,
        render: () => <div />,
      },
    ],
  }

  const mockAppLoadingContext = {
    isAppLoading: false,
    setIsAppLoading: jest.fn(),
    setAppLoadingText: jest.fn(),
  }

  const createMockHookForm = (overrides = {}) => ({
    getValues: jest.fn((field) => {
      const values = {
        regionId: 1,
        activityRecipients: [],
        ...overrides.values,
      }
      return field ? values[field] : values
    }),
    setValue: jest.fn(),
    setError: jest.fn(),
    errors: overrides.errors || {},
    watch: jest.fn((field) => {
      if (field === 'goalForEditing') return null
      if (field === 'goals') return []
      if (field === 'activityRecipients') return []
      if (field === 'pageState') return {}
      return null
    }),
    trigger: jest.fn().mockResolvedValue(true),
    reset: jest.fn(),
    formState: overrides.formState || { isDirty: true, errors: {} },
  })

  const renderWithContext = (hookForm, props = {}) =>
    render(
      <AppLoadingContext.Provider value={mockAppLoadingContext}>
        <ActivityReportNavigator {...defaultProps} {...props} hookForm={hookForm} />
      </AppLoadingContext.Provider>
    )

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    defaultProps.onSave.mockReset()
    defaultProps.updateErrorMessage.mockReset()
    mockAppLoadingContext.setIsAppLoading.mockReset()
    mockAppLoadingContext.setAppLoadingText.mockReset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('calls reset() during autosave when cursor is NOT in rich text editor', async () => {
    const hookForm = createMockHookForm()
    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    // Mock shouldUpdateFormData to return true (cursor NOT in RTE)
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([])

    renderWithContext(hookForm)

    // Trigger autosave by advancing timers
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
      expect(hookForm.reset).toHaveBeenCalledWith({ id: 1, goals: [] }, { errors: true })
    })
  })

  it('does NOT call reset() during autosave when cursor is in rich text editor', async () => {
    const hookForm = createMockHookForm()
    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    // Mock shouldUpdateFormData to return false (cursor in RTE)
    const mockEditor = {
      contains: jest.fn(() => true),
    }
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    renderWithContext(hookForm)

    // Trigger autosave by advancing timers
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
    })

    // reset should NOT be called when cursor is in RTE during autosave
    expect(hookForm.reset).not.toHaveBeenCalled()
  })

  it('always calls reset() during manual save regardless of cursor position', async () => {
    const hookForm = createMockHookForm()
    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    // Mock shouldUpdateFormData to return false (cursor in RTE)
    const mockEditor = {
      contains: jest.fn(() => true),
    }
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    renderWithContext(hookForm)

    // Click Save Draft button (manual save)
    const saveDraftButton = screen.getByRole('button', { name: /save draft/i })
    fireEvent.click(saveDraftButton)

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
      // reset SHOULD be called even with cursor in RTE for manual saves
      expect(hookForm.reset).toHaveBeenCalledWith({ id: 1, goals: [] }, { errors: true })
    })
  })

  it('always calls updateLastSaveTime regardless of shouldUpdateFormData result', async () => {
    const hookForm = createMockHookForm()
    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    // Mock shouldUpdateFormData to return false (cursor in RTE)
    const mockEditor = {
      contains: jest.fn(() => true),
    }
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    renderWithContext(hookForm)

    // Trigger autosave
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
      expect(defaultProps.updateLastSaveTime).toHaveBeenCalled()
    })
  })

  it('does not show loading screen during autosave', async () => {
    const hookForm = createMockHookForm()
    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    renderWithContext(hookForm)

    // Trigger autosave
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
    })

    // Loading screen should NOT be shown for autosave
    expect(mockAppLoadingContext.setAppLoadingText).not.toHaveBeenCalled()
  })

  it('shows loading screen during manual save', async () => {
    const hookForm = createMockHookForm()
    defaultProps.onSave.mockResolvedValue({ id: 1, goals: [] })

    renderWithContext(hookForm)

    // Click Save Draft button (manual save)
    const saveDraftButton = screen.getByRole('button', { name: /save draft/i })
    fireEvent.click(saveDraftButton)

    await waitFor(() => {
      expect(mockAppLoadingContext.setAppLoadingText).toHaveBeenCalledWith('Saving')
      expect(mockAppLoadingContext.setIsAppLoading).toHaveBeenCalledWith(true)
    })
  })
})
