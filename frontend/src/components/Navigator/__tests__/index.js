/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import Navigator from '..';
import UserContext from '../../../UserContext';
import { NOT_STARTED } from '../constants';
import NetworkContext from '../../../NetworkContext';
import AppLoadingContext from '../../../AppLoadingContext';
import NavigatorButtons from '../components/NavigatorButtons';

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
      formData,
      _additionalData,
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

  const NavigatorWithForm = ({
    onSaveAndContinue = jest.fn(),
    currentPage = 'first',
    onSubmit = jest.fn(),
    onSave = jest.fn(),
    onSaveDraft = jest.fn(),
    updatePage = jest.fn(),
    pages = defaultPages,
    formData = initialData,
    onUpdateError = jest.fn(),
    editable = true,
    hideSideNav = false,
    autoSaveInterval = 500,
    shouldAutoSave = true,
  } = {}) => {
    const hookForm = useForm({
      defaultValues: formData,
    });

    const data = hookForm.watch();

    return (
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
            <FormProvider {...hookForm}>
              <Navigator
                formData={data}
                onSaveAndContinue={onSaveAndContinue}
                onSaveDraft={onSaveDraft}
                draftSaver={jest.fn()}
                editable={editable}
                reportId={1}
                submitted={false}
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
                updateShowSavedDraft={jest.fn()}
                showSavedDraft={false}
                hideSideNav={hideSideNav}
                autoSaveInterval={autoSaveInterval}
                shouldAutoSave={shouldAutoSave}
                setShouldAutoSave={jest.fn()}
              />
            </FormProvider>
          </AppLoadingContext.Provider>
        </NetworkContext.Provider>
      </UserContext.Provider>
    );
  };

  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (params) => {
    render(
      <NavigatorWithForm {...params} />,
    );
  };

  beforeEach(() => {
    fetchMock.post('/api/activity-reports/goals', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('calls on save and continue if passed in', async () => {
    const onSaveAndContinue = jest.fn();
    renderNavigator({ onSaveAndContinue });

    const onSaveButton = screen.getByText('Save and continue');
    act(() => {
      userEvent.click(onSaveButton);
    });

    expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
  });

  it('hides the side nav when the hideSideNav prop is true', async () => {
    renderNavigator({ hideSideNav: true });

    // Expect not to find the class 'smart-hub-sidenav-wrapper' in the document.
    expect(screen.queryAllByTestId('side-nav').length).toBe(0);
  });

  it('shows the side nav when the hideSideNav prop is false', async () => {
    renderNavigator({ hideSideNav: false });

    // Expect to find the test id 'side-nav' in the document.
    expect(screen.getByTestId('side-nav')).toBeInTheDocument();
  });

  it('autosaves when the shouldAutoSave prop is true', async () => {
    const onSaveDraft = jest.fn();
    renderNavigator({ shouldAutoSave: true, onSaveDraft });

    // mark the form as dirty so that onSave is called
    await act(() => waitFor(() => {
      userEvent.click(screen.getByTestId('first'));
    }));

    // Fast-forward time to trigger the autosave interval
    await act(() => waitFor(() => {
      jest.advanceTimersByTime(800);
    }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledTimes(1);
    });
  });

  it('does not autosave when the shouldAutoSave prop is false', async () => {
    const onSaveDraft = jest.fn();
    renderNavigator({ shouldAutoSave: false, onSaveDraft });

    // mark the form as dirty
    await act(() => waitFor(() => {
      userEvent.click(screen.getByTestId('first'));
    }));

    // Fast-forward time to trigger the autosave interval
    await act(() => waitFor(() => {
      jest.advanceTimersByTime(800);
    }));

    expect(onSaveDraft).toHaveBeenCalledTimes(0);
  });
});
