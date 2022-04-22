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

import GoalPicker from '../GoalPicker';

// eslint-disable-next-line react/prop-types
const GP = ({ availableGoals, selectedGoals, goalForEditing }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: selectedGoals,
      goalForEditing,
    },
  });

  return (
    <FormProvider {...hookForm}>
      <GoalPicker
        availableGoals={availableGoals}
      />
    </FormProvider>
  );
};

const renderGoalPicker = (availableGoals, selectedGoals = [], goalForEditing = undefined) => {
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
      label: 'Goal 1',
      value: 1,
    }];

    renderGoalPicker(availableGoals);

    const selector = await screen.findByText(/Select recipient's goal*/i);

    await selectEvent.select(selector, ['Goal 1']);

    expect(await screen.findByRole('heading', { name: /objective summary/i })).toBeInTheDocument();
  });
});
