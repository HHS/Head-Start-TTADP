/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import userEvent from '@testing-library/user-event';

import Goal from '../Goal';
import { DECIMAL_BASE } from '../../../../../Constants';

let id = 0;

const RenderGoal = ({
  name,
  isEditable = false,
  onRemove = () => {},
  onUpdate = () => {},
  onUpdateObjectives = () => {},
  objectives = [],
  number = null,
  createObjective = () => {
    id += 1;
    return { key: id.toString(DECIMAL_BASE), title: '', ttaProvided: '' };
  },
}) => {
  const hookForm = useForm();
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Goal
        isEditable={isEditable}
        objectives={objectives}
        createObjective={createObjective}
        onRemoveGoal={onRemove}
        onUpdateGoal={onUpdate}
        onUpdateObjectives={onUpdateObjectives}
        goalIndex={0}
        name={name}
        number={number}
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

  it('shows goal number', async () => {
    render(<RenderGoal name="test goal" number="G-123" />);
    const goal = await screen.findByText('(G-123)', { exact: false });
    expect(goal).toBeVisible();
  });

  it('can add additional objectives to the goal', async () => {
    const onUpdate = jest.fn();
    render(<RenderGoal name="test goal" onUpdateObjectives={onUpdate} />);
    const button = await screen.findByText('Add New Objective');
    userEvent.click(button);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('clicking remove calls "onRemove"', async () => {
    const onRemove = jest.fn();
    render(<RenderGoal name="test goal" onRemove={onRemove} />);
    const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });

    await waitFor(() => expect(menuButton).toBeVisible());
    fireEvent.click(menuButton);

    const removeButton = await screen.findByRole('button', { name: 'Remove' });
    await waitFor(() => expect(removeButton).toBeVisible());

    userEvent.click(removeButton);
    await waitFor(() => expect(onRemove).toHaveBeenCalled());
  });

  describe('InplaceGoalEditor', () => {
    it('can edit a goal name', async () => {
      const onUpdateMock = jest.fn();
      render(<RenderGoal name="test goal" isEditable onUpdate={onUpdateMock} />);

      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });
      fireEvent.click(menuButton);

      const editButton = await screen.findByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      const goalNameInput = await screen.findByLabelText('Edit goal');
      await waitFor(() => expect(goalNameInput).toBeVisible());

      fireEvent.change(goalNameInput, { target: { value: 'test goal edited' } });
      await waitFor(() => expect(goalNameInput.value).toBe('test goal edited'));

      const updateButton = await screen.findByRole('button', { name: 'Update Goal' });
      fireEvent.click(updateButton);
      await waitFor(() => expect(onUpdateMock).toHaveBeenCalledWith('test goal edited'));
    });

    it('can cancel editing a goal name', async () => {
      const onUpdateMock = jest.fn();
      render(<RenderGoal name="test goal" isEditable onUpdate={onUpdateMock} />);

      const menuButton = await screen.findByRole('button', { name: /actions for goal 1/i });
      fireEvent.click(menuButton);

      const editButton = await screen.findByRole('button', { name: 'Edit' });
      fireEvent.click(editButton);

      expect(screen.queryByLabelText('Edit goal')).toBeVisible();

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await waitFor(() => expect(cancelButton).toBeVisible());

      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText('Edit goal')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Update Goal' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });

  describe('with objectives', () => {
    it('cant be removed', async () => {
      const onUpdate = jest.fn();
      const objectives = [
        {
          id: 'a', title: 'first', ttaProvided: '<p>This is the TTA Desc</p>', status: 'Not Started',
        },
      ];
      render(<RenderGoal onUpdateObjectives={onUpdate} name="test goal" objectives={objectives} />);

      const optionsObjBtn = screen.getByRole('button', { name: /edit or delete objective 1 on goal 1/i });
      fireEvent.click(optionsObjBtn);

      const deleteObjBtn = await screen.findByRole('button', { name: 'Delete' });
      fireEvent.click(deleteObjBtn);

      const objName = screen.getByText(/first/i);
      expect(objName).toBeVisible();

      const objDesc = screen.getByText(/this is the tta desc/i);
      expect(objDesc).toBeVisible();
    });

    it('can be updated', async () => {
      const onUpdate = jest.fn();
      const objectives = [{
        id: 'a', title: '', ttaProvided: 'test', status: 'Not Started',
      }];
      render(<RenderGoal onUpdateObjectives={onUpdate} name="test goal" objectives={objectives} />);

      const title = await screen.findByRole('textbox', { name: 'title for objective 1 on goal 1' });
      userEvent.type(title, 't');

      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
