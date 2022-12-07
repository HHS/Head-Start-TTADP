import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import Navigator from '../index';
import { SocketContext } from '../../SocketProvider';
import UserContext from '../../../UserContext';
import { NOT_STARTED, IN_PROGRESS } from '../constants';
import NetworkContext from '../../../NetworkContext';
import AppLoadingContext from '../../../AppLoadingContext';

// mocks for socket provider
const send = jest.fn();
const socket = { send };
const store = null;
const clearStore = jest.fn();

// user mock
const user = {
  name: 'test@test.com',
};

// eslint-disable-next-line react/prop-types
const Input = ({ name, required }) => {
  const { register } = useFormContext();
  return (
    <input
      type="radio"
      data-testid={name}
      name={name}
      ref={register({ required })}
    />
  );
};

const GoalTest = () => {
  const { register } = useFormContext();
  return (
    <>
      <h1>Goal test</h1>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label htmlFor="goalName">Name</label>
      <input type="text" id="goalName" name="goalName" ref={register()} />
    </>
  );
};

const defaultPages = [
  {
    position: 1,
    path: 'first',
    label: 'first page',
    review: false,
    render: () => (
      <Input name="first" required />
    ),
  },
  {
    position: 2,
    path: 'second',
    label: 'second page',
    review: false,
    render: () => (
      <Input name="second" required />
    ),
  },
  {
    position: 3,
    path: 'third',
    label: 'third page',
    review: false,
    render: () => (
      <Input name="third" required />
    ),
  },
  {
    position: 4,
    label: 'review page',
    path: 'review',
    review: true,
    render: (formData, onFormSubmit) => (
      <div>
        <Input name="fourth" required />
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
};

describe('Navigator', () => {
  beforeAll(async () => jest.useFakeTimers());

  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (
    currentPage = 'first',
    onSubmit = jest.fn(),
    onSave = jest.fn(),
    updatePage = jest.fn(),
    updateForm = jest.fn(),
    pages = defaultPages,
    formData = initialData,
    onUpdateError = jest.fn(),
  ) => {
    render(
      <SocketContext.Provider value={{ socket, store, clearStore }}>
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
        </UserContext.Provider>
      </SocketContext.Provider>,
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const first = await screen.findByRole('button', { name: 'first page In Progress' });
    await waitFor(() => expect(within(first).getByText('In Progress')).toBeVisible());
  });

  it('onContinue calls onSave with correct page position', async () => {
    const onSave = jest.fn();
    renderNavigator('second', () => {}, onSave);

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'));

    userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      {
        pageState: {
          ...initialData.pageState, 2: IN_PROGRESS,
        },
        regionId: 1,
        goals: [],
        objectivesWithoutGoals: [],
        second: 'on',
        activityRecipientType: 'recipient',
        activityRecipients: [],
      },
    ));
  });

  it('submits data when "continuing" from the review page', async () => {
    const onSubmit = jest.fn();
    renderNavigator('review', onSubmit);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('onBack calls onUpdatePage', async () => {
    const updatePage = jest.fn();
    renderNavigator('third', () => {}, () => {}, updatePage);
    const button = await screen.findByRole('button', { name: 'Back' });
    userEvent.click(button);
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(2));
  });

  it('calls onSave on navigation', async () => {
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    renderNavigator('second', () => {}, () => {}, updatePage, updateForm);

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'));

    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));

    await waitFor(() => expect(
      updateForm,
    ).toHaveBeenCalledWith({
      ...initialData,
      pageState: { ...initialData.pageState, 2: IN_PROGRESS },
      second: 'on',
    }));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1));
  });

  it('publishes to socket', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    renderNavigator('second', onSubmit, onSave, updatePage, updateForm);

    jest.runOnlyPendingTimers();
    expect(send).toHaveBeenCalled();

    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));
    await waitFor(() => expect(updateForm).toHaveBeenCalledWith(
      { ...initialData, second: null },
    ));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1));

    expect(clearStore).toHaveBeenCalled();
  });

  it('shows the correct buttons on the bottom of the page', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const pages = [{
      position: 1,
      path: 'goals-objectives',
      label: 'first page',
      review: false,
      render: () => (
        <>
          <h1>Goal test</h1>
        </>
      ),
    }];
    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages);
    const saveGoal = await screen.findByRole('button', { name: 'Save goal' });
    userEvent.click(saveGoal);
    expect(saveGoal).toBeVisible();
  });

  it('shows the save button when the data is valid', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const pages = [{
      position: 1,
      path: 'goals-objectives',
      label: 'first page',
      review: false,
      render: () => (
        <>
          <h1>Goal test</h1>
        </>
      ),
    }];

    const formData = {
      ...initialData,
      activityRecipientType: 'grant',
      activityRecipients: [],
      goalForEditing: {
        isNew: true,
      },
      goals: [],
      goalEndDate: '09/01/2020',
      goalIsRttapa: 'Yes',
      goalName: 'goal name',
      'goalForEditing.objectives': [{
        title: 'objective',
        topics: ['test'],
        ttaProvided: 'tta provided',
        resources: [],
      }],
    };

    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, formData);
    const saveGoal = await screen.findByRole('button', { name: 'Save goal' });
    expect(saveGoal.textContent).toBe('Save goal');
    expect(saveGoal).toBeVisible();
    fetchMock.post('/api/activityReports/goals', 200);
    await act(async () => userEvent.click(saveGoal));
    expect(saveGoal.textContent).toBe('Save and continue');
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

    renderNavigator('second', onSubmit, onSave, updatePage, updateForm, defaultPages, initialData, onUpdateError);

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'));

    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));

    expect(onSave).toHaveBeenCalled();
    expect(onUpdateError).toHaveBeenCalled();
  });

  it('runs the autosave not on the goals and objectives page', async () => {
    const onSave = jest.fn();
    renderNavigator('second', () => {}, onSave);

    // mark the form as dirty
    const input = screen.getByTestId('second');
    userEvent.click(input);

    jest.advanceTimersByTime(1000 * 60 * 2);
    expect(onSave).toHaveBeenCalled();
  });

  it('does not run the autosave when the form is clean', async () => {
    const onSave = jest.fn();
    renderNavigator('second', () => {}, onSave);
    jest.advanceTimersByTime(1000 * 60 * 2);
    expect(onSave).toHaveBeenCalledTimes(0);
  });

  it('runs the autosave on the goals and objectives page', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();

    const pages = [{
      position: 1,
      path: 'goals-objectives',
      label: 'first page',
      review: false,
      render: () => (
        <GoalTest />
      ),
    }];
    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages);
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    act(() => {
      fetchMock.post('/api/activity-reports/goals', []);
      userEvent.type(screen.getByLabelText('Name'), 'test');
      jest.advanceTimersByTime(1000 * 60 * 2);
    });
    await waitFor(() => expect(fetchMock.called('/api/activity-reports/goals')).toBe(true));
  });

  it('disables the save button', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const pages = [{
      position: 1,
      path: 'goals-objectives',
      label: 'first page',
      review: false,
      render: () => (
        <GoalTest />
      ),
    }];
    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages);
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    await act(async () => {
      userEvent.type(screen.getByLabelText('Name'), 'test');
      jest.advanceTimersByTime(1000 * 60 * 2);
    });
    const saveButton = await screen.findByRole('button', { name: /Save goal/i });
    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it('runs the autosave on the other entity objectives page', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    const pages = [{
      position: 1,
      path: 'goals-objectives',
      label: 'first page',
      review: false,
      render: () => (
        <>
          <h1>OE Objectives test</h1>
        </>
      ),
    }];

    const oeData = {
      ...initialData,
      activityRecipientType: 'other-entity',
    };

    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, oeData);
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    jest.advanceTimersByTime(1000 * 60 * 2);
    fetchMock.post('api/activity-reports/objectives', []);
    expect(fetchMock.called('api/activity-reports/objectives')).toBe(false);
  });
});
