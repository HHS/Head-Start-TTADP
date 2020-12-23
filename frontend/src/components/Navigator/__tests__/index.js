import '@testing-library/jest-dom';
import React from 'react';
import { MemoryRouter } from 'react-router';
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
    path: 'review',
    label: 'review page',
    review: true,
    render: (allComplete, onSubmit) => (
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
      <MemoryRouter>
        <Navigator
          submitted={false}
          initialPageState={{ 1: NOT_STARTED, 2: NOT_STARTED }}
          defaultValues={{ first: '', second: '' }}
          pages={pages}
          updatePage={updatePage}
          currentPage={currentPage}
          onFormSubmit={onSubmit}
        />
      </MemoryRouter>,
    );
  };

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const first = await screen.findByRole('link', { name: 'first page' });
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

  it('changes navigator state to complete when "continuing"', async () => {
    renderNavigator();
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const first = await screen.findByRole('link', { name: 'first page' });
    await waitFor(() => expect(within(first).getByText('Complete')).toBeVisible());
  });
});
