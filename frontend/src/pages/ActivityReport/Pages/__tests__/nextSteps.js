/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';

import nextSteps from '../nextSteps';

const SPECIALIST_INPUT = 'specialistNextSteps-input';
const SPECIALIST_BUTTON = 'specialistNextSteps-button';

const RECIPIENT_INPUT = 'recipientNextSteps-input';
const RECIPIENT_BUTTON = 'recipientNextSteps-button';

const RenderNextSteps = ({
  // eslint-disable-next-line react/prop-types
  specialistNextSteps, recipientNextSteps, activityRecipientType,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { specialistNextSteps, recipientNextSteps },
  });

  return (
    <FormProvider {...hookForm}>
      {nextSteps.render(null, { activityRecipientType })}
    </FormProvider>
  );
};

const renderNextSteps = (specialist = [], recipient = [], activityRecipientType = 'recipient') => {
  render(
    <RenderNextSteps
      specialistNextSteps={specialist}
      recipientNextSteps={recipient}
      activityRecipientType={activityRecipientType}
    />,
  );
};

describe('next steps', () => {
  it('displays correct labels for other entity', async () => {
    // When a user is on the next steps page
    renderNextSteps([{ note: '', id: 1 }], [{ note: '', id: 2 }], 'other-entity');
    expect(await screen.findByText(/other entities next steps/i)).toBeVisible();
  });

  it('displays both specialists and recipient steps', async () => {
    // When a user is on the next steps page
    renderNextSteps([{ note: '', id: 1 }], [{ note: '', id: 2 }]);

    // Then they can see prompts for both Specialist and Recipients
    expect(await screen.findByText(/specialist's next steps/i)).toBeVisible();
    expect(await screen.findByTestId(SPECIALIST_INPUT)).toBeVisible();
    expect(screen.queryByText(SPECIALIST_BUTTON)).toBeNull();

    expect((await screen.findAllByTestId('date-picker-external-input')).length).toBe(2);
    expect(await screen.findByText(/recipient's next steps/i)).toBeVisible();
    expect(await screen.findByTestId(RECIPIENT_INPUT)).toBeVisible();
    expect(screen.queryByText(RECIPIENT_BUTTON)).toBeNull();
  });

  it('displays user can add new steps', async () => {
    // When a user is on the next steps page
    renderNextSteps(
      [{ note: 'First Specialist Step', completeDate: '06/02/2022', id: 1 }],
      [{ note: 'First Recipient Step', completeDate: '06/03/2022', id: 2 }],
    );

    // Add new steps.
    const newStepButtons = screen.queryAllByRole('button', { name: /add next step/i });
    expect(newStepButtons.length).toBe(2);
    userEvent.click(newStepButtons[0]);
    userEvent.click(newStepButtons[1]);

    // Verify new steps are created.
    const newSteps = screen.queryAllByRole('textbox', { name: /step 2 \*/i });
    expect(newSteps.length).toBe(2);
  });

  it('can add and delete an entry for specialist', async () => {
    // Given a user wants the add a new entry
    renderNextSteps(
      [
        { note: 'pikachu', completeDate: '06/02/2022', id: 1 },
        { note: 'bulbasaur', completeDate: '06/03/2022', id: 30 },
      ],
    );

    // Add new Specialist Step.
    const newEntryButtons = screen.queryAllByRole('button', { name: /add next step/i });
    expect(newEntryButtons.length).toBe(2);
    userEvent.click(newEntryButtons[0]);

    // When the user presses cancel to change their mind
    const cancelBtn = await screen.findByRole('button', { name: /remove specialist next steps 3/i });
    userEvent.click(cancelBtn);

    // Then we see there is no more input box
    const input = screen.queryByText(/next step 3/i);
    expect(input).toBeNull();
  });

  it('can add and delete an entry for recipient', async () => {
    // Given a user wants the add a new entry
    renderNextSteps(
      [],
      [
        { note: 'pikachu', completeDate: '06/02/2022', id: 1 },
        { note: 'bulbasaur', completeDate: '06/03/2022', id: 30 },
      ],
    );

    // Add new Recipient Step.
    const newEntryButtons = screen.queryAllByRole('button', { name: /add next step/i });
    expect(newEntryButtons.length).toBe(2);
    userEvent.click(newEntryButtons[1]);

    // When the user presses cancel to change their mind
    const cancelBtn = await screen.findByRole('button', { name: /remove recipient next steps 3/i });
    userEvent.click(cancelBtn);

    // Then we see there is no more input box
    const input = screen.queryByText(/next step 3/i);
    expect(input).toBeNull();
  });

  it('can change step for specialist', async () => {
    renderNextSteps(
      [{ note: 'Step 1', id: 1, completeDate: '06/02/2022' }],
    );
    const stepText = await screen.findByRole('textbox', { name: /step 1 \*/i });
    fireEvent.change(stepText, { target: { value: 'This is my changed step text.' } });
    await waitFor(() => expect(stepText).toHaveValue('This is my changed step text.'));
  });

  it('can change date for specialist', async () => {
    renderNextSteps(
      [{ note: 'Step 1', id: 1, completeDate: '06/02/2022' }],
    );

    // Change date.
    const dateInput = await screen.findByTestId('date-picker-external-input');
    userEvent.clear(dateInput);
    userEvent.type(dateInput, '06/03/2022');

    // Change focus.
    const stepText = await screen.findByRole('textbox', { name: /step 1 \*/i });
    userEvent.click(stepText);

    // Assert date change.
    await waitFor(() => expect(dateInput).toHaveValue('06/03/2022'));
  });

  it('can change step for recipient', async () => {
    renderNextSteps(
      [], [{ note: 'Step 1', id: 2, completeDate: '06/02/2022' }],
    );
    const stepText = await screen.findByRole('textbox', { name: /step 1 \*/i });
    fireEvent.change(stepText, { target: { value: 'This is my changed step text.' } });
    await waitFor(() => expect(stepText).toHaveValue('This is my changed step text.'));
  });

  it('can change date for recipient', async () => {
    renderNextSteps(
      [], [{ note: 'Step 2', id: 2, completeDate: '06/03/2022' }],
    );

    // Change date.
    const dateInput = await screen.findByTestId('date-picker-external-input');
    userEvent.clear(dateInput);
    userEvent.type(dateInput, '06/04/2022');

    // Change focus.
    const stepText = await screen.findByRole('textbox', { name: /step 1 \*/i });
    userEvent.click(stepText);

    // Assert date change.
    await waitFor(() => expect(dateInput).toHaveValue('06/04/2022'));
  });
});
