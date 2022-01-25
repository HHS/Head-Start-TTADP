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

      const select = await screen.findByPlaceholderText('Select goal(s) or type here to create a new goal');
      await selectEvent.select(select, ['first', 'second']);

      const first = await screen.findByRole('button', { name: 'add objective to goal 1' });
      const second = await screen.findByRole('button', { name: 'add objective to goal 2' });
      expect(first).toBeVisible();
      expect(second).toBeVisible();
    });
  });

  describe('new goals', () => {
    it('shows a created goal', async () => {
      const availableGoals = [{ id: 1, name: 'first' }, { id: 2, name: 'second' }];
      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={[]}
        />,
      );

      const select = await screen.findByPlaceholderText('Select goal(s) or type here to create a new goal');
      userEvent.type(select, 'Unfettered');
      const newGoal = await screen.findByText('Create "Unfettered"');
      fireEvent.click(newGoal);
      expect(screen.getByText(/unfettered/i)).toBeInTheDocument();
    });

    it('allows deselection', async () => {
      const availableGoals = [{ id: 1, name: 'first' }, { id: 2, name: 'second' }];
      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={[]}
        />,
      );

      const select = await screen.findByPlaceholderText('Select goal(s) or type here to create a new goal');
      userEvent.type(select, 'Unfettered');

      const newGoal = await screen.findByText('Create "Unfettered"');
      fireEvent.click(newGoal);
      let unfetteredlabel = await screen.findByText(/unfettered/i);
      expect(unfetteredlabel).toBeInTheDocument();

      selectEvent.openMenu(select);
      // Ignore the "Goal: Unfettered" element that isn't in the multi-select menu
      const selected = await screen.findByText(/unfettered/i, { ignore: 'p' });
      userEvent.click(selected);

      unfetteredlabel = screen.queryByText(/unfettered/i);
      expect(unfetteredlabel).not.toBeInTheDocument();
    });

    it('can be unselected', async () => {
      const availableGoals = [{ id: 1, name: 'first' }, { id: 2, name: 'second' }];
      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={[]}
        />,
      );

      const select = await screen.findByText('Select goal(s) or type here to create a new goal');
      userEvent.type(select, 'Unfettered');
      const newGoal = await screen.findByText('Create "Unfettered"');
      fireEvent.click(newGoal);
      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });

      await waitFor(() => expect(menuButton).toBeVisible());
      fireEvent.click(menuButton);

      const removeButton = await screen.findByRole('button', { name: 'Remove' });
      userEvent.click(removeButton);
      expect(await screen.findByPlaceholderText('Select goal(s) or type here to create a new goal')).toBeVisible();
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

      expect(await screen.findByPlaceholderText('1 goal selected')).toBeVisible();
      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });

      await waitFor(() => expect(menuButton).toBeVisible());
      fireEvent.click(menuButton);

      const removeButton = await screen.findByRole('button', { name: 'Remove' });
      userEvent.click(removeButton);
      expect(await screen.findByPlaceholderText('Select goal(s) or type here to create a new goal')).toBeVisible();
    });

    it('can be updated, if new', async () => {
      const availableGoals = [];
      const selectedGoals = [
        {
          id: 1, name: 'goal to edit', new: true, objectives: [],
        },
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

    it('cant be updated, if new name is blank', async () => {
      const availableGoals = [];
      const selectedGoals = [
        {
          id: 1, name: 'goal to edit', new: true, objectives: [],
        },
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

      fireEvent.change(goalNameInput, { target: { value: '' } });

      const updateButton = await screen.findByRole('button', { name: 'Update Goal' });
      fireEvent.click(updateButton);

      // Old goal name should exist, new blank goal name should not
      expect(screen.queryByText('goal to edit')).toBeVisible();
      expect(screen.queryByText('another goal')).toBeVisible();
    });

    it('objective can be updated', async () => {
      const availableGoals = [];
      const selectedGoals = [
        {
          id: 1,
          name: 'goal to edit',
          new: true,
          objectives: [{
            id: 1,
            title: 'orig objective 1',
            ttaProvided: 'objective 1 desc',
            status: 'In Progress',
          }],
        },
      ];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );

      const optionsObjBtn = screen.getByRole('button', { name: /edit or delete objective 1 on goal 1/i });
      fireEvent.click(optionsObjBtn);

      const editObjBtn = await screen.findByRole('button', { name: 'Edit' });
      fireEvent.click(editObjBtn);

      const objectiveTitleTxtBx = screen.getByDisplayValue(/objective 1/i);
      fireEvent.change(objectiveTitleTxtBx, { target: { value: 'updated objective 1' } });

      const saveObjectiveBtn = screen.getByRole('button', { name: /save objective 1 on goal 1/i });
      userEvent.click(saveObjectiveBtn);

      expect(screen.queryByText('orig objective 1')).not.toBeInTheDocument();
      expect(screen.queryByText('updated objective 1')).toBeVisible();
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
      const goal = await screen.findByPlaceholderText('Select goal(s) or type here to create a new goal');
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
      const goal = await screen.findByPlaceholderText('1 goal selected');
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
      const goal = await screen.findByPlaceholderText('2 goals selected');
      expect(goal).toBeVisible();
    });
  });
});
