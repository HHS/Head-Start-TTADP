import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { useForm } from 'react-hook-form';
import join from 'url-join';

import goalsObjectives from '../goalsObjectives';

const goalUrl = join('api', 'activity-reports', 'goals');

const RenderGoalsObjectives = ({
  // eslint-disable-next-line react/prop-types
  grantIds, activityRecipientType, initialData,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { goals: [], ...initialData },
  });
  // eslint-disable-next-line react/prop-types
  const activityRecipients = grantIds.map((id) => ({ activityRecipientId: id }));
  const data = { ...initialData, activityRecipientType, activityRecipients };
  return (
    <>
      {goalsObjectives.render(hookForm, {}, data)}
    </>
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

describe('goals objectives', () => {
  afterEach(() => fetchMock.restore());
  describe('when activity recipient type is "grantee"', () => {
    it('the display goals section is displayed', async () => {
      renderGoals([1], 'grantee', {});
      await screen.findByText('Context');
      expect(await screen.findByText('Goals and objectives')).toBeVisible();
    });

    it('the display goals section does not show if no grants are selected', async () => {
      renderGoals([], 'grantee', {});
      await screen.findByText('Context');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
    });
  });

  describe('when activity recipient type is not "grantee"', () => {
    it('the display goals section is not displayed', async () => {
      renderGoals([1], 'nonGrantee', {});
      await screen.findByText('Context');
      expect(screen.queryByText('Goals and objectives')).toBeNull();
    });
  });
});
