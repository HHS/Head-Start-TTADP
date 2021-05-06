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
    defaultValues: { goals: [], objectivesWithoutGoals: [], ...data },
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
const RenderReview = ({ goals, activityRecipientType = 'grantee', objectivesWithoutGoals = [] }) => {
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
  afterEach(() => fetchMock.restore());
  describe('when activity recipient type is "grantee"', () => {
    it('the display goals section is displayed', async () => {
      renderGoals([1], 'grantee');
      await screen.findByText('Context');
      expect(await screen.findByText('Goals and objectives')).toBeVisible();
    });

    it('the display goals section does not show if no grants are selected', async () => {
      renderGoals([], 'grantee');
      await screen.findByText('Context');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
    });
  });

  describe('when activity recipient type is not "grantee"', () => {
    it('the objectives section is displayed', async () => {
      renderGoals([1], 'nonGrantee');
      await screen.findByText('Context');
      expect(await screen.findByText('Objectives for non-grantee TTA')).toBeVisible();
    });
  });

  describe('title override', () => {
    it('returns objective if activityRecipientType is non-grantee', async () => {
      const res = goalsObjectives.titleOverride({ activityRecipientType: 'non-grantee' });
      expect(res).toEqual('Objectives');
    });

    it('returns goals if activityRecipientType is grantee', async () => {
      const res = goalsObjectives.titleOverride({ activityRecipientType: 'grantee' });
      expect(res).toEqual('Goals and objectives');
    });
  });

  describe('isPageComplete', () => {
    it('is false if there is no recipient type selected', () => {
      const complete = goalsObjectives.isPageComplete({});
      expect(complete).toBeFalsy();
    });

    describe('for non-grantee reports', () => {
      it('is false if objectives are not valid', () => {
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'non-grantee', objectivesWithoutGoals: [] });
        expect(complete).toBeFalsy();
      });

      it('is true if objectives are valid', () => {
        const objectives = [
          {
            id: 1,
            title: 'title',
            ttaProvided: 'tta',
            status: 'In Progress',
          },
        ];
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'non-grantee', objectivesWithoutGoals: objectives });
        expect(complete).toBeTruthy();
      });
    });

    describe('for grantee reports', () => {
      it('is false if goals are not valid', () => {
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'grantee', goals: [] });
        expect(complete).toBeFalsy();
      });

      it('is true if goals are valid', () => {
        const goals = [{
          objectives: [{
            id: 1,
            title: 'title',
            ttaProvided: 'tta',
            status: 'In Progress',
          }],
        }];
        const complete = goalsObjectives.isPageComplete({ activityRecipientType: 'grantee', goals });
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

    it('displays non-grantee objectives', async () => {
      render(<RenderReview
        activityRecipientType="non-grantee"
        objectivesWithoutGoals={[
          {
            id: 1, title: 'title one', ttaProvided: 'ttaProvided one', status: 'Not Started',
          },
          {
            id: 2, title: 'title two', ttaProvided: 'ttaProvided two', status: 'Not Started',
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
          id: 1, title: 'title', ttaProvided: 'ttaProvided', status: 'Not Started',
        }],
      }]}
      />);
      const objective = await screen.findByText('title');
      expect(objective).toBeVisible();
    });
  });
});
