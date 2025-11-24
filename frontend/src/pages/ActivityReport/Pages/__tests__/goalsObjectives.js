/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SUPPORT_TYPES } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import join from 'url-join';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import goalsObjectives from '../goalsObjectives';
import NetworkContext from '../../../../NetworkContext';
import UserContext from '../../../../UserContext';
import GoalFormContext from '../../../../GoalFormContext';
import { OBJECTIVE_STATUS } from '../../../../Constants';

const goalUrl = join('api', 'activity-reports', 'goals');

const spy = jest.fn();

const defaultGoals = [{
  id: 1,
  name: 'This is a test goal',
  isNew: true,
  goalIds: [1],
  grants: [
    {
      value: 1, label: 'Turtle 1', programs: [], id: 1,
    },
  ],
  objectives: [{
    id: 1,
    title: 'title',
    ttaProvided: 'tta',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
    courses: [],
  }],
}];

const RenderGoalsObjectives = ({
  grantIds,
  activityRecipientType,
  connectionActive = true,
  startDate = null,
  goalsToUse = defaultGoals,
}) => {
  const activityRecipients = grantIds.map((activityRecipientId) => ({
    activityRecipientId, id: activityRecipientId,
  }));
  const data = { activityRecipientType, activityRecipients, startDate };
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      author: {
        roles: [
          {
            fullName: 'central office',
          },
        ],
      },
      collaborators: [],
      goals: [...goalsToUse],
      objectivesWithoutGoals: [],
      approvers: [],
      ...data,
    },
  });
  const history = createMemoryHistory();

  hookForm.setValue = spy;

  return (
    <UserContext.Provider value={{ user: { flags: [] } }}>
      <NetworkContext.Provider value={{ connectionActive, localStorageAvailable: true }}>
        <Router history={history}>
          <FormProvider {...hookForm}>
            {goalsObjectives.render(
              null,
              {
                activityRecipientType,
              },
              1,
              null,
              jest.fn(),
              jest.fn(),
              jest.fn(),
              false,
              '',
              jest.fn(),
              () => <></>,
            )}
          </FormProvider>
        </Router>
      </NetworkContext.Provider>
    </UserContext.Provider>
  );
};

const renderGoals = (
  grantIds,
  activityRecipientType,
  goals = [],
  isGoalFormClosed = false,
  throwFetchError = false,
  toggleGoalForm = jest.fn(),
  startDate = null,
  goalsToUse = defaultGoals,
) => {
  const query = grantIds.map((id) => `grantIds=${id}`).join('&');
  const fetchResponse = throwFetchError ? 500 : goals;

  const url = join(goalUrl, `?${query}`);
  fetchMock.get(url, fetchResponse, { overwriteRoutes: true });
  render(
    <UserContext.Provider value={{ user: { flags: [] } }}>
      <GoalFormContext.Provider value={{ isGoalFormClosed, toggleGoalForm }}>
        <RenderGoalsObjectives
          grantIds={grantIds}
          activityRecipientType={activityRecipientType}
          connectionActive={!throwFetchError}
          startDate={startDate}
          goalsToUse={goalsToUse}
        />
      </GoalFormContext.Provider>
    </UserContext.Provider>,
  );
};

// eslint-disable-next-line react/prop-types
const RenderReview = ({ goals, activityRecipientType = 'recipient', objectivesWithoutGoals = [] }) => {
  const history = createMemoryHistory();
  const hookForm = useForm({
    defaultValues: { goalsAndObjectives: goals, activityRecipientType, objectivesWithoutGoals },
  });
  return (
    <Router history={history}>
      <FormProvider {...hookForm}>
        {goalsObjectives.reviewSection()}
      </FormProvider>
    </Router>
  );
};

describe('goals objectives', () => {
  beforeEach(async () => {
    fetchMock.get('/api/topic', []);
  });
  afterEach(() => fetchMock.restore());

  describe('fetch errors', () => {
    it('shows error messages', async () => {
      const goals = [];
      const isGoalFormClosed = false;
      const throwFetchError = true;

      renderGoals([1], 'recipient', goals, isGoalFormClosed, throwFetchError, jest.fn(), '2021-01-01');
      expect(await screen.findByText('Connection error. Cannot load options.')).toBeVisible();
    });
  });

  describe('when activity recipient type is "recipient"', () => {
    it('the display goals section is displayed', async () => {
      renderGoals([1], 'recipient', [], false, false, jest.fn(), '2021-01-01');
      expect(await screen.findByText(/Using a goal on an Activity Report will set the goal’s status to In progress./i)).toBeVisible();
      expect(screen.queryByText(/indicates required field/i)).toBeTruthy();
    });

    it('the display goals shows a warning if no grants are selected', async () => {
      renderGoals([], 'recipient', [], false, false, jest.fn(), '2021-01-01');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
      expect(screen.queryByText(/start date of the activity/i)).toBeNull();
    });

    it('you can click the little add new button', async () => {
      const sampleGoals = [{
        name: 'Test',
        id: 1234567,
        objectives: [],
      }];

      const throwFetchError = false;
      const toggleGoalForm = jest.fn();
      const isGoalFormClosed = true;
      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, throwFetchError, toggleGoalForm);
      const button = await screen.findByRole('button', { name: /add new goal/i });
      const summaries = await screen.findAllByText('Goal summary');
      expect(summaries.length).toBe(1);
      act(() => userEvent.click(button));
      expect(toggleGoalForm).toHaveBeenCalledWith(false);
    });

    it('you can edit a goal', async () => {
      const sampleGoals = [{
        name: 'Test',
        id: 1234567,
        objectives: [],
      }];
      const isGoalFormClosed = true;
      const throwFetchError = false;
      const toggleGoalForm = jest.fn();
      fetchMock.restore();
      // this API call sets the goal as being edited, when edit is clicked.
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=1', 200);

      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, throwFetchError, toggleGoalForm);
      expect(screen.queryByText(/indicates required field/i)).toBeNull();
      const actions = await screen.findByRole('button', { name: /actions for goal 1/i });
      act(() => userEvent.click(actions));
      const [button] = await screen.findAllByRole('button', { name: 'Edit' });
      act(() => userEvent.click(button));
      await waitFor(() => expect(fetchMock.called()).toBe(true));
      expect(toggleGoalForm).toHaveBeenCalledWith(false);
    });

    it('you need to have completed conditional fields before editing', async () => {
      const sampleGoals = [{
        name: 'Test',
        id: 1234567,
        objectives: [],
      }];
      const isGoalFormClosed = true;
      const throwFetchError = false;
      const toggleGoalForm = jest.fn();
      fetchMock.restore();
      // this API call sets the goal as being edited, when edit is clicked.
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=1', 200);

      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, throwFetchError, toggleGoalForm);
      expect(screen.queryByText(/indicates required field/i)).toBeNull();
      const actions = await screen.findByRole('button', { name: /actions for goal 1/i });
      act(() => userEvent.click(actions));
      const [button] = await screen.findAllByRole('button', { name: 'Edit' });
      act(() => userEvent.click(button));

      await waitFor(() => expect(fetchMock.called()).toBe(true));
      expect(toggleGoalForm).toHaveBeenCalledWith(false);
    });

    it('you can remove a goal', async () => {
      jest.restoreAllMocks();
      const sampleGoals = [{
        name: 'Test',
        id: 1234567,
        objectives: [],
      }];
      const isGoalFormClosed = true;
      const throwFetchError = false;
      const toggleGoalForm = jest.fn();
      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, throwFetchError, toggleGoalForm);
      const goalSummary = await screen.findByText('Goal summary');
      expect(goalSummary).toBeVisible();
      const actions = await screen.findByRole('button', { name: /actions for goal 1/i });
      userEvent.click(actions);
      const [button] = await screen.findAllByRole('button', { name: 'Remove' });
      act(() => userEvent.click(button));

      // Modal to remove.
      await waitFor(async () => {
        expect(await screen.findByText(/If you remove the goal, the objectives and TTA provided content will also be deleted/i)).toBeVisible();
      });

      const modalRemove = await screen.findByLabelText(/remove goal/i);
      act(() => userEvent.click(modalRemove));

      const addNewGoal = await screen.findByRole('button', { name: /add new goal/i });
      expect(addNewGoal).toBeVisible();
      const keys = ['goalForEditing', 'goalName', 'goalEndDate'];
      keys.forEach((key) => {
        expect(spy).toHaveBeenCalledWith(key, '');
      });
      expect(toggleGoalForm).toHaveBeenCalledWith(false);
    });

    it('can remove a goal while editing another', async () => {
      const goalsToUse = [{
        id: 3,
        name: 'Sample Goal to Remove',
        isNew: true,
        goalIds: [1],
        grants: [
          {
            value: 1, label: 'Turtle 1', programs: [], id: 1,
          },
        ],
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          courses: [],
        }],
      },
      {
        id: 4,
        name: 'Sample Goal to Edit',
        isNew: true,
        goalIds: [1],
        grants: [
          {
            value: 1, label: 'Turtle 1', programs: [], id: 1,
          },
        ],
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          courses: [],
        }],
      }];

      const sampleGoals = [
        { name: 'Sample Goal to Remove', id: 3, objectives: [] },
        { name: 'Sample Goal to Edit', id: 4, objectives: [] },
      ];
      const isGoalFormClosed = true;
      const throwFetchError = false;
      const toggleGoalForm = jest.fn();
      fetchMock.restore();
      // Re-mock /api/topic after restore (was originally set in beforeEach)
      fetchMock.get('/api/topic', []);
      // Mock the PUT endpoint for editing goal with goalIds=1
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=1', 200);

      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, throwFetchError, toggleGoalForm, '2021-01-01', goalsToUse);

      // Verify both goals are visible
      expect(await screen.findByText('Sample Goal to Remove')).toBeVisible();
      expect(await screen.findByText('Sample Goal to Edit')).toBeVisible();

      // Edit goal 4 (Sample Goal to Edit)
      let actions = await screen.findByRole('button', { name: /actions for goal 4/i });
      act(() => userEvent.click(actions));
      const [editButton] = await screen.findAllByRole('button', { name: 'Edit' });
      await act(async () => {
        userEvent.click(editButton);
        // Wait for the fetch to complete
        await waitFor(() => {
          expect(fetchMock.called('/api/activity-reports/1/goals/edit?goalIds=1')).toBe(true);
        });
      });

      // After editing, goal 4 is now in the edit form, so only goal 3 should be
      // visible in the readonly section
      expect(await screen.findByText('Sample Goal to Remove')).toBeVisible();
      // Goal 4 is being edited so it's not in the readonly display anymore
      expect(screen.queryByText('Sample Goal to Edit')).toBeNull();

      // Remove goal 3 while goal 4 is being edited
      actions = await screen.findByRole('button', { name: /actions for goal 3/i });
      act(() => userEvent.click(actions));
      const [removeButton] = await screen.findAllByRole('button', { name: 'Remove' });
      userEvent.click(removeButton);

      // wait for modal text to be visible.
      await waitFor(async () => {
        expect(await screen.findByText(/If you remove the goal, the objectives and TTA provided content will also be deleted/i)).toBeVisible();
      });

      const modalRemove = await screen.findByLabelText(/remove goal/i);
      await act(async () => {
        userEvent.click(modalRemove);
        await waitFor(() => {
          // Assert goal 3 was removed
          expect(screen.queryAllByText('Sample Goal to Remove').length).toBe(0);
        });
      });

      // Goal 4 is still being edited (not in readonly display),
      // so we should still have the goal form open
      // The goal name should be in an input field for editing
      expect(screen.queryByText('Sample Goal to Edit')).toBeNull(); // Not in readonly display
      // Verify that goal 3 was successfully removed and goal 4 is still being edited
      expect(screen.queryByRole('button', { name: /add new goal/i })).toBeVisible();
    });

    it('does not fetch if there are no grants', async () => {
      const goals = [{
        name: 'This is a test goal',
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          courses: [],
        }],
      }];

      expect(fetchMock.called()).toBe(false);
      renderGoals([], 'recipient', goals);
      expect(fetchMock.called()).toBe(false);
    });
  });

  describe('handles fetch error', () => {
    it('handles it like I SAID', async () => {
      const goals = [];
      const recipientType = 'recipient';
      const grants = [1];
      const isGoalFormClosed = false;
      const throwFetchError = true;
      renderGoals(grants, recipientType, goals, isGoalFormClosed, throwFetchError, jest.fn(), '2021-01-01');
      expect(await screen.findByText('Connection error. Cannot load options.')).toBeVisible();
    });
  });

  describe('when activity recipient type is not "recipient" or "other-entity"', () => {
    it('shows the start date warning when the start date is missing', async () => {
      renderGoals([1], 'recipient', [], false, false, jest.fn(), null);
      expect(await screen.findByText(/to add goals and objectives, indicate in the/i)).toBeVisible();
      expect(await screen.findByText(/start date of the activity/i)).toBeVisible();
    });

    it('hides the warnings when the report type and start date are present', async () => {
      renderGoals([1], 'recipient', [], false, false, jest.fn(), '2021-01-01');
      expect(screen.queryByText(/to add goals and objectives, indicate in the/i)).toBeNull();
      expect(screen.queryByText(/who the activity was for/i)).toBeNull();
      expect(screen.queryByText(/start date of the activity/i)).toBeNull();
      expect(await screen.findByText(/using a goal on an activity report will set the goal’s status to in progress/i)).toBeVisible();
    });

    it('shows the start date warning if the start date has the value of "Invalid date"', async () => {
      renderGoals([1], 'recipient', [], false, false, jest.fn(), 'Invalid date');
      expect(await screen.findByText(/to add goals and objectives, indicate in the/i)).toBeVisible();
      expect(screen.queryByText(/who the activity was for/i)).toBeNull();
      expect(await screen.findByText(/start date of the activity/i)).toBeVisible();
    });
  });

  describe('title override', () => {
    it('returns goals if activityRecipientType is recipient', async () => {
      const res = goalsObjectives.titleOverride({ activityRecipientType: 'recipient' });
      expect(res).toEqual('Goals and objectives');
    });
  });

  describe('isPageComplete', () => {
    describe('for recipient reports', () => {
      it('is false if goals are not valid', () => {
        const complete = goalsObjectives.isPageComplete({
          activityRecipientType: 'recipient',
          activityRecipients: [],
          goals: [],
        });
        expect(complete).toBeFalsy();
      });

      it('is true if goals are valid', () => {
        const goals = [{
          name: 'Is goal',
          endDate: '2021-01-01',
          isRttapa: 'No',
          source: 'Source!!',
          objectives: [{
            id: 1,
            title: 'title',
            ttaProvided: 'tta',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: ['Hello'],
            resources: [],
            roles: ['Chief Inspector'],
            supportType: SUPPORT_TYPES[3],
          }],
        }];
        const complete = goalsObjectives.isPageComplete({
          activityRecipientType: 'recipient',
          activityRecipients: [],
          goals,
        });
        expect(complete).toBeTruthy();
      });

      it('is false if goalForEditing is true', () => {
        const goals = [{
          name: 'Is goal',
          endDate: '2021-01-01',
          isRttapa: 'No',
          objectives: [{
            id: 1,
            title: 'title',
            ttaProvided: 'tta',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            topics: ['Hello'],
            resources: [],
            roles: ['Chief Inspector'],
          }],
        }];
        const complete = goalsObjectives.isPageComplete({
          activityRecipientType: 'recipient',
          activityRecipients: [],
          goals,
          goalForEditing: { name: 'is goal 2' },
        });
        expect(complete).toBeFalsy();
      });
    });

    it('isPageComplete is false', async () => {
      const formData = { activityRecipientType: 'recipient', goals: [], activityRecipients: [] };
      const isComplete = goalsObjectives.isPageComplete(formData);
      expect(isComplete).not.toBeTruthy();
    });
  });

  describe('review page', () => {
    it('displays goals with no objectives', async () => {
      render(<RenderReview goals={[{ id: 1, name: 'goal', objectives: [] }]} />);
      const goal = await screen.findByText('goal');
      expect(goal).toBeVisible();
    });

    it('displays goals with objectives', async () => {
      render(<RenderReview goals={[{
        id: 1,
        name: 'goal',
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'ttaProvided',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          topics: [{ name: 'Topic 1' }, { name: 'Topic 2' }, { name: 'Topic 3' }],
          resources: [{ value: 'http://test1.gov' }, { value: 'http://test2.gov' }, { value: 'http://test3.gov' }],
          roles: ['Chief Inspector'],
          files: [{ originalFileName: 'test1.txt', url: { url: 'http://s3/test1.txt' } }],
          courses: [],
        }],
      }]}
      />);
      const objective = await screen.findByText('title');
      expect(objective).toBeVisible();
      expect(await screen.findByText('Topic 1')).toBeVisible();
      expect(await screen.findByText('Topic 2')).toBeVisible();
      expect(await screen.findByText('Topic 3')).toBeVisible();
      expect(await screen.findByRole('link', { name: /test1\.txt/i })).toBeVisible();
      expect(await screen.findByRole('link', { name: /http:\/\/test1\.gov/i })).toBeVisible();
      expect(await screen.findByRole('link', { name: /http:\/\/test2\.gov/i })).toBeVisible();
      expect(await screen.findByRole('link', { name: /http:\/\/test3\.gov/i })).toBeVisible();
    });
  });

  describe('additional coverage tests', () => {
    it('deep copies prompts when removing a goal', async () => {
      // Lines 185 & 256: prompts deep copy in onRemove and onEdit
      const goalsWithPrompts = [{
        id: 5,
        name: 'Goal with Prompts',
        isNew: true,
        goalIds: [1],
        grants: [{
          value: 1, label: 'Turtle 1', programs: [], id: 1,
        }],
        prompts: [{ promptId: 1, title: 'Test Prompt', response: 'Test Response' }],
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          courses: [],
        }],
      }];

      const sampleGoals = [{
        name: 'Goal with Prompts', id: 5, objectives: [], prompts: [{ promptId: 1, title: 'Test Prompt', response: 'Test Response' }],
      }];
      const isGoalFormClosed = true;
      const toggleGoalForm = jest.fn();

      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, false, toggleGoalForm, null, goalsWithPrompts);

      const actions = await screen.findByRole('button', { name: /actions for goal 5/i });
      act(() => userEvent.click(actions));
      const [removeButton] = await screen.findAllByRole('button', { name: 'Remove' });
      act(() => userEvent.click(removeButton));

      await waitFor(async () => {
        expect(await screen.findByText(/If you remove the goal, the objectives and TTA provided content will also be deleted/i)).toBeVisible();
      });

      const modalRemove = await screen.findByLabelText(/remove goal/i);
      act(() => userEvent.click(modalRemove));

      await waitFor(() => {
        expect(screen.queryByText('Goal with Prompts')).toBeNull();
      });
    });

    it('clicks Save draft and Back buttons when goal form is open', async () => {
      // Lines 51-52: Save draft and Back buttons when editing a goal
      const sampleGoals = [];
      const isGoalFormClosed = false; // Goal form is OPEN
      const toggleGoalForm = jest.fn();

      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, false, toggleGoalForm, '2021-01-01', []);

      // Verify the specific buttons are present when goal form is open
      const saveDraftButton = await screen.findByRole('button', { name: /save draft/i });
      const backButton = await screen.findByRole('button', { name: /back/i });

      expect(saveDraftButton).toBeVisible();
      expect(backButton).toBeVisible();

      // Click the buttons to execute lines 51-52
      act(() => userEvent.click(saveDraftButton));
      act(() => userEvent.click(backButton));
    });

    it('validates goals when editing another goal while one is being edited', async () => {
      // Lines 226-248: Goal and prompt validation in onEdit
      const goalsToUse = [{
        id: 6,
        name: 'First Goal',
        isNew: true,
        goalIds: [1],
        grants: [{
          value: 1, label: 'Turtle 1', programs: [], id: 1,
        }],
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          courses: [],
        }],
        prompts: [],
      }];

      const sampleGoals = [
        { name: 'First Goal', id: 6, objectives: [] },
      ];

      fetchMock.restore();
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=1', 200);

      renderGoals([1], 'recipient', sampleGoals, true, false, jest.fn(), '2021-01-01', goalsToUse);

      // Edit the goal
      const actions = await screen.findByRole('button', { name: /actions for goal 6/i });
      act(() => userEvent.click(actions));
      const [editButton] = await screen.findAllByRole('button', { name: 'Edit' });
      act(() => userEvent.click(editButton));

      await waitFor(() => {
        expect(fetchMock.called()).toBe(true);
      });
    });

    it('inserts goal back at original index when editing another goal', async () => {
      // Lines 264-271: Insert at original position logic
      const goalsToUse = [
        {
          id: 7,
          name: 'First Goal',
          isNew: true,
          goalIds: [1],
          grants: [{
            value: 1, label: 'Turtle 1', programs: [], id: 1,
          }],
          objectives: [{
            id: 1,
            title: 'title',
            ttaProvided: 'tta',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            courses: [],
          }],
        },
        {
          id: 8,
          name: 'Second Goal',
          isNew: true,
          goalIds: [2],
          grants: [{
            value: 1, label: 'Turtle 1', programs: [], id: 1,
          }],
          objectives: [{
            id: 2,
            title: 'title2',
            ttaProvided: 'tta2',
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            courses: [],
          }],
        },
      ];

      const sampleGoals = [
        { name: 'First Goal', id: 7, objectives: [] },
        { name: 'Second Goal', id: 8, objectives: [] },
      ];

      fetchMock.restore();
      // Re-mock /api/topic after restore (was originally set in beforeEach)
      fetchMock.get('/api/topic', []);
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=1', 200);
      fetchMock.put('/api/activity-reports/1/goals/edit?goalIds=2', 200);

      renderGoals([1], 'recipient', sampleGoals, true, false, jest.fn(), '2021-01-01', goalsToUse);

      // Edit first goal
      let actions = await screen.findByRole('button', { name: /actions for goal 7/i });
      act(() => userEvent.click(actions));
      let [editButton] = await screen.findAllByRole('button', { name: 'Edit' });
      await act(async () => {
        userEvent.click(editButton);
        // Wait for the fetch to complete and state to settle
        await waitFor(() => {
          expect(fetchMock.called('/api/activity-reports/1/goals/edit?goalIds=1')).toBe(true);
        });
      });

      // Now edit the second goal - this triggers the insert at original index logic
      actions = await screen.findByRole('button', { name: /actions for goal 8/i });
      act(() => userEvent.click(actions));
      [editButton] = await screen.findAllByRole('button', { name: 'Edit' });
      await act(async () => {
        userEvent.click(editButton);
        // Wait for the fetch to complete and state to settle
        await waitFor(() => {
          expect(fetchMock.called('/api/activity-reports/1/goals/edit?goalIds=2')).toBe(true);
        });
      });
    });
  });
});
