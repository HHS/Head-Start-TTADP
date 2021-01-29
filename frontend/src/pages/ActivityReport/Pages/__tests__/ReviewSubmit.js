import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';

import ReviewSubmit from '../ReviewSubmit';

const approvers = [
  { id: 1, name: 'user 1' },
  { id: 2, name: 'user 2' },
];

const RenderReview = ({
  // eslint-disable-next-line react/prop-types
  allComplete, submitted, initialData, onSubmit,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { ...initialData, approvingManagerId: null },
  });
  return (
    <ReviewSubmit
      allComplete={allComplete}
      submitted={submitted}
      onSubmit={onSubmit}
      reviewItems={[]}
      approvers={approvers}
      hookForm={hookForm}
    />
  );
};

const renderReview = (allComplete, submitted, initialData = {}, onSubmit = () => {}) => {
  render(
    <RenderReview
      allComplete={allComplete}
      submitted={submitted}
      onSubmit={onSubmit}
      initialData={initialData}
    />,
  );
};

const selectLabel = 'Approving manager';

describe('ReviewSubmit', () => {
  describe('when the form is not complete', () => {
    it('an error alert is shown', async () => {
      renderReview(false, false);
      const alert = await screen.findByTestId('alert');
      expect(alert).toHaveClass('usa-alert--error');
      await waitFor(() => expect(screen.getByLabelText(selectLabel)).toBeEnabled());
    });

    it('the submit button is disabled', async () => {
      renderReview(false, false);
      const button = await screen.findByRole('button');
      expect(button).toBeDisabled();
      await waitFor(() => expect(screen.getByLabelText(selectLabel)).toBeEnabled());
    });
  });

  describe('when the form is complete', () => {
    it('no modal is shown', async () => {
      renderReview(true, false);
      const alert = screen.queryByTestId('alert');
      expect(alert).toBeNull();
      await waitFor(() => expect(screen.getByLabelText(selectLabel)).toBeEnabled());
    });

    it('the submit button is disabled until one approver is selected', async () => {
      renderReview(true, false);
      const button = await screen.findByRole('button');
      expect(button).toBeDisabled();
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['1']);
      expect(await screen.findByRole('button')).toBeEnabled();
    });
  });

  it('a success modal is shown once submitted', async () => {
    renderReview(true, true);
    const alert = await screen.findByTestId('alert');
    expect(alert).toHaveClass('usa-alert--success');
  });

  it('initializes the form with "initialData"', async () => {
    renderReview(true, true, { additionalNotes: 'test' });
    const textBox = await screen.findByLabelText('Creator notes');
    await waitFor(() => expect(textBox).toHaveValue('test'));
  });
});
