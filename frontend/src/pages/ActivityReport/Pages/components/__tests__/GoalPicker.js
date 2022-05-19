/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import selectEvent from 'react-select-event';

import GoalPicker, { newGoal } from '../GoalPicker';

const defaultSelectedGoals = [
  {
    label: '123',
    value: 123,
  },
];

// eslint-disable-next-line react/prop-types
const GP = ({ availableGoals, selectedGoals }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: selectedGoals,
      author: {
        role: 'central office',
      },
      collaborators: [],
    },
  });

  return (
    <FormProvider {...hookForm}>
      <GoalPicker
        availableGoals={availableGoals}
        roles={['central office']}
      />
    </FormProvider>
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
  beforeAll(async () => {
    fetchMock.get('/api/topic', []);
  });

  it('you can select a goal', async () => {
    const availableGoals = [{
      ...newGoal(),
      label: 'Goal 1',
      value: 1,
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
      ...newGoal(),
      label: 'Goal 1',
      value: 1,
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
});
