/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';

import ReviewSubmit from '../index';
import { REPORT_STATUSES } from '../../../../../Constants';

const approvers = [
  { id: 1, name: 'user 1' },
  { id: 2, name: 'user 2' },
];

const RenderReview = ({
  // eslint-disable-next-line react/prop-types
  allComplete, formData, onSubmit, onReview, approvingManagerId, approvingManager,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { ...formData, approvingManagerId },
  });

  return (
    <FormProvider {...hookForm}>
      <ReviewSubmit
        allComplete={allComplete}
        onSubmit={onSubmit}
        reviewItems={[]}
        approvers={approvers}
        formData={formData}
        onReview={onReview}
        onResetToDraft={() => {}}
        approvingManager={approvingManager}
      />
    </FormProvider>
  );
};

const renderReview = (
  allComplete,
  approvingManager = false,
  status = REPORT_STATUSES.DRAFT,
  formData = { additionalNotes: '' },
  onSubmit = () => {},
  onReview = () => {},
  approvingManagerId = null,
) => {
  render(
    <RenderReview
      allComplete={allComplete}
      onSubmit={onSubmit}
      formData={{ ...formData, status, author: { name: 'user' } }}
      approvingManager={approvingManager}
      onReview={onReview}
      approvingManagerId={approvingManagerId}
    />,
  );
};

const selectLabel = 'Approving manager';

describe('ReviewSubmit', () => {
  describe('when the user is the approving manager', () => {
    it('shows the manager UI', async () => {
      renderReview(true, true, REPORT_STATUSES.SUBMITTED);
      const header = await screen.findByText('Review and approve report');
      expect(header).toBeVisible();
    });

    it('allows the manager to review the report', async () => {
      const onReview = jest.fn();
      renderReview(true, true, REPORT_STATUSES.SUBMITTED, { additionalNotes: '' }, () => {}, onReview);
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['approved']);
      const reviewButton = await screen.findByRole('button');
      userEvent.click(reviewButton);
      await waitFor(() => expect(onReview).toHaveBeenCalled());
    });

    it('the review button handles errors', async () => {
      const onReview = jest.fn();
      onReview.mockImplementation(() => {
        throw new Error();
      });

      renderReview(true, true, REPORT_STATUSES.SUBMITTED, { additionalNotes: '' }, () => {}, onReview);
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['approved']);
      const reviewButton = await screen.findByRole('button');
      userEvent.click(reviewButton);
      const error = await screen.findByText('Unable to review report');
      expect(error).toBeVisible();
    });
  });

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

    it('the submit button calls onSubmit', async () => {
      const onSubmit = jest.fn();
      renderReview(true, false, REPORT_STATUSES.DRAFT, {}, onSubmit, () => {}, 1);
      const button = await screen.findByRole('button');
      expect(button).toBeEnabled();
      userEvent.click(button);
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });

    it('the submit button handles errors', async () => {
      const onSubmit = jest.fn();
      onSubmit.mockImplementation(() => {
        throw new Error();
      });

      renderReview(true, false, REPORT_STATUSES.DRAFT, {}, onSubmit, () => {}, 1);
      const button = await screen.findByRole('button');
      expect(button).toBeEnabled();
      userEvent.click(button);
      const error = await screen.findByText('Unable to submit report');
      expect(error).toBeVisible();
    });
  });

  it('initializes the form with "initialData"', async () => {
    renderReview(true, false, REPORT_STATUSES.DRAFT, { additionalNotes: 'test' });
    const textBox = await screen.findByLabelText('Creator notes');
    await waitFor(() => expect(textBox).toHaveValue('test'));
  });
});
