import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';

import Navigator from '../index';
import { NOT_STARTED } from '../constants';
import { REPORT_STATUSES } from '../../../Constants';

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
    render: (hookForm, allComplete, formData, onSubmit) => (
      <div>
        <button type="button" data-testid="review" onClick={onSubmit}>Continue</button>
      </div>
    ),
  },
];

const initialData = { pageState: { 1: NOT_STARTED, 2: NOT_STARTED } };

describe('Navigator', () => {
  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (currentPage = 'first', onSubmit = () => {}, onSave = () => {}) => {
    render(
      <Navigator
        reportId={1}
        submitted={false}
        formData={initialData}
        updateFormData={() => {}}
        onReview={() => {}}
        approvingManager={false}
        defaultValues={{ first: '', second: '' }}
        pages={pages}
        currentPage={currentPage}
        onFormSubmit={onSubmit}
        onSave={onSave}
      />,
    );
  };

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const first = await screen.findByRole('button', { name: 'first page' });
    await waitFor(() => expect(within(first).getByText('In Progress')).toBeVisible());
  });

  it('onContinue calls onSave with correct page position', async () => {
    const onSave = jest.fn();
    renderNavigator('second', () => {}, onSave);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ pageState: { ...initialData.pageState, 2: 'Complete' }, second: '' }, 3));
  });

  it('submits data when "continuing" from the review page', async () => {
    const onSubmit = jest.fn();
    renderNavigator('review', onSubmit);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('calls onSave on navigation', async () => {
    const onSave = jest.fn();
    renderNavigator('second', () => {}, onSave);
    userEvent.click(screen.getByRole('button', { name: 'first page' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...initialData, second: '' }, 1));
  });
});
