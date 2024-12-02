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

const goalUrl = join('api', 'activity-reports', 'goals');

const spy = jest.fn();

const RenderGoalsObjectives = ({
  grantIds, activityRecipientType, connectionActive = true,
}) => {
  const activityRecipients = grantIds.map((activityRecipientId) => ({
    activityRecipientId, id: activityRecipientId,
  }));
  const data = { activityRecipientType, activityRecipients };
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
      goals: [{
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
          status: 'In Progress',
          courses: [],
        }],
      }],
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
) => {
  const query = grantIds.map((id) => `grantIds=${id}`).join('&');
  const fetchResponse = throwFetchError ? 500 : goals;

  fetchMock.get(join(goalUrl, `?${query}`), fetchResponse);
  render(
    <UserContext.Provider value={{ user: { flags: [] } }}>
      <GoalFormContext.Provider value={{ isGoalFormClosed, toggleGoalForm }}>
        <RenderGoalsObjectives
          grantIds={grantIds}
          activityRecipientType={activityRecipientType}
          connectionActive={!throwFetchError}
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

      renderGoals([1], 'recipient', goals, isGoalFormClosed, throwFetchError);
      expect(await screen.findByText('Connection error. Cannot load options.')).toBeVisible();
    });
  });

  describe('when activity recipient type is "recipient"', () => {
    it('the display goals section is displayed', async () => {
      renderGoals([1], 'recipient');
      expect(await screen.findByText('Goal summary', { selector: '.margin-bottom-0.margin-top-4' })).toBeVisible();
      expect(screen.queryByText(/indicates required field/i)).toBeTruthy();
    });

    it('the display goals shows a warning if no grants are selected', async () => {
      renderGoals([], 'recipient');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
      expect(await screen.findByText(/To create goals, first select a recipient/i)).toBeVisible();
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
      // this API call sets the goal as being edited
      fetchMock.get('/api/activity-report/1/goals/edit?goalId=1234567', 200);

      renderGoals([1], 'recipient', sampleGoals, isGoalFormClosed, throwFetchError, toggleGoalForm);
      expect(screen.queryByText(/indicates required field/i)).toBeNull();
      const actions = await screen.findByRole('button', { name: /actions for goal 1/i });
      act(() => userEvent.click(actions));
      const [button] = await screen.findAllByRole('button', { name: 'Edit' });
      act(() => userEvent.click(button));
      await waitFor(() => expect(fetchMock.called()).toBe(true));
      expect(toggleGoalForm).toHaveBeenCalledWith(false);
    });

    it('you need to have completely conditional fields before editing', async () => {
      const sampleGoals = [{
        name: 'Test',
        id: 1234567,
        objectives: [],
      }];
      const isGoalFormClosed = true;
      const throwFetchError = false;
      const toggleGoalForm = jest.fn();
      fetchMock.restore();
      // this API call sets the goal as being edited
      fetchMock.get('/api/activity-report/1/goals/edit?goalId=1234567', 200);

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
      expect(goalSummary).not.toBeVisible();
      const addNewGoal = await screen.findByRole('button', { name: /add new goal/i });
      expect(addNewGoal).toBeVisible();
      const keys = ['goalForEditing', 'goalName', 'goalEndDate'];
      keys.forEach((key) => {
        expect(spy).toHaveBeenCalledWith(key, '');
      });
      expect(toggleGoalForm).toHaveBeenCalledWith(false);
    });

    it('does not fetch if there are no grants', async () => {
      const goals = [{
        name: 'This is a test goal',
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: 'In Progress',
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
      renderGoals(grants, recipientType, goals, isGoalFormClosed, throwFetchError);
      expect(await screen.findByText('Connection error. Cannot load options.')).toBeVisible();
    });
  });

  describe('when activity recipient type is not "recipient" or "other-entity"', () => {
    it('a warning is displayed', async () => {
      renderGoals([1], null);
      expect(await screen.findByText(
        /To add goals and objectives, indicate who the activity was for in/i,
      )).toBeVisible();
    });
  });

  describe('when activity recipient type is other entity"', () => {
    it('the objectives section is displayed', async () => {
      renderGoals([1], 'other-entity');
      expect(await screen.findByText(
        'You\'re creating an activity report for an entity that\'s not a grant recipient, so you only need to create objectives. The goal section is removed.',
      )).toBeVisible();
    });
  });

  describe('title override', () => {
    it('returns objective if activityRecipientType is other-entity', async () => {
      const res = goalsObjectives.titleOverride({ activityRecipientType: 'other-entity' });
      expect(res).toEqual('Objectives and topics');
    });

    it('returns goals if activityRecipientType is recipient', async () => {
      const res = goalsObjectives.titleOverride({ activityRecipientType: 'recipient' });
      expect(res).toEqual('Goals and objectives');
    });
  });

  describe('isPageComplete', () => {
    it('is false if there is no recipient type selected', () => {
      const complete = goalsObjectives.isPageComplete({});
      expect(complete).toBeFalsy();
    });

    describe('for other-entity reports', () => {
      it('is false if objectives are not valid', () => {
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'other-entity', objectivesWithoutGoals: [] });
        expect(complete).toBeFalsy();
      });

      it('is true if objectives are valid', () => {
        const objectives = [
          {
            id: 1,
            title: 'title',
            ttaProvided: 'tta',
            status: 'In Progress',
            topics: ['Hello'],
            resources: [],
            roles: ['Chief Inspector'],
            supportType: SUPPORT_TYPES[3],
          },
        ];
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'other-entity', objectivesWithoutGoals: objectives });
        expect(complete).toBeTruthy();
      });
    });

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
            status: 'In Progress',
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
            status: 'In Progress',
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

    it('isPageComplete is true', async () => {
      const objectives = [
        {
          id: 1,
          title: 'title',
          ttaProvided: 'tta',
          status: 'In Progress',
          topics: ['Hello'],
          resources: [],
          roles: ['Chief Inspector'],
          supportType: SUPPORT_TYPES[1],
          courses: [],
        },
        {
          id: 2,
          title: 'title',
          ttaProvided: 'tta',
          status: 'In Progress',
          topics: ['Hello'],
          resources: [],
          roles: ['Chief Inspector'],
          supportType: SUPPORT_TYPES[1],
          courses: [],
        },
      ];
      const formData = { activityRecipientType: 'other-entity', objectivesWithoutGoals: objectives };
      const isComplete = goalsObjectives.isPageComplete(formData);
      expect(isComplete).toBeTruthy();
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

    it('displays other-entity objectives', async () => {
      render(<RenderReview
        activityRecipientType="other-entity"
        objectivesWithoutGoals={[
          {
            id: 1,
            title: 'title one',
            ttaProvided: 'ttaProvided one',
            status: 'Not Started',
            topics: [{ name: 'Topic 1' }, { name: 'Topic 2' }, { name: 'Topic 3' }],
            resources: [{ url: 'http://test1.gov' }, { url: 'http://test2.gov' }, { url: 'http://test3.gov' }],
            roles: ['Chief Inspector'],
            files: [{ originalFileName: 'test1.txt', url: { url: 'http://s3/test1.txt' } }],
            supportType: SUPPORT_TYPES[1],
            courses: [],
          },
          {
            id: 2,
            title: 'title two',
            ttaProvided: 'ttaProvided two',
            status: 'Not Started',
            topics: [],
            resources: [],
            roles: ['Chief Inspector'],
            files: [],
            supportType: SUPPORT_TYPES[1],
            courses: [],
          },
        ]}
      />);
      const objective = await screen.findByText('title one');
      expect(await screen.findByText(/topic 1, topic 2, topic 3/i)).toBeVisible();
      expect(await screen.findByRole('link', { name: /test1\.txt \(opens in new tab\)/i })).toBeVisible();
      expect(await screen.findByRole('link', { name: /http:\/\/test1\.gov/i })).toBeVisible();
      expect(await screen.findByRole('link', { name: /http:\/\/test2\.gov/i })).toBeVisible();
      expect(await screen.findByRole('link', { name: /http:\/\/test3\.gov/i })).toBeVisible();
      expect(objective).toBeVisible();
    });

    it('displays goals with objectives', async () => {
      render(<RenderReview goals={[{
        id: 1,
        name: 'goal',
        objectives: [{
          id: 1,
          title: 'title',
          ttaProvided: 'ttaProvided',
          status: 'Not Started',
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
});
