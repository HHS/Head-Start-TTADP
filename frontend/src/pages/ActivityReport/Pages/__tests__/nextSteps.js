/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import nextSteps, { isPageComplete } from '../nextSteps';

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
    defaultValues: { specialistNextSteps, recipientNextSteps, activityRecipientType },
  });

  return (
    <FormProvider {...hookForm}>
      {nextSteps.render(
        null,
        { activityRecipientType },
        1,
        null,
        jest.fn(),
        jest.fn(),
        jest.fn(),
        false,
        '',
        jest.fn(),
        () => <></>,
      )}
    </FormProvider>
  );
};

const RenderReview = ({
  // eslint-disable-next-line react/prop-types
  specialistNextSteps, recipientNextSteps, activityRecipientType,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { specialistNextSteps, recipientNextSteps },
  });
  return (
    <FormProvider {...hookForm}>
      {nextSteps.reviewSection(activityRecipientType)}
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

const renderReviewNextSteps = (specialist = [], recipient = [], activityRecipientType = 'recipient') => {
  render(
    <RenderReview
      specialistNextSteps={specialist}
      recipientNextSteps={recipient}
      activityRecipientType={activityRecipientType}
    />,
  );
};

describe('next steps review', () => {
  it('renders recipient next steps', async () => {
    renderReviewNextSteps(
      [{ note: 'First Specialist Step', completeDate: '06/02/2022', id: 1 }],
      [{ note: 'First Recipient Step', completeDate: '06/03/2022', id: 1 }],
    );
    expect(await screen.findByText(/specialist's next steps/i)).toBeVisible();
    expect(screen.queryAllByText(/step 1/i).length).toBe(2);
    expect(await screen.findByText(/first specialist step/i)).toBeVisible();
    expect(await screen.findByText(/recipient's next steps/i)).toBeVisible();
    expect(await screen.findByText(/first recipient step/i)).toBeVisible();
    expect(screen.queryAllByText('Anticipated completion').length).toBe(2);
    expect(await screen.findByText(/06\/02\/2022/i)).toBeVisible();
    expect(await screen.findByText(/06\/03\/2022/i)).toBeVisible();
  });
});

describe('next steps', () => {
  it('renders correctly with no steps', async () => {
    renderNextSteps(undefined, undefined);
    expect(await screen.findByText(/specialist's next steps/i)).toBeVisible();
    expect(await screen.findByText(/recipient's next steps/i)).toBeVisible();
  });

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

    let newSteps = screen.queryAllByRole('textbox');
    expect(newSteps.length).toBe(4);

    // Add new steps.
    const newStepButtons = screen.queryAllByRole('button', { name: /add next step/i });
    expect(newStepButtons.length).toBe(2);
    userEvent.click(newStepButtons[0]);
    userEvent.click(newStepButtons[1]);

    // Verify new steps are created.
    newSteps = screen.queryAllByRole('textbox');
    expect(newSteps.length).toBe(8);
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

    const cancelBtn = await screen.findByRole('button', { name: /remove recipient's next steps 3/i });
    userEvent.click(cancelBtn);

    // Then we see there is no more input box
    const input = screen.queryByText(/next step 3/i);
    expect(input).toBeNull();
  });

  it('can change step for specialist', async () => {
    renderNextSteps(
      [{ note: 'Step 1', id: 1, completeDate: '06/02/2022' }],
    );
    const stepText = await screen.findByRole('textbox', { name: 'Step 1' });
    fireEvent.change(stepText, { target: { value: 'This is my changed step text.' } });
    await waitFor(() => expect(stepText).toHaveValue('This is my changed step text.'));
  });

  it('auto grows step height', async () => {
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      value: 300,
      writable: true,
      configurable: true,
    });
    renderNextSteps(
      [{ note: 'Step 1', id: 1, completeDate: '06/02/2022' }],
    );
    const stepText = await screen.findByRole('textbox', { name: 'Step 1' });
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
    const stepText = await screen.findByRole('textbox', { name: 'Step 1' });
    userEvent.click(stepText);

    // Assert date change.
    await waitFor(() => expect(dateInput).toHaveValue('06/03/2022'));
  });

  it('can change step for recipient', async () => {
    renderNextSteps(
      [], [{ note: 'Step 1', id: 2, completeDate: '06/02/2022' }],
    );
    const stepText = await screen.findByRole('textbox', { name: 'Step 1' });
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
    const stepText = await screen.findByRole('textbox', { name: 'Step 1' });
    userEvent.click(stepText);

    // Assert date change.
    await waitFor(() => expect(dateInput).toHaveValue('06/04/2022'));
  });
});

describe('isPageComplete for Next steps', () => {
  it('returns true if validated by hook form', async () => {
    const result = isPageComplete({}, { isValid: true });
    expect(result).toBe(true);
  });

  it('returns false if either data point is missing', async () => {
    const result = isPageComplete({ specialistNextSteps: [] }, { isValid: false });
    expect(result).toBe(false);
  });

  it('returns false if no next steps are provided', async () => {
    const result = isPageComplete({
      specialistNextSteps: [], recipientNextSteps: [],
    }, { isValid: false });
    expect(result).toBe(false);
  });

  it('returns false if no note was provided on one step', async () => {
    const result = isPageComplete({
      specialistNextSteps: [{
        note: '',
        completeDate: '09/17/2017',
      }],
      recipientNextSteps: [
        {
          note: 'A step sir',
          completeDate: '09/17/2017',
        },
      ],
    }, { isValid: false });
    expect(result).toBe(false);
  });

  it('returns false if an invalid date was provided on one step', async () => {
    const result = isPageComplete({
      specialistNextSteps: [{
        note: 'a step',
        completeDate: '09/17/2017',
      }],
      recipientNextSteps: [
        {
          note: 'A step sir',
          completeDate: 'a step a step a step',
        },
      ],
    }, { isValid: false });
    expect(result).toBe(false);
  });

  it('returns true if completeDate is a valid ISO format', () => {
    const result = isPageComplete({
      specialistNextSteps: [
        { note: 'ISO test', completeDate: '2025-05-17' },
      ],
      recipientNextSteps: [
        { note: 'ISO test 2', completeDate: '2025-05-18' },
      ],
    }, { isValid: false });
    expect(result).toBe(true);
  });

  it('returns true if completeDate is a valid dot format', () => {
    const result = isPageComplete({
      specialistNextSteps: [
        { note: 'Dot format test', completeDate: '5.17.25' },
      ],
      recipientNextSteps: [
        { note: 'Another one', completeDate: '5.18.25' },
      ],
    }, { isValid: false });
    expect(result).toBe(true);
  });
});
