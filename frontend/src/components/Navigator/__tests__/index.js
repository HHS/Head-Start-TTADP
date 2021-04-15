import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';

import { useFormContext } from 'react-hook-form/dist/index.ie11';
import Navigator from '../index';
import { NOT_STARTED } from '../constants';

// eslint-disable-next-line react/prop-types
const Input = ({ name, required }) => {
  const { register } = useFormContext();
  return (
    <input
      type="radio"
      data-testid={name}
      name={name}
      ref={register({ required })}
    />
  );
};

const pages = [
  {
    position: 1,
    path: 'first',
    label: 'first page',
    review: false,
    render: () => (
      <Input name="first" required />
    ),
  },
  {
    position: 2,
    path: 'second',
    label: 'second page',
    review: false,
    render: () => (
      <Input name="second" required />
    ),
  },
  {
    position: 3,
    path: 'third',
    label: 'third page',
    review: false,
    render: () => (
      <Input name="third" required />
    ),
  },
  {
    position: 4,
    label: 'review page',
    path: 'review',
    review: true,
    render: (formData, onFormSubmit) => (
      <div>
        <Input name="fourth" required />
        <button type="button" data-testid="review" onClick={onFormSubmit}>Continue</button>
      </div>
    ),
  },
];

const initialData = { pageState: { 1: NOT_STARTED, 2: NOT_STARTED } };

describe('Navigator', () => {
  // eslint-disable-next-line arrow-body-style
  const renderNavigator = (currentPage = 'first', onSubmit = () => {}, onSave = () => {}, updatePage = () => {}, updateForm = () => {}) => {
    render(
      <Navigator
        editable
        reportId={1}
        submitted={false}
        formData={initialData}
        updateFormData={updateForm}
        onReview={() => {}}
        approvingManager={false}
        defaultValues={{ first: '', second: '' }}
        pages={pages}
        currentPage={currentPage}
        onFormSubmit={onSubmit}
        updatePage={updatePage}
        onSave={onSave}
        updateErrorMessage={() => {}}
        onResetToDraft={() => {}}
        updateLastSaveTime={() => {}}
        showValidationErrors={false}
        updateShowValidationErrors={() => {}}
      />,
    );
  };

  it('sets dirty forms as "in progress"', async () => {
    renderNavigator();
    const firstInput = screen.getByTestId('first');
    userEvent.click(firstInput);
    const first = await screen.findByRole('button', { name: 'first page In Progress' });
    await waitFor(() => expect(within(first).getByText('In Progress')).toBeVisible());
  });

  it('onContinue calls onSave with correct page position', async () => {
    const onSave = jest.fn();
    renderNavigator('second', () => {}, onSave);
    userEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ pageState: { ...initialData.pageState, 2: 'Complete' }, second: null }));
  });

  it('submits data when "continuing" from the review page', async () => {
    const onSubmit = jest.fn();
    renderNavigator('review', onSubmit);
    userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('onBack calls onUpdatePage', async () => {
    const updatePage = jest.fn();
    renderNavigator('third', () => {}, () => {}, updatePage);
    const button = await screen.findByRole('button', { name: 'Back' });
    userEvent.click(button);
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(2));
  });

  it('calls onSave on navigation', async () => {
    const updatePage = jest.fn();
    const updateForm = jest.fn();
    renderNavigator('second', () => {}, () => {}, updatePage, updateForm);
    userEvent.click(await screen.findByRole('button', { name: 'first page Not Started' }));
    await waitFor(() => expect(updateForm).toHaveBeenCalledWith({ ...initialData, second: null }));
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith(1));
  });
});
