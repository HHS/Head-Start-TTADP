/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import userEvent from '@testing-library/user-event';

import Goal from '../Goal';
import { DECIMAL_BASE } from '../../../../../Constants';

let id = 0;

const RenderGoal = ({
  name,
  onRemove = () => {},
  onUpdateObjectives = () => {},
  objectives = [],
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
        objectives={objectives}
        createObjective={createObjective}
        onRemoveGoal={onRemove}
        onUpdateObjectives={onUpdateObjectives}
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
    const onUpdate = jest.fn();
    render(<RenderGoal name="test goal" onUpdateObjectives={onUpdate} />);
    const button = await screen.findByText('Add New Objective');
    userEvent.click(button);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('clicking remove calls "onRemove"', async () => {
    const onRemove = jest.fn();
    render(<RenderGoal name="test goal" onRemove={onRemove} />);
    const button = await screen.findByRole('button', { name: 'remove goal 1' });
    userEvent.click(button);
    await waitFor(() => expect(onRemove).toHaveBeenCalled());
  });

  describe('with objectives', () => {
    it('can be removed', async () => {
      const onUpdate = jest.fn();
      const objectives = [
        {
          id: 'a', title: 'first', ttaProvided: '', status: 'Not Started',
        },
        {
          id: 'b', title: '', ttaProvided: '', status: 'Not Started',
        },
      ];
      render(<RenderGoal onUpdateObjectives={onUpdate} name="test goal" objectives={objectives} />);

      const remove = await screen.findByRole('button', { name: 'Cancel update of objective 2 on goal 1' });
      userEvent.click(remove);
      expect(onUpdate).toHaveBeenCalledWith([{
        id: 'a', title: 'first', ttaProvided: '', status: 'Not Started',
      }]);
    });

    it('can be updated', async () => {
      const onUpdate = jest.fn();
      const objectives = [{
        id: 'a', title: '', ttaProvided: 'test', status: 'Not Started',
      }];
      render(<RenderGoal onUpdateObjectives={onUpdate} name="test goal" objectives={objectives} />);

      const title = await screen.findByRole('textbox', { name: 'title for objective 1 on goal 1' });
      userEvent.type(title, 'title');
      const button = await screen.findByRole('button', { name: 'Save objective 1 on goal 1' });
      userEvent.click(button);
      expect(onUpdate).toHaveBeenCalledWith([{
        id: 'a', title: 'title', ttaProvided: 'test', status: 'Not Started',
      }]);
    });
  });
});
