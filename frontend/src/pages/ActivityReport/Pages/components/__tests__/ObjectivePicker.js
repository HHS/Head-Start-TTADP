/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';

import ObjectivePicker from '../ObjectivePicker';
import { withText } from '../../../../../testHelpers';

// eslint-disable-next-line react/prop-types
const RenderObjective = ({ objectivesWithoutGoals }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: {
      objectivesWithoutGoals,
    },
  });

  return (
    <FormProvider {...hookForm}>
      <ObjectivePicker />
    </FormProvider>
  );
};

const objectives = [
  {
    id: 1, title: 'title', ttaProvided: 'tta', status: 'In Progress',
  },
  {
    id: 2, title: 'title two', ttaProvided: 'tta two', status: 'In Progress',
  },
];

describe('ObjectivePicker', () => {
  it('renders created objectives', async () => {
    render(<RenderObjective objectivesWithoutGoals={objectives} />);

    const title = await screen.findByText('title');
    expect(title).toBeVisible();
  });

  it('can remove objectives', async () => {
    render(<RenderObjective objectivesWithoutGoals={objectives} />);

    const button = await screen.findByRole('button', { name: 'Edit or delete objective 1' });
    userEvent.click(button);
    const destroy = await screen.findByRole('button', { name: 'Delete' });
    userEvent.click(destroy);
    const title = await screen.findByText('title two');
    expect(title).toBeVisible();
    const buttons = await screen.findAllByText(withText('TTA Provided: '));
    expect(buttons.length).toBe(1);
  });

  it('can update objectives', async () => {
    render(<RenderObjective objectivesWithoutGoals={objectives} />);

    const button = await screen.findByRole('button', { name: 'Edit or delete objective 1' });
    userEvent.click(button);
    const edit = await screen.findByRole('button', { name: 'Edit' });
    userEvent.click(edit);
    const titleEditbox = await screen.findByRole('textbox', { name: 'title for objective 1' });
    userEvent.type(titleEditbox, 'test');
    const save = await screen.findByRole('button', { name: 'Save objective 1' });
    userEvent.click(save);
    const title = await screen.findByText(withText('Objective: titletest'));
    expect(title).toBeVisible();
  });

  it('can add additional objectives', async () => {
    render(<RenderObjective objectivesWithoutGoals={objectives} />);
    const button = await screen.findByRole('button', { name: 'add objective' });
    userEvent.click(button);
    const title = await screen.findByRole('textbox', { name: 'title for objective 3' });
    expect(title).toBeVisible();
  });
});
