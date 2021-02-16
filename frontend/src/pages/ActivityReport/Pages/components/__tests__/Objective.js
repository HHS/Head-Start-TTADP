import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import Objective from '../Objective';

// eslint-disable-next-line react/prop-types
const RenderObjective = ({ objective, onRemove = () => {} }) => {
  const hookForm = useForm({
    defaultValues: {
      'goals[0].objectives[0]': objective,
    },
  });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Objective
        id={1}
        remove={onRemove}
        goalIndex={0}
        objectiveIndex={0}
      />
    </FormProvider>
  );
};

describe('Objective', () => {
  describe('in edit mode', () => {
    it('save does not work if "objective" and "TTA Provided" are empty', async () => {
      render(<RenderObjective objective={{}} />);
      const save = await screen.findByText('Save Objective');
      expect(save).toBeVisible();

      userEvent.click(save);
      expect(await screen.findByText('Save Objective')).toBeVisible();
    });

    it('save works when "objective" and "TTA Provided" have values', async () => {
      const objective = {
        title: '', ttaProvided: 'test', status: 'Not Started',
      };
      render(<RenderObjective objective={objective} />);
      const save = await screen.findByText('Save Objective');
      expect(save).toBeVisible();

      const title = await screen.findByLabelText('Objective');
      userEvent.type(title, 'test');

      userEvent.click(save);
      expect(await screen.findByRole('button', { name: 'remove objective 1 on goal 1' })).toBeVisible();
    });

    it('calls onRemove when the remove button is clicked', async () => {
      const onRemove = jest.fn();
      render(<RenderObjective objective={{}} onRemove={onRemove} />);
      await screen.findByText('Save Objective');
      const remove = await screen.findByRole('button', { name: 'remove objective 1 on goal 1' });
      userEvent.click(remove);
      expect(onRemove).toHaveBeenCalled();
    });
  });

  describe('in display mode', () => {
    it('displays the objective', async () => {
      const objective = {
        title: 'title', ttaProvided: 'test', status: 'Not Started', edit: false,
      };
      render(<RenderObjective objective={objective} />);
      const title = await screen.findByText('title');
      const tta = await screen.findByText('test');
      const status = await screen.findByText('Not Started');

      expect(title).toBeVisible();
      expect(tta).toBeVisible();
      expect(status).toBeVisible();
    });

    it('can be removed via the context menu', async () => {
      const onRemove = jest.fn();
      const objective = {
        title: 'title', ttaProvided: 'test', status: 'Not Started', edit: false,
      };
      render(<RenderObjective objective={objective} onRemove={onRemove} />);
      const menu = await screen.findByRole('button', { name: 'Edit or delete objective 1 on goal 1' });
      userEvent.click(menu);

      const deleteButton = await screen.findByText('Delete');
      userEvent.click(deleteButton);
      expect(onRemove).toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByText('Delete')).toBeNull());
    });

    it('can be switched to edit mode via the context menu', async () => {
      const objective = {
        title: 'title', ttaProvided: 'test', status: 'Not Started', edit: false,
      };
      render(<RenderObjective objective={objective} />);
      const menu = await screen.findByRole('button', { name: 'Edit or delete objective 1 on goal 1' });
      userEvent.click(menu);

      const edit = await screen.findByText('Edit');
      userEvent.click(edit);
      const save = await screen.findByText('Save Objective');
      expect(save).toBeVisible();
    });
  });
});
