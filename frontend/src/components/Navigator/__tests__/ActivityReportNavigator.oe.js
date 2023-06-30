/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React, { useContext } from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useFormContext } from 'react-hook-form';
import Navigator from '../ActivityReportNavigator';
import UserContext from '../../../UserContext';
import { NOT_STARTED, COMPLETE } from '../constants';
import NetworkContext from '../../../NetworkContext';
import AppLoadingContext from '../../../AppLoadingContext';
import GoalFormContext from '../../../GoalFormContext';

// user mock
const user = {
  name: 'test@test.com',
};

// eslint-disable-next-line react/prop-types
const Input = ({
  name,
  required,
  type = 'radio',
  onUpdatePage = jest.fn(),
  onSaveDraft = jest.fn(),
}) => {
  const { register } = useFormContext();
  const {
    isObjectiveFormClosed,
  } = useContext(GoalFormContext);

  const onClick = () => {
    onUpdatePage(isObjectiveFormClosed ? 'Closed' : 'Open');
  };

  const draft = () => {
    onSaveDraft();
  };

  return (
    <>
      <input
        type={type}
        data-testid={name}
        name={name}
        ref={register({ required })}
      />

      <button onClick={onClick} type="button">
        Button
      </button>

      <button onClick={draft} type="button">
        Draft
      </button>
    </>
  );
};

const defaultPages = [
  {
    position: 1,
    path: 'goals-objectives',
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
];

const initialData = {
  pageState: { 1: COMPLETE, 2: NOT_STARTED },
  regionId: 1,
  goals: [],
  activityRecipients: [],
  activityRecipientType: 'other-entity',
  'goalForEditing.objectives': [],
  objectivesWithoutGoals: [{
    topics: [{}],
    title: 'test',
    ttaProvided: 'test',
    resources: ['http://www.test.com'],
  }],
  goalPrompts: ['test-prompt', 'test-prompt-error'],
  'test-prompt': ['test'],
};

describe('ActivityReportNavigator - OE reports', () => {
  beforeAll(async () => {
    jest.useFakeTimers();
  });

  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (
    updatePage = jest.fn(),
    onSave = jest.fn(),

    formData = initialData,
    updateForm = jest.fn(),
    onUpdateError = jest.fn(),
  ) => {
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
              editable
              reportId={1}
              submitted={false}
              formData={formData}
              updateFormData={updateForm}
              onReview={() => {}}
              isApprover={false}
              defaultValues={{ first: '', second: '' }}
              pages={defaultPages}
              currentPage="goals-objectives"
              onFormSubmit={jest.fn()}
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
  };

  beforeEach(() => {
    fetchMock.post('/api/activity-reports/objectives', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('calls the onUpdatePage function', async () => {
    const onUpdatePage = jest.fn();
    const onSaveDraft = jest.fn();
    renderNavigator(onUpdatePage, onSaveDraft);

    const first = await screen.findByRole('button', { name: 'first page Complete' });
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible());

    const saveAndContinue = await screen.findByRole('button', { name: /button/i });
    userEvent.click(saveAndContinue);
    await waitFor(() => expect(onUpdatePage).toHaveBeenCalledWith('Open'));
  });

  it('saves draft', async () => {
    renderNavigator();

    // assert fetchmock called to be false
    await waitFor(() => expect(fetchMock.called()).toBe(false));

    const first = await screen.findByRole('button', { name: 'first page Complete' });
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible());

    const saveAndContinue = await screen.findByRole('button', { name: /draft/i });
    userEvent.click(saveAndContinue);

    await waitFor(() => expect(fetchMock.called()).toBe(true));
  });

  it('handles fetch error', async () => {
    // clear out fetch mock
    fetchMock.restore();
    fetchMock.post('/api/activity-reports/objectives', 500);

    renderNavigator();

    // assert fetchmock called to be false
    await waitFor(() => expect(fetchMock.called()).toBe(false));

    const first = await screen.findByRole('button', { name: 'first page Complete' });
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible());

    const saveAndContinue = await screen.findByRole('button', { name: /draft/i });
    userEvent.click(saveAndContinue);

    await waitFor(() => expect(fetchMock.called()).toBe(true));
  });

  it('runs the auto save', async () => {
    renderNavigator();

    // assert fetchmock called to be false
    await waitFor(() => expect(fetchMock.called()).toBe(false));

    const first = await screen.findByRole('button', { name: 'first page Complete' });
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible());

    // click on first input
    const firstInput = await screen.findByTestId('first');
    userEvent.click(firstInput);

    // wait one year
    act(() => {
      jest.advanceTimersByTime(1000 * 60 * 5);
    });

    await waitFor(() => expect(fetchMock.called()).toBe(true));
  });
});
