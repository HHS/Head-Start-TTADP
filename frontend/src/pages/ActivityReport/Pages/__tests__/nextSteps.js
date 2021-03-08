/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import nextSteps from '../nextSteps';

const SPECIALIST_NEXT_STEPS = 'Specialist Next Steps';
const SPECIALIST_INPUT = 'specialistNextSteps-input';
const SPECIALIST_BUTTON = 'specialistNextSteps-button';
const SPECIALIST_CANCEL_BUTTON = 'specialistNextSteps-cancel-button';

const GRANTEE_NEXT_STEPS = 'Grantees Next Steps';
const GRANTEE_INPUT = 'granteeNextSteps-input';
const GRANTEE_BUTTON = 'granteeNextSteps-button';
const GRANTEE_CANCEL_BUTTON = 'granteeNextSteps-cancel-button';

const RenderNextSteps = ({
  // eslint-disable-next-line react/prop-types
  specialistNextSteps, granteeNextSteps,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { specialistNextSteps, granteeNextSteps },
  });

  return (
    <FormProvider {...hookForm}>
      {nextSteps.render()}
    </FormProvider>
  );
};

const renderNextSteps = (specialist = [], grantee = []) => {
  render(
    <RenderNextSteps specialistNextSteps={specialist} granteeNextSteps={grantee} />,
  );
};

describe('next steps', () => {
  it('displays both specialists and grantee questions', async () => {
    // When a user is on the next steps page
    renderNextSteps();

    // Then they can see prompts for both Specialist and Grantees
    expect(await screen.findByText(SPECIALIST_NEXT_STEPS)).toBeVisible();
    expect(await screen.findByTestId(SPECIALIST_BUTTON)).toBeVisible();
    expect(await screen.findByTestId(SPECIALIST_INPUT)).toBeVisible();

    expect(await screen.findByText(GRANTEE_NEXT_STEPS)).toBeVisible();
    expect(await screen.findByTestId(GRANTEE_BUTTON)).toBeVisible();
    expect(await screen.findByTestId(GRANTEE_INPUT)).toBeVisible();
  });

  it('allows input for both specialists and grantees', async () => {
    renderNextSteps();

    // Given a user filling out the form
    const specialistInput = await screen.findByTestId(SPECIALIST_INPUT);
    userEvent.type(specialistInput, 'capture pikachu');

    const granteeInput = await screen.findByTestId(GRANTEE_INPUT);
    userEvent.type(granteeInput, 'help capture pikachu');

    // When they press enter
    userEvent.click(await screen.findByTestId(SPECIALIST_BUTTON));
    userEvent.click(await screen.findByTestId(GRANTEE_BUTTON));

    // Then they see the list of their items
    expect(await screen.findByText('capture pikachu')).toBeVisible();
    expect(await screen.findByText('help capture pikachu')).toBeVisible();

    // And menu's are seen
    const menus = await screen.findAllByTestId('menu-button');
    expect(menus).toHaveLength(2);
  });

  it('Can delete items', async () => {
    // Given some items already as notes
    renderNextSteps(
      [{ note: 'pikachu', id: 1 }],
      [{ note: 'bulbasaur', id: 2 }],
    );
    // When the user deletes everything
    const menus = await screen.findAllByTestId('menu-button');

    userEvent.click(menus[0]);
    let deleteBtn = await screen.findByText('Delete');
    userEvent.click(deleteBtn);

    userEvent.click(menus[1]);
    deleteBtn = await screen.findByText('Delete');
    userEvent.click(deleteBtn);

    // Then the user can see the prompts again
    expect(await screen.findByTestId(SPECIALIST_INPUT)).toBeVisible();
    expect(await screen.findByTestId(GRANTEE_INPUT)).toBeVisible();
  });

  it('can edit item', async () => {
    // Given some items already as notes
    renderNextSteps(
      [{ note: 'pikachu', id: 1 }],
    );

    // When the users edits an item
    const menu = await screen.findByTestId('menu-button');
    userEvent.click(menu);
    const editBtn = await screen.findByText('Edit');
    userEvent.click(editBtn);

    const input = await screen.findByTestId(SPECIALIST_INPUT);
    userEvent.type(input, 'shrek');
    const submitBtn = await screen.findByTestId(SPECIALIST_BUTTON);
    userEvent.click(submitBtn);

    // The he sees the item updated
    const item = await screen.findByText('shrek');
    expect(item).toBeTruthy();
  });

  it('can cancel an entry for specialist', async () => {
    // Given a user wants the add a new entry
    renderNextSteps(
      [{ note: 'pikachu', id: 1 }, { note: 'bulbasaur', id: 30 }],
    );
    const newEntry = await screen.findByText('Add New Follow Up');
    userEvent.click(newEntry);

    // When the user presses cancel to change their mind
    const cancelBtn = await screen.findByTestId(SPECIALIST_CANCEL_BUTTON);
    userEvent.click(cancelBtn);

    // Then we see there is no more input box
    const input = screen.queryByTestId(SPECIALIST_INPUT);
    expect(input).toBeNull();
  });

  it('can cancel an entry for grantee', async () => {
    // Given a user wants the add a new entry
    renderNextSteps(
      [],
      [{ note: 'pikachu', id: 1 }, { note: 'bulbasaur', id: 30 }],
    );
    const newEntry = await screen.findByText('Add New Follow Up');
    userEvent.click(newEntry);

    // When the user presses cancel to change their mind
    const cancelBtn = await screen.findByTestId(GRANTEE_CANCEL_BUTTON);
    userEvent.click(cancelBtn);

    // Then we see there is no more input box
    const input = screen.queryByTestId(GRANTEE_INPUT);
    expect(input).toBeNull();
  });
});
