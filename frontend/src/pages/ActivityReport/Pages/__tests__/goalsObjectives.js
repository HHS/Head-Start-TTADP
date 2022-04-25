/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import join from 'url-join';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import goalsObjectives from '../goalsObjectives';

const goalUrl = join('api', 'activity-reports', 'goals');

const RenderGoalsObjectives = ({
  grantIds, activityRecipientType,
}) => {
  const activityRecipients = grantIds.map((activityRecipientId) => ({ activityRecipientId }));
  const data = { activityRecipientType, activityRecipients };
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: [],
      objectivesWithoutGoals: [],
      author: {
        role: 'central office',
      },
      collaborators: [],
      ...data,
    },
  });
  return (
    <FormProvider {...hookForm}>
      {goalsObjectives.render()}
    </FormProvider>
  );
};

const renderGoals = (grantIds, activityRecipientType, initialData, goals = []) => {
  const query = grantIds.map((id) => `grantIds=${id}`).join('&');
  fetchMock.get(join(goalUrl, `?${query}`), goals);
  render(
    <RenderGoalsObjectives
      grantIds={grantIds}
      activityRecipientType={activityRecipientType}
      initialData={initialData}
    />,
  );
};

// eslint-disable-next-line react/prop-types
const RenderReview = ({ goals, activityRecipientType = 'recipient', objectivesWithoutGoals = [] }) => {
  const history = createMemoryHistory();
  const hookForm = useForm({
    defaultValues: { goals, activityRecipientType, objectivesWithoutGoals },
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
  describe('when activity recipient type is "recipient"', () => {
    it('the display goals section is displayed', async () => {
      renderGoals([1], 'recipient');
      expect(await screen.findByText('Goal summary')).toBeVisible();
    });

    it('the display goals section does not show if no grants are selected', async () => {
      renderGoals([], 'recipient');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
    });
  });

  describe('when activity recipient type is not "recipient"', () => {
    it('the objectives section is displayed', async () => {
      renderGoals([1], 'otherEntity');
      expect(await screen.findByText('Objectives for other entity TTA')).toBeVisible();
    });
  });

  describe('title override', () => {
    it('returns objective if activityRecipientType is other-entity', async () => {
      const res = goalsObjectives.titleOverride({ activityRecipientType: 'other-entity' });
      expect(res).toEqual('Objectives');
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
          },
        ];
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'other-entity', objectivesWithoutGoals: objectives });
        expect(complete).toBeTruthy();
      });
    });

    describe('for recipient reports', () => {
      it('is false if goals are not valid', () => {
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'recipient', goals: [] });
        expect(complete).toBeFalsy();
      });

      it('is true if goals are valid', () => {
        const goals = [{
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
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'recipient', goals });
        expect(complete).toBeTruthy();
      });
    });
  });

  describe('review page', () => {
    it('displays goals with no objectives', async () => {
      render(<RenderReview goals={[{ id: 1, name: 'goal' }]} />);
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
            topics: ['Hello'],
            resources: [],
            roles: ['Chief Inspector'],
          },
          {
            id: 2,
            title: 'title two',
            ttaProvided: 'ttaProvided two',
            status: 'Not Started',
            topics: ['Hello'],
            resources: [],
            roles: ['Chief Inspector'],
          },
        ]}
      />);
      const objective = await screen.findByText('title one');
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
          topics: ['Hello'],
          resources: [],
          roles: ['Chief Inspector'],
        }],
      }]}
      />);
      const objective = await screen.findByText('title');
      expect(objective).toBeVisible();
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
        },
        {
          id: 2,
          title: 'title',
          ttaProvided: 'tta',
          status: 'In Progress',
          topics: ['Hello'],
          resources: [],
          roles: ['Chief Inspector'],
        },
      ];
      const formData = { activityRecipientType: 'other-entity', objectivesWithoutGoals: objectives };
      const isComplete = goalsObjectives.isPageComplete(formData);
      expect(isComplete).toBeTruthy();
    });

    it('isPageComplete is false', async () => {
      const formData = { activityRecipientType: 'recipient', goals: [] };
      const isComplete = goalsObjectives.isPageComplete(formData);
      expect(isComplete).not.toBeTruthy();
    });
  });
});
