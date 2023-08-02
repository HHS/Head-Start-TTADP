/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form';
import selectEvent from 'react-select-event';
import AppLoadingContext from '../../../../../AppLoadingContext';

import GoalPicker from '../GoalPicker';
import UserContext from '../../../../../UserContext';

const defaultSelectedGoals = [
  {
    label: '123',
    value: 123,
    goalIds: [123],
  },
];

// eslint-disable-next-line react/prop-types
const GP = ({ availableGoals, selectedGoals }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: selectedGoals,
      goalForEditing: { objectives: [], goalIds: [] },
      author: {
        role: 'central office',
      },
      collaborators: [],
    },
  });

  return (
    <AppLoadingContext.Provider value={{
      setIsAppLoading: jest.fn(),
      setAppLoadingText: jest.fn(),
      isAppLoading: false,
    }}
    >
      <UserContext.Provider value={{
        user: {
          id: 1, permissions: [], name: 'Ted User', flags: [],
        },
      }}
      >
        <FormProvider {...hookForm}>
          <GoalPicker
            availableGoals={availableGoals}
            roles={['central office']}
            grantIds={[]}
            reportId={1}
          />
        </FormProvider>
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  );
};

const renderGoalPicker = (
  availableGoals, selectedGoals = defaultSelectedGoals, goalForEditing = undefined,
) => {
  render(
    <GP
      availableGoals={availableGoals}
      selectedGoals={selectedGoals}
      goalForEditing={goalForEditing}
    />,
  );
};

describe('GoalPicker', () => {
  beforeEach(async () => {
    fetchMock.get('/api/topic', []);
    fetchMock.get('/api/goals?reportId=1&goalIds=1', [{ objectives: [] }]);
  });

  afterEach(() => fetchMock.restore());

  it('you can select a goal', async () => {
    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1],
      name: 'Goal 1',
    }];

    renderGoalPicker(availableGoals);

    const selector = await screen.findByLabelText(/Select recipient's goal*/i);
    const [availableGoal] = availableGoals;

    await selectEvent.select(selector, [availableGoal.label]);

    const input = document.querySelector('[name="goalForEditing"');
    expect(input.value).toBe(availableGoal.value.toString());
  });

  it('you can select a goal with no selected goals', async () => {
    const availableGoals = [{
      label: 'Goal 1',
      value: 1,
      goalIds: [1],
    }];

    renderGoalPicker(availableGoals, null);

    const selector = await screen.findByLabelText(/Select recipient's goal*/i);
    const [availableGoal] = availableGoals;

    await selectEvent.select(selector, [availableGoal.label]);

    const input = document.querySelector('[name="goalForEditing"');
    expect(input.value).toBe(availableGoal.value.toString());
  });

  it('properly renders when there is no goal for editing selected', async () => {
    renderGoalPicker([], null);
    const selector = await screen.findByLabelText(/Select recipient's goal*/i);

    expect(selector).toBeVisible();
  });

  describe('curated goals', () => {
    it('with no prompts', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', []);
      const availableGoals = [{
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        isCurated: true,
        goalTemplateId: 1,
      }];

      renderGoalPicker(availableGoals, null);

      const selector = await screen.findByLabelText(/Select recipient's goal*/i);
      const [availableGoal] = availableGoals;

      await selectEvent.select(selector, [availableGoal.label]);

      const input = document.querySelector('[name="goalForEditing"');
      expect(input.value).toBe(availableGoal.value.toString());
    });
    it('with prompts', async () => {
      fetchMock.get('/api/goal-templates/1/prompts?goalIds=1', [
        {
          type: 'multiselect',
          title: 'prompt-1',
          options: [
            'Option 1',
            'Option 2',
          ],
          prompt: 'WHYYYYYYYY?',
        },
      ]);
      const availableGoals = [{
        label: 'Goal 1',
        value: 1,
        goalIds: [1],
        isCurated: true,
        goalTemplateId: 1,
      }];

      renderGoalPicker(availableGoals, null);

      const selector = await screen.findByLabelText(/Select recipient's goal*/i);
      const [availableGoal] = availableGoals;

      await selectEvent.select(selector, [availableGoal.label]);

      const input = document.querySelector('[name="goalForEditing"');
      expect(input.value).toBe(availableGoal.value.toString());
    });
  });
});
