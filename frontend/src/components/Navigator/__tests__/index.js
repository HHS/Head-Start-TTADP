import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';

import Navigator from '../index';

const pages = [
  {
    label: 'first page',
    renderForm: (hookForm) => (
      <input
        type="radio"
        data-testid="first"
        ref={hookForm.register}
        name="first"
      />
    ),
  },
  {
    label: 'second page',
    renderForm: (hookForm) => (
      <input
        type="radio"
        data-testid="second"
        ref={hookForm.register}
        name="second"
      />
    ),
  },
];

describe('Navigator', () => {
  const renderNavigator = (onSubmit = () => {}) => {
    render(
      <Navigator
        defaultValues={{ first: '', second: '' }}
        pages={pages}
        onFormSubmit={onSubmit}
      />,
    );
  };

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const second = await screen.findByText('second page');
    userEvent.click(second);
    const first = screen.getByText('first page');
    await waitFor(() => expect(within(first.nextSibling).getByText('In progress')).toBeVisible());
  });

  it('submits data when "continuing" from the last page', async () => {
    const onSubmit = jest.fn();
    renderNavigator(onSubmit);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('second')));
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('changes navigator state to complete when "continuing"', async () => {
    renderNavigator();
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByTestId('second');
    const navItem = await screen.findByText('first page');
    await waitFor(() => expect(within(navItem.nextSibling).getByText('Complete')).toBeVisible());
  });
});
