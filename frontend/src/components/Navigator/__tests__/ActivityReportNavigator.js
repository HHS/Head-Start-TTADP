/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useFormContext } from 'react-hook-form';
import Navigator, {
  getPrompts,
  getPromptErrors,
  packageGoals,
  shouldUpdateFormData,
  formatEndDate,
} from '../ActivityReportNavigator';
import UserContext from '../../../UserContext';
import { NOT_STARTED, IN_PROGRESS } from '../constants';
import NetworkContext from '../../../NetworkContext';
import AppLoadingContext from '../../../AppLoadingContext';
import NavigatorButtons from '../components/NavigatorButtons';
import RichEditor from '../../RichEditor';

// user mock
const user = {
  name: 'test@test.com',
};

// eslint-disable-next-line react/prop-types
const Input = ({
  name,
  required,
  type = 'radio',
  position,
  path,
  onUpdatePage = jest.fn(),
  onSaveDraft = jest.fn(),
  onContinue = jest.fn(),
}) => {
  const { register } = useFormContext();
  return (
    <>
      <input
        type={type}
        data-testid={name}
        name={name}
        ref={register({ required })}
      />
      <NavigatorButtons
        isAppLoading={false}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        position={position}
        path={path}
      />
    </>
  );
};

const defaultPages = [
  {
    position: 1,
    path: 'first',
    label: 'first page',
    review: false,
    render: (
      _additionalData,
      _formData,
      _reportId,
      _isAppLoading,
      onContinue,
      onSaveDraft,
      onUpdatePage,
    ) => (
      <Input
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        name="first"
        position={1}
        path="first"
        required
      />
    ),
  },
  {
    position: 2,
    path: 'second',
    label: 'second page',
    review: false,
    render: (
      _additionalData,
      _formData,
      _reportId,
      _isAppLoading,
      onContinue,
      onSaveDraft,
      onUpdatePage,
    ) => (
      <Input
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        name="second"
        position={2}
        path="second"
        required
      />
    ),
  },
  {
    position: 3,
    path: 'third',
    label: 'third page',
    review: false,
    render: (
      _additionalData,
      _formData,
      _reportId,
      _isAppLoading,
      onContinue,
      onSaveDraft,
      onUpdatePage,
    ) => (
      <Input
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        onUpdatePage={onUpdatePage}
        name="third"
        position={3}
        path="third"
        required
      />
    ),
  },
  {
    position: 4,
    label: 'review page',
    path: 'review',
    review: true,
    render: (
      _formData,
      onFormSubmit,
    ) => (
      <div>
        <Input
          name="fourth"
          position={4}
          path="review"
          required
        />
        <button type="button" data-testid="review" onClick={onFormSubmit}>Continue</button>
      </div>
    ),
  },
];

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
};

describe('Navigator', () => {
  beforeAll(async () => {
    jest.useFakeTimers();
  });

  // eslint-disable-next-line arrow-body-style
  const renderNavigator = async (
    currentPage = 'first',
    onSubmit = jest.fn(),
    onSave = jest.fn(),
    updatePage = jest.fn(),
    updateForm = jest.fn(),
    pages = defaultPages,
    formData = initialData,
    onUpdateError = jest.fn(),
    editable = true,
  ) => {
    await act(() => waitFor(() => {
      render(
        <UserContext.Provider value={{ user }}>
          <NetworkContext.Provider value={{
            connectionActive: true,
            localStorageAvailable: true,
          }}
          >
            <AppLoadingContext.Provider value={{
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }}
            >
              <Navigator
                draftSaver={jest.fn()}
                editable={editable}
                reportId={1}
                submitted={false}
                formData={formData}
                updateFormData={updateForm}
                onReview={() => {}}
                isApprover={false}
                defaultValues={{ first: '', second: '' }}
                pages={pages}
                currentPage={currentPage}
                onFormSubmit={onSubmit}
                updatePage={updatePage}
                onSave={onSave}
                updateErrorMessage={onUpdateError}
                onResetToDraft={() => {}}
                updateLastSaveTime={() => {}}
                isPendingApprover={false}
              />
            </AppLoadingContext.Provider>
          </NetworkContext.Provider>
        </UserContext.Provider>,
      );
    }));
  };

  beforeEach(() => {
    fetchMock.post('/api/activity-reports/goals', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('sets dirty forms as "in progress"', async () => {
    await renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const first = await screen.findByRole('button', { name: 'first page In Progress' });
    await waitFor(() => expect(within(first).getByText('In Progress')).toBeVisible());
  });

  it('doesn\'t allow saving if the form is not editable', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const onUpdateError = jest.fn();
    const isEditable = false;
    await renderNavigator(
      'first',
      onSubmit,
      onSave,
      updatePage,
      updateForm,
      defaultPages,
      initialData,
      onUpdateError,
      isEditable,
    );

    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);

    await act(async () => userEvent.click(await screen.findByRole('button', { name: 'Save draft' })));
    expect(fetchMock.called()).toBe(false);
  });

  it('onContinue calls onSave with correct page position', async () => {
    const onSave = jest.fn();
    await renderNavigator('second', () => {}, onSave);

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'));

    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      {
        ...initialData,
        pageState: {
          ...initialData.pageState, 2: IN_PROGRESS,
        },
        second: 'on',
      },
      false,
    ));
  });

  it('submits data when "continuing" from the review page', async () => {
    const onSubmit = jest.fn();
    await renderNavigator('review', onSubmit);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('onBack calls onUpdatePage', async () => {
    const updatePage = jest.fn();
    await renderNavigator('third', () => {}, () => {}, updatePage);
    const button = await screen.findByRole('button', { name: 'Back' });
    userEvent.click(button);
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(2));
  });

  it('calls onSave on navigation', async () => {
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const onSave = jest.fn();
    await renderNavigator('second', jest.fn(), onSave, updatePage, updateForm);

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'));

    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));

    await waitFor(() => expect(
      onSave,
    ).toHaveBeenCalledWith({
      ...initialData,
      pageState: { ...initialData.pageState, 2: IN_PROGRESS },
      second: 'on',
    }, false));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1));
  });

  it('shows an error when save fails', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();

    onSave.mockImplementationOnce(async () => {
      throw new Error();
    });

    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const onUpdateError = jest.fn();

    await renderNavigator('second', onSubmit, onSave, updatePage, updateForm, defaultPages, initialData, onUpdateError);

    // mark the form as dirty so that onSave is called
    await act(() => waitFor(() => {
      userEvent.click(screen.getByTestId('second'));
    }));

    await act(() => waitFor(async () => {
      userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));
    }));

    expect(onSave).toHaveBeenCalled();
    expect(onUpdateError).toHaveBeenCalled();
  });

  it('runs the autosave not on the goals and objectives page', async () => {
    const onSave = jest.fn();
    await renderNavigator('second', () => {}, onSave);

    // mark the form as dirty
    const input = screen.getByTestId('second');
    userEvent.click(input);

    jest.advanceTimersByTime(1000 * 60 * 2);
    expect(onSave).toHaveBeenCalled();
  });

  it('does not run the autosave when the form is clean', async () => {
    const onSave = jest.fn();
    await renderNavigator('second', () => {}, onSave);
    jest.advanceTimersByTime(1000 * 60 * 2);
    expect(onSave).toHaveBeenCalledTimes(0);
  });
});

describe('shouldUpdateFormData', () => {
  it('if isAutoSave is false, returns true', () => {
    expect(shouldUpdateFormData(false)).toBe(true);
  });

  it('if we are focused on a rich editor, return false', async () => {
    const previousContains = HTMLDivElement.prototype.contains;
    HTMLDivElement.prototype.contains = () => true;

    render(
      <div>
        <label>
          Rich Editor
          <RichEditor ariaLabel="rich editor" value="test" onChange={jest.fn()} onBlur={jest.fn()} />
        </label>
      </div>,
    );

    const richEditor = await screen.findByRole('textbox', { name: 'rich editor' });
    act(() => {
      richEditor.focus();
    });

    expect(shouldUpdateFormData(true)).toBe(false);
    HTMLDivElement.prototype.contains = previousContains;
  });
});

describe('formatEndDate', () => {
  it('returns the formEndDate if it is not invalid', () => {
    expect(formatEndDate('09/01/2020')).toBe('09/01/2020');
  });

  it('returns an empty string if the formEndDate is invalid', () => {
    expect(formatEndDate('invalid date')).toBe('');
  });
});

describe('getPrompts', () => {
  it('returns an empty array if there are no prompt titles', () => {
    const getValues = jest.fn(() => ['test']);
    const prompts = getPrompts(null, getValues);
    expect(prompts).toEqual([]);
  });

  it('returns prompts with responses', () => {
    const getValues = jest.fn(() => ['test']);
    const prompts = getPrompts(
      [
        {
          promptId: 1,
          title: 'test',
          fieldName: 'test',
        },
      ],
      getValues,
    );

    expect(prompts).toEqual([
      {
        promptId: 1,
        title: 'test',
        response: ['test'],
      },
    ]);
  });
});

describe('getPromptErrors', () => {
  const oldQuerySelector = document.querySelector;
  afterAll(() => {
    document.querySelector = oldQuerySelector;
  });

  it('returns true if there are errors', async () => {
    document.querySelector = jest.fn(() => null);
    const errors = { prompt: 'error' };
    const prompts = [{ fieldName: 'prompt' }];
    expect(getPromptErrors(prompts, errors)).toBe(true);
  });

  it('focuses if there are errors', async () => {
    const focus = jest.fn();
    document.querySelector = jest.fn(() => ({ focus }));
    const errors = { prompt: 'error' };
    const prompts = [{ fieldName: 'prompt' }];
    expect(getPromptErrors(prompts, errors)).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  it('returns false if there are no errors', async () => {
    document.querySelector = jest.fn(() => null);
    const errors = {};
    const prompts = [{ fieldName: 'prompt' }];
    expect(getPromptErrors(prompts, errors)).toBe(false);
  });

  it('returns false if there are no prompts', async () => {
    document.querySelector = jest.fn(() => null);
    const errors = {};
    expect(getPromptErrors(null, errors)).toBe(false);
  });
});

describe('packageGoals', () => {
  it('correctly formats goals with multiple recipients', () => {
    const grantIds = [1, 2];
    const packagedGoals = packageGoals(
      [
        {
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
        },
      ],
      {
        name: 'recipient',
        endDate: '09/01/2020',
        isActivelyBeingEditing: true,
      },
      grantIds,
      [{ fieldName: 'prompt2' }],
    );

    expect(packagedGoals).toEqual([
      {
        name: 'goal name',
        endDate: '09/01/2020',
        prompts: [],
        grantIds,
        isActivelyBeingEditing: false,
      },
      {
        name: 'recipient',
        endDate: '09/01/2020',
        isActivelyBeingEditing: true,
        grantIds,
        prompts: [],
      },
    ]);
  });

  it('correctly formats goals for a single recipient', () => {
    const grantIds = [1];
    const packagedGoals = packageGoals(
      [
        {
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
        },
      ],
      {
        name: 'recipient',
        endDate: '09/01/2020',
        isActivelyBeingEditing: true,
      },
      grantIds,
      [{ fieldName: 'prompt2' }],
    );

    expect(packagedGoals).toEqual([
      {
        name: 'goal name',
        endDate: '09/01/2020',
        prompts: [{ fieldName: 'prompt' }],
        grantIds,
        isActivelyBeingEditing: false,
      },
      {
        name: 'recipient',
        endDate: '09/01/2020',
        isActivelyBeingEditing: true,
        grantIds,
        prompts: [{ fieldName: 'prompt2' }],
      },
    ]);
  });
  it('skips returning edited goal if edited goal is null', () => {
    const grantIds = [1];
    const packagedGoals = packageGoals(
      [
        {
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
        },
      ],
      null,
      grantIds,
      [{ fieldName: 'prompt2' }],
    );

    expect(packagedGoals).toEqual([
      {
        name: 'goal name',
        endDate: '09/01/2020',
        prompts: [{ fieldName: 'prompt' }],
        grantIds,
        isActivelyBeingEditing: false,
      },
    ]);
  });
  it('skips returning edited goal if edited goal has no name', () => {
    const grantIds = [1];
    const packagedGoals = packageGoals(
      [
        {
          name: 'goal name',
          endDate: '09/01/2020',
          prompts: [{ fieldName: 'prompt' }],
        },
      ],
      {
        name: '',
        endDate: '',
        isActivelyBeingEditing: true,
      },
      grantIds,
      [{ fieldName: 'prompt2' }],
    );

    expect(packagedGoals).toEqual([
      {
        name: 'goal name',
        endDate: '09/01/2020',
        prompts: [{ fieldName: 'prompt' }],
        grantIds,
        isActivelyBeingEditing: false,
      },
    ]);
  });
});
