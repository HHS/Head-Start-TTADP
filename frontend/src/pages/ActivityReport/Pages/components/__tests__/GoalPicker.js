/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import selectEvent from 'react-select-event';

import GoalPicker from '../GoalPicker';
import { withText } from '../../../../../testHelpers';

// eslint-disable-next-line react/prop-types
const RenderGoal = ({ availableGoals, selectedGoals }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      goals: selectedGoals,
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

describe('GoalPicker', () => {
  describe('the goal multiselect', () => {
    it('can select multiple goals', async () => {
      const availableGoals = [{ id: 1, name: 'first' }, { id: 2, name: 'second' }];
      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={[]}
        />,
      );

      const select = await screen.findByText('Select goal(s)');
      await selectEvent.select(select, ['first', 'second']);

      const first = await screen.findByRole('button', { name: 'add objective to goal 1' });
      const second = await screen.findByRole('button', { name: 'add objective to goal 2' });
      expect(first).toBeVisible();
      expect(second).toBeVisible();
    });
  });

  describe('new goals', () => {
    beforeEach(async () => {
      const availableGoals = [{ id: 1, name: 'label' }];
      const selectedGoals = [];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );

      const input = await screen.findByRole('textbox', { name: 'Create a new goal' });
      userEvent.type(input, 'test');
      const button = await screen.findByRole('button', { name: 'Save Goal' });
      userEvent.click(button);
    });

    it('are shown in the display section', async () => {
      expect(await screen.findByText(withText('Goal: test'))).toBeVisible();
    });

    it('can be unselected', async () => {
      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });

      await waitFor(() => expect(menuButton).toBeVisible());
      fireEvent.click(menuButton);

      const removeButton = await screen.findByRole('button', { name: 'Remove' });
      userEvent.click(removeButton);
      expect(await screen.findByText(withText('Select goal(s)'))).toBeVisible();
    });

    it('does nothing if there is no goal text', async () => {
      const first = await screen.findByRole('button', { name: 'add objective to goal 1' });
      expect(first).toBeVisible();
      const button = await screen.findByRole('button', { name: 'Save Goal' });
      userEvent.click(button);
      const second = screen.queryByRole('button', { name: 'add objective to goal 2' });
      await waitFor(() => expect(second).toBeNull());
    });
  });

  describe('selected goals', () => {
    it('can be removed', async () => {
      const availableGoals = [];
      const selectedGoals = [{ id: 1, name: 'label', objectives: [] }];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );

      expect(await screen.findByText(withText('1 goal selected'))).toBeVisible();
      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });

      await waitFor(() => expect(menuButton).toBeVisible());
      fireEvent.click(menuButton);

      const removeButton = await screen.findByRole('button', { name: 'Remove' });
      userEvent.click(removeButton);
      expect(await screen.findByText(withText('Select goal(s)'))).toBeVisible();
    });

    it('can be updated', async () => {
      const availableGoals = [];
      const selectedGoals = [
        { id: 1, name: 'goal to edit', objectives: [] },
        { id: 2, name: 'another goal', objectives: [] },
      ];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );

      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });
      fireEvent.click(menuButton);

      const editButton = await screen.findByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      const goalNameInput = await screen.findByLabelText('Edit goal');
      await waitFor(() => expect(goalNameInput).toBeVisible());

      fireEvent.change(goalNameInput, { target: { value: 'test goal edited' } });

      const updateButton = await screen.findByRole('button', { name: 'Update Goal' });
      fireEvent.click(updateButton);

      // Old goal name should not exist, new goal name should
      expect(screen.queryByText('goal to edit')).not.toBeInTheDocument();
      expect(screen.queryByText('test goal edited')).toBeVisible();
      expect(screen.queryByText('another goal')).toBeVisible();
    });
  });

  describe('input box', () => {
    it('shows the correct placeholder with no selected items', async () => {
      const availableGoals = [];
      const selectedGoals = [];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );
      const goal = await screen.findByText(withText('Select goal(s)'));
      expect(goal).toBeVisible();
    });

    it('shows the correct placeholder with one selected item', async () => {
      const availableGoals = [];
      const selectedGoals = [{ id: 1, name: 'label', objectives: [] }];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );
      const goal = await screen.findByText(withText('1 goal selected'));
      expect(goal).toBeVisible();
    });

    it('shows the correct placeholder with two selected items', async () => {
      const availableGoals = [];
      const selectedGoals = [{ id: 1, name: 'label', objectives: [] }, { id: 2, name: 'label', objectives: [] }];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );
      const goal = await screen.findByText(withText('2 goals selected'));
      expect(goal).toBeVisible();
    });
  });
});
