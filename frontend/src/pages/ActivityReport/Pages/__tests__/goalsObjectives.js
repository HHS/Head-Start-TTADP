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
  // eslint-disable-next-line react/prop-types
  grantIds, activityRecipientType,
}) => {
  // eslint-disable-next-line react/prop-types
  const activityRecipients = grantIds.map((activityRecipientId) => ({ activityRecipientId }));
  const data = { activityRecipientType, activityRecipients };
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { goals: [], ...data },
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
const RenderReview = ({ goals }) => {
  const history = createMemoryHistory();
  const hookForm = useForm({
    defaultValues: { goals },
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
    it('the display goals section is not displayed', async () => {
      renderGoals([1], 'nonGrantee');
      await screen.findByText('Context');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
    });
  });

  describe('review page', () => {
    it('displays goals with no objectives', async () => {
      render(<RenderReview goals={[{ id: 1, name: 'goal' }]} />);
      const goal = await screen.findByText('goal');
      expect(goal).toBeVisible();
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
