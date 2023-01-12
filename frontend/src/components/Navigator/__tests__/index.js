/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React, { useContext } from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { useFormContext } from 'react-hook-form/dist/index.ie11';
import Navigator from '../index';
import UserContext from '../../../UserContext';
import { NOT_STARTED, IN_PROGRESS } from '../constants';
import NetworkContext from '../../../NetworkContext';
import AppLoadingContext from '../../../AppLoadingContext';
import GoalFormContext from '../../../GoalFormContext';
import RichEditor from '../../RichEditor';

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

const OETest = () => {
  const { isObjectivesFormClosed } = useContext(GoalFormContext);
  const { register } = useFormContext();
  return (
    <>
      <h1>
        { isObjectivesFormClosed ? 'Objective form closed' : 'Objective form open' }

      </h1>
      <div className="usa-error-message">
        <div className="ttahub-resource-repeater">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="goalName">Name</label>
          <input type="text" id="goalName" name="goalName" ref={register()} />
        </div>
      </div>
    </>
  );
};

const GoalTest = () => {
  const { register } = useFormContext();
  const mocker = jest.fn();
  return (
    <>
      <h1>Goal test</h1>
      <div className="usa-error-message">
        <div className="ttahub-resource-repeater">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="goalName">Name</label>
          <input type="text" id="goalName" name="goalName" ref={register()} />
        </div>
        { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
        <label>
          Rich Editor
          <RichEditor ariaLabel="rich editor" value="test" onChange={mocker} onBlur={mocker} />
        </label>
      </div>
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
  'goalForEditing.objectives': [],
};

describe('Navigator', () => {
  beforeAll(async () => {
    jest.useFakeTimers();
  });

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
    editable = true,
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
  };

  beforeEach(() => {
    fetchMock.post('/api/activity-reports/goals', []);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
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
    renderNavigator(
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
    renderNavigator('second', () => {}, onSave);

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
    const onSave = jest.fn();
    renderNavigator('second', jest.fn(), onSave, updatePage, updateForm);

    // mark the form as dirty so that onSave is called
    userEvent.click(screen.getByTestId('second'));

    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));

    await waitFor(() => expect(
      onSave,
    ).toHaveBeenCalledWith({
      ...initialData,
      pageState: { ...initialData.pageState, 2: IN_PROGRESS },
      second: 'on',
    }));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1));
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
        <GoalTest />
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
    await act(async () => userEvent.click(saveGoal));
    expect(saveGoal.textContent).toBe('Save and continue');
  });

  it('handles the case where end date = "Invalid date"', async () => {
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
      goalEndDate: 'Invalid date',
      goalIsRttapa: 'Yes',
      goalName: 'goal name',
      'goalForEditing.objectives': [{
        title: 'objective',
        topics: ['test'],
        ttaProvided: 'tta provided',
        resources: [],
      }],
    };

    fetchMock.restore();
    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, formData);
    const saveGoal = await screen.findByRole('button', { name: 'Save draft' });
    fetchMock.post('/api/activity-reports/goals', []);
    expect(fetchMock.called()).toBe(false);

    act(() => userEvent.click(saveGoal));

    const ajax = fetchMock.lastCall();
    expect(ajax[0]).toBe('/api/activity-reports/goals');
    const { endDate } = JSON.parse(ajax[1].body).goals[0];
    expect(endDate).toBe('');

    expect(fetchMock.called()).toBe(true);
  });

  it('returns the proper goal to be edited', async () => {
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
      goalEndDate: '09/01/2021',
      goalIsRttapa: 'Yes',
      goalName: 'goal name',
      'goalForEditing.objectives': [{
        title: 'objective',
        topics: ['test'],
        ttaProvided: 'tta provided',
        resources: [],
      }],
    };

    fetchMock.restore();
    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, formData);
    const saveGoal = await screen.findByRole('button', { name: 'Save draft' });
    fetchMock.post('/api/activity-reports/goals', [{
      name: 'goal name',
      endDate: 'fig pudding',
      activityReportGoals: [{ isActivelyEdited: true }],
      objectives: [],
    }]);
    expect(fetchMock.called()).toBe(false);
    act(() => userEvent.click(saveGoal));
    await waitFor(() => expect(fetchMock.called()).toBe(true));
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
    await waitFor(() => expect(updateForm).toHaveBeenCalled());
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

  it('won\'t save draft with invalid resources', async () => {
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

    const formData = {
      ...initialData,
      activityRecipientType: 'recipient',
      activityRecipients: [
        {
          id: 1,
          name: 'recipient',
          grant: {
            id: 1,
          },
        },
      ],
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
        resources: [{
          value: 'WHAT THE DEVIL IS THIS',
        }],
      }],
    };

    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, formData);
    const saveGoal = await screen.findByRole('button', { name: 'Save draft' });
    expect(saveGoal).toBeVisible();
    fetchMock.restore();
    act(() => userEvent.click(saveGoal));
    expect(fetchMock.called()).toBe(false);
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

  it('opens the objectives form if the objectives are invalid', async () => {
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
        <OETest />
      ),
    }];

    const oeData = {
      ...initialData,
      activityRecipientType: 'other-entity',
      objectives: [
        {
          taste: 'kind of bitter',
        },
      ],
    };

    act(() => renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, oeData));

    expect(await screen.findByText('Objective form open')).toBeVisible();
  });

  it('opens the objectives form if there are no objectives', async () => {
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
        <OETest />
      ),
    }];

    const oeData = {
      ...initialData,
      activityRecipientType: 'other-entity',
      objectives: [],
    };

    act(() => renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, oeData));

    expect(await screen.findByText('Objective form open')).toBeVisible();
  });

  it('handles invalid OE resources in the auto save', async () => {
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
        <OETest />
      ),
    }];

    const oeData = {
      ...initialData,
      activityRecipientType: 'other-entity',
      objectives: [
        {
          title: 'objective',
          topics: ['test'],
          ttaProvided: 'tta provided',
          resources: [{
            value: 'WHAT THE DEVIL IS THIS',
          }],
        },
      ],
    };

    act(() => renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, oeData));

    expect(await screen.findByText('Objective form open')).toBeVisible();
    fetchMock.restore();
    fetchMock.post('/api/activity-reports/objectives', [{
      title: 'objective',
      topics: ['test'],
      ttaProvided: 'tta provided',
      resources: [{
        value: 'https://test.com',
      }],
    }]);
    jest.advanceTimersByTime(1000 * 60 * 2);
    await waitFor(() => expect(fetchMock.called()).toBe(false));
  });

  it('OE auto save with valid resources', async () => {
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
        <OETest />
      ),
    }];

    const oeData = {
      ...initialData,
      activityRecipientType: 'other-entity',
      objectives: [
        {
          title: 'objective',
          topics: ['test'],
          ttaProvided: 'tta provided',
          resources: [{
            value: 'https://test.com',
          }],
        },
      ],
    };

    act(() => renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, oeData));

    expect(await screen.findByText('Objective form open')).toBeVisible();
    fetchMock.restore();
    fetchMock.post('/api/activity-reports/objectives', [{
      title: 'objective',
      topics: ['test'],
      ttaProvided: 'tta provided',
      resources: [{
        value: 'https://test.com',
      }],
    }]);
    jest.advanceTimersByTime(1000 * 60 * 2);
    await waitFor(() => expect(fetchMock.called()).toBe(false));
  });

  it('saves draft for an other entity report', async () => {
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
        <OETest />
      ),
    }];

    const formData = {
      ...initialData,
      activityRecipientType: 'other-entity',
      activityRecipients: [{ activityRecipientId: 1 }],
      goalForEditing: null,
      goals: [],
      objectivesWithoutGoals: [{
        title: 'objective',
        topics: ['test'],
        ttaProvided: 'tta provided',
        resources: [{
          value: 'https://test.com',
        }],
      }],
    };

    renderNavigator('goals-objectives', onSubmit, onSave, updatePage, updateForm, pages, formData);
    const saveDraft = await screen.findByRole('button', { name: 'Save draft' });
    expect(saveDraft).toBeVisible();
    fetchMock.restore();
    fetchMock.post('/api/activity-reports/objectives', [{
      title: 'objective',
      topics: ['test'],
      ttaProvided: 'tta provided',
      resources: [{
        value: 'https://test.com',
      }],
    }]);
    act(() => userEvent.click(saveDraft));
    await waitFor(() => expect(fetchMock.called()).toBe(true));
  });

  it('does not update form data if a rich editor is being edited', async () => {
    const onSubmit = jest.fn();
    const onSave = jest.fn();
    const updatePage = jest.fn();
    const updateForm = jest.fn();

    const previousContains = HTMLDivElement.prototype.contains;
    HTMLDivElement.prototype.contains = () => true;

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

    const ttaProvided = await screen.findByRole('textbox', { name: 'rich editor' });
    act(() => {
      ttaProvided.focus();
      fetchMock.post('/api/activity-reports/goals', []);
      userEvent.type(screen.getByLabelText('Name'), 'test');
      jest.advanceTimersByTime(1000 * 60 * 2);
    });
    await waitFor(() => expect(fetchMock.called('/api/activity-reports/goals')).toBe(true));
    HTMLDivElement.prototype.contains = previousContains;
    expect(updateForm).not.toHaveBeenCalled();
  });
});
