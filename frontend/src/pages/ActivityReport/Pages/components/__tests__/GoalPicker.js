/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

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
      <div data-testid="valid">{ hookForm.formState.isValid ? 'true' : 'false' }</div>
    </FormProvider>
  );
};

describe('GoalPicker', () => {
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
      const goal = await screen.findByLabelText('remove goal');
      userEvent.click(goal);
      expect(await screen.findByText(withText('Select goal(s)'))).toBeVisible();
    });
  });

  describe('selected goals', () => {
    it('can be removed', async () => {
      const availableGoals = [];
      const selectedGoals = [{ id: 1, name: 'label' }];

      render(
        <RenderGoal
          availableGoals={availableGoals}
          selectedGoals={selectedGoals}
        />,
      );

      expect(await screen.findByText(withText('1 goal selected'))).toBeVisible();
      const goal = await screen.findByLabelText('remove goal 1');
      userEvent.click(goal);
      expect(await screen.findByText(withText('Select goal(s)'))).toBeVisible();
    });
  });

  describe('goals field is invalid', () => {
    it('if there are no goals', async () => {
      render(
        <RenderGoal
          availableGoals={[]}
          selectedGoals={[]}
        />,
      );
      const valid = await screen.findByTestId('valid');
      expect(valid).toHaveTextContent('false');
    });

    it('if a goal has no objectives', async () => {
      render(
        <RenderGoal
          availableGoals={[{ id: 1, name: 'label' }]}
          selectedGoals={[{ id: 1, name: 'label' }]}
        />,
      );
      const valid = await screen.findByTestId('valid');
      expect(valid).toHaveTextContent('false');
    });

    it('if a goal has an objective being edited', async () => {
      render(
        <RenderGoal
          availableGoals={[{ id: 1, name: 'label' }]}
          selectedGoals={[{ id: 1, name: 'label', objectives: [{ edit: true }] }]}
        />,
      );
      const valid = await screen.findByTestId('valid');
      expect(valid.textContent).toEqual('false');
    });
  });

  describe('goals are valid', () => {
    it('if there is at least one goal and every goal has at least one objective that and no objectives are being edited', async () => {
      render(
        <RenderGoal
          availableGoals={[{ id: 1, name: 'label' }]}
          selectedGoals={[{ id: 1, name: 'label', objectives: [{ edit: false }] }]}
        />,
      );
      const valid = await screen.findByTestId('valid');
      expect(valid).toHaveTextContent('true');
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
      const selectedGoals = [{ id: 1, name: 'label' }];

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
      const selectedGoals = [{ id: 1, name: 'label' }, { id: 2, name: 'label' }];

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
