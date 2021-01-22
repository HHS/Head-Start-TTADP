import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import fetchMock from 'fetch-mock';
import join from 'url-join';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';

import ReviewSubmit from '../ReviewSubmit';

const Review = ({
  // eslint-disable-next-line react/prop-types
  allComplete, submitted, formData, onSubmit,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: formData,
  });

  return (
    <ReviewSubmit
      allComplete={allComplete}
      submitted={submitted}
      formData={formData}
      onSubmit={onSubmit}
      reviewItems={[]}
      hookForm={hookForm}
    />
  );
};

const renderReview = (
  allComplete,
  submitted,
  formData = { approvingManagerId: null },
  onSubmit = () => {},
) => {
  render(
    <Review
      allComplete={allComplete}
      submitted={submitted}
      formData={formData}
      onSubmit={onSubmit}
    />,
  );
};

const approvers = [
  { id: 1, name: 'user 1' },
  { id: 2, name: 'user 2' },
];

const selectLabel = 'Approving manager';

describe('ReviewSubmit', () => {
  afterEach(() => fetchMock.restore());
  beforeEach(() => {
    const approversUrl = join('/', 'api', 'activity-reports', 'approvers');
    fetchMock.get(approversUrl, approvers);
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
