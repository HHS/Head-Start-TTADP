import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import userEvent from '@testing-library/user-event';

import Goal from '../Goal';

// eslint-disable-next-line react/prop-types
const RenderGoal = ({ name, onRemove = () => {} }) => {
  const hookForm = useForm({
    defaultValues: {
      goals: [
        {
          id: 1,
          value: 1,
          label: name,
          name,
        },
      ],
    },
  });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Goal
        id={10}
        onRemove={onRemove}
        goalIndex={0}
        name={name}
      />
    </FormProvider>
  );
};

describe('Goal', () => {
  it('renders name', async () => {
    render(<RenderGoal name="test goal" />);
    const goal = await screen.findByText('test goal');
    expect(goal).toBeVisible();
  });

  it('can add additional objectives to the goal', async () => {
    render(<RenderGoal name="test goal" />);
    const button = await screen.findByText('Add New Objective');
    userEvent.click(button);
    expect(await screen.findByText('Save Objective')).toBeVisible();
  });

  it('clicking remove calls "onRemove"', async () => {
    const onRemove = jest.fn();
    render(<RenderGoal name="test goal" onRemove={onRemove} />);
    const button = await screen.findByRole('button', { name: 'remove goal 1' });
    userEvent.click(button);
    await waitFor(() => expect(onRemove).toHaveBeenCalled());
  });
});
