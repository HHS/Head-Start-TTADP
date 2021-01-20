import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';

import Navigator from '../index';
import { NOT_STARTED } from '../constants';

const pages = [
  {
    position: 1,
    path: 'first',
    label: 'first page',
    review: false,
    render: (hookForm) => (
      <input
        type="radio"
        data-testid="first"
        ref={hookForm.register}
        name="first"
      />
    ),
  },
  {
    position: 2,
    path: 'second',
    label: 'second page',
    review: false,
    render: (hookForm) => (
      <input
        type="radio"
        data-testid="second"
        ref={hookForm.register}
        name="second"
      />
    ),
  },
  {
    position: 3,
    label: 'review page',
    path: 'review',
    review: true,
    render: (hookForm, allComplete, formData, submitted, onSubmit) => (
      <div>
        <button type="button" data-testid="review" onClick={onSubmit}>Continue</button>
      </div>
    ),
  },
];

describe('Navigator', () => {
  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (currentPage = 'first', onSubmit = () => {}, updatePage = () => {}) => {
    render(
      <Navigator
        submitted={false}
        initialData={{ pageState: { 1: NOT_STARTED, 2: NOT_STARTED } }}
        defaultValues={{ first: '', second: '' }}
        pages={pages}
        updatePage={updatePage}
        currentPage={currentPage}
        onFormSubmit={onSubmit}
        onSave={() => {}}
      />,
    );
  };

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const first = await screen.findByRole('button', { name: 'first page' });
    await waitFor(() => expect(within(first).getByText('In progress')).toBeVisible());
  });

  it('onContinue calls update page with correct page position', async () => {
    const updatePage = jest.fn();
    renderNavigator('second', () => {}, updatePage);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(3));
  });

  it('submits data when "continuing" from the review page', async () => {
    const onSubmit = jest.fn();
    renderNavigator('review', onSubmit);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('calls updatePage on navigation', async () => {
    const updatePage = jest.fn();
    renderNavigator('second', () => {}, updatePage);
    userEvent.click(screen.getByRole('button', { name: 'first page' }));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1));
  });
});
